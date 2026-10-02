/**
 * 실행 기록(reports/runs/<YYYYMMDD-HHMM>-<spec id>.json). scripts/run-stacks.ts 가 spec 하나를 돌릴 때마다 하나씩 쓴다.
 *
 * 내용은 Playwright JSON 리포터 출력에서 뽑는다: 테스트별 상태·시간·annotation(scenario/run_id/phase), test.step 제목·상태·시간,
 * 실패 시 오류 첫 줄과 첨부 파일 경로. stdout 전체는 넣지 않는다(파일을 작게 유지).
 *
 * class(실패 분류)
 *   - "unclassified"  기본값. 사람이 보고 나눈다
 *   - "environment"   세션 만료·SSO 이동·로그인 브라우저 연결 실패 문구가 오류에 있으면 자동
 *   - known-issues.yaml 항목에 맞으면 그 항목의 kind (product|test|environment) + known_issue 에 id
 * 통과한 실행은 class 가 "pass" 다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type {
  JSONReport,
  JSONReportSpec,
  JSONReportSuite,
  JSONReportTest,
  JSONReportTestStep,
} from '@playwright/test/reporter';
import { matchKnownIssue, type KnownIssue } from './known-issues';

export const RUNS_DIR = path.resolve(process.cwd(), 'reports', 'runs');

export type RunStatus = 'pass' | 'fail';
export type FailureClass = 'pass' | 'unclassified' | 'environment' | 'product' | 'test';

export interface RunStep {
  title: string;
  status: 'pass' | 'fail';
  seconds: number;
}

export interface RunTest {
  title: string;
  status: string;
  seconds: number;
  annotations: Record<string, string>;
  steps: RunStep[];
  /** 실패 시 오류 첫 줄 */
  error?: string;
  attachments?: string[];
}

export interface RunRecord {
  spec: string;
  started: string;
  ended: string;
  seconds: number;
  status: RunStatus;
  class: FailureClass;
  known_issue?: string;
  /** 첫 실패 테스트의 오류 첫 줄 */
  error?: string;
  attachments?: string[];
  /** 테스트 어노테이션을 합친 것 (scenario, run_id, phase) */
  annotations: Record<string, string>;
  tests: RunTest[];
  /** JSON 리포트가 없거나 못 읽었을 때 그 이유 */
  report_error?: string;
  /** 병렬 스위트(scripts/run-suite.ts)가 붙이는 실행 묶음 id. 혼자 돌린 spec 은 없다 (2026-10-02~) */
  suite_id?: string;
  /** 같은 스위트 안에서 몇 번째 시도인가 (1 = 첫 시도, 2+ = 재실행) */
  attempt?: number;
  /** 실행 시점의 git 커밋 (짧은 해시) */
  git_sha?: string;
}

/** 세션·브라우저 문제로 보는 오류 문구 (src/console/browser.ts, src/console/expect.ts 의 메시지) */
export const ENVIRONMENT_PATTERNS: readonly RegExp[] = [
  /세션이 끝났습니다/,
  /SSO 로그인 페이지로 이동/,
  /SessionExpiredError/,
  /세션 만료/,
  /PW_CDP_URL/,
  /connectOverCDP/,
  /로그인 브라우저를 다시 띄우세요/,
  // 공유 로그인 브라우저의 탭·컨텍스트가 사라진 경우(부하·강제 재기동, 2026-09-29~10-01 스위트)
  /Target page, context or browser has been closed/,
  /CDP 로 연결한 브라우저에 컨텍스트가 없습니다/,
  /브라우저 내부 페이지 탭/,
  /worker process exited unexpectedly/i,
  // 병렬 실행에서 다른 spec 이 산출물 폴더를 지운 경우(2026-09-29, 지금은 spec 별 폴더)
  /ENOENT: no such file or directory, open '[^']*playwright-artifacts/,
];

export function isEnvironmentError(text: string): boolean {
  return ENVIRONMENT_PATTERNS.some((p) => p.test(text));
}

/** ANSI 색 코드 제거 (Playwright 오류 메시지에 들어 있다) */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

export function firstLine(text: string): string {
  return (
    stripAnsi(text)
      .split(/\r?\n/)
      .find((l) => l.trim()) ?? ''
  );
}

export function classifyFailure(
  specId: string,
  errorText: string,
  issues: readonly KnownIssue[],
  today?: string,
): { class: FailureClass; known_issue?: string } {
  const known = matchKnownIssue(issues, specId, errorText, today);
  if (known) return { class: known.kind, known_issue: known.id };
  if (isEnvironmentError(errorText)) return { class: 'environment' };
  return { class: 'unclassified' };
}

function* walkSpecs(suite: JSONReportSuite): Generator<JSONReportSpec> {
  for (const sp of suite.specs) yield sp;
  for (const s of suite.suites ?? []) yield* walkSpecs(s);
}

function flattenSteps(steps: JSONReportTestStep[] | undefined): RunStep[] {
  // 최상위 test.step 만 남긴다 (그 안의 expect/locator 단계는 너무 많다). 실패는 하위 단계의 오류도 포함해 본다.
  const failed = (s: JSONReportTestStep): boolean => !!s.error || (s.steps ?? []).some(failed);
  return (steps ?? []).map((s) => ({
    title: s.title,
    status: failed(s) ? 'fail' : 'pass',
    seconds: round1(s.duration / 1000),
  }));
}

function annotationsOf(test: JSONReportTest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of test.annotations) if (a.description !== undefined) out[a.type] = a.description;
  for (const r of test.results)
    for (const a of r.annotations ?? []) if (a.description !== undefined) out[a.type] = a.description;
  return out;
}

/** Playwright JSON 리포트에서 테스트 목록을 뽑는다. 재시도가 있으면 마지막 결과를 쓴다. */
export function testsFromReport(report: JSONReport): RunTest[] {
  const tests: RunTest[] = [];
  for (const suite of report.suites) {
    for (const spec of walkSpecs(suite)) {
      for (const t of spec.tests) {
        const last = t.results[t.results.length - 1];
        const run: RunTest = {
          title: spec.title,
          status: last?.status ?? t.status,
          seconds: round1((last?.duration ?? 0) / 1000),
          annotations: annotationsOf(t),
          steps: flattenSteps(last?.steps),
        };
        const errText = [...(last?.errors ?? []).map((e) => e.message), last?.error?.message ?? '']
          .filter(Boolean)
          .join('\n');
        if (errText) run.error = firstLine(errText);
        const paths = (last?.attachments ?? []).map((a) => a.path).filter((p): p is string => !!p);
        if (paths.length && run.status !== 'passed') run.attachments = paths.map((p) => toRel(p));
        tests.push(run);
      }
    }
  }
  return tests;
}

/** 리포트의 모든 오류 텍스트(첫 줄이 아닌 전체, ANSI 제거). 알려진 이슈 정규식은 여기에 맞춘다. */
export function fullErrorText(report: JSONReport): string {
  const parts: string[] = [];
  for (const suite of report.suites)
    for (const spec of walkSpecs(suite))
      for (const t of spec.tests)
        for (const r of t.results) {
          for (const e of r.errors) parts.push(e.message);
          if (r.error?.message) parts.push(r.error.message);
        }
  for (const e of report.errors ?? []) if (e.message) parts.push(e.message);
  return stripAnsi(parts.join('\n'));
}

export interface BuildRunRecordInput {
  spec: string;
  started: Date;
  ended: Date;
  /** 러너 프로세스 종료 코드 기준 */
  ok: boolean;
  report: JSONReport | null;
  reportError?: string;
  issues: readonly KnownIssue[];
  today?: string;
  suiteId?: string;
  attempt?: number;
  gitSha?: string;
}

export function buildRunRecord(input: BuildRunRecordInput): RunRecord {
  const tests = input.report ? testsFromReport(input.report) : [];
  const failedTests = tests.filter((t) => t.status !== 'passed' && t.status !== 'skipped');
  const status: RunStatus = input.ok && failedTests.length === 0 ? 'pass' : 'fail';
  const annotations: Record<string, string> = {};
  for (const t of tests)
    for (const [k, v] of Object.entries(t.annotations)) if (!(k in annotations)) annotations[k] = v;
  const record: RunRecord = {
    spec: input.spec,
    started: input.started.toISOString(),
    ended: input.ended.toISOString(),
    seconds: Math.round((input.ended.getTime() - input.started.getTime()) / 1000),
    status,
    class: 'pass',
    annotations,
    tests,
  };
  if (input.reportError) record.report_error = input.reportError;
  if (input.suiteId) record.suite_id = input.suiteId;
  if (input.attempt) record.attempt = input.attempt;
  if (input.gitSha) record.git_sha = input.gitSha;
  if (status === 'fail') {
    const errorText = input.report ? fullErrorText(input.report) : (input.reportError ?? '');
    const first = failedTests.find((t) => t.error)?.error ?? firstLine(errorText);
    if (first) record.error = first;
    const attachments = failedTests.flatMap((t) => t.attachments ?? []);
    if (attachments.length) record.attachments = [...new Set(attachments)];
    const c = classifyFailure(input.spec, errorText || first, input.issues, input.today);
    record.class = c.class;
    if (c.known_issue) record.known_issue = c.known_issue;
  }
  return record;
}

/** 파일 이름의 시각 부분: 로컬 시간 YYYYMMDD-HHMM */
export function runStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function runRecordPath(record: RunRecord, dir = RUNS_DIR): string {
  return path.join(dir, `${runStamp(new Date(record.started))}-${record.spec}.json`);
}

export function writeRunRecord(record: RunRecord, dir = RUNS_DIR): string {
  fs.mkdirSync(dir, { recursive: true });
  let file = runRecordPath(record, dir);
  for (let n = 2; fs.existsSync(file); n++) file = file.replace(/\.json$/, `-${n}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
  return file;
}

/** reports/runs/*.json 을 시작 시각 순으로 읽는다. 깨진 파일은 건너뛰고 경고한다. */
export function readRunRecords(dir = RUNS_DIR, warn: (line: string) => void = console.error): RunRecord[] {
  if (!fs.existsSync(dir)) return [];
  const out: RunRecord[] = [];
  for (const f of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    try {
      const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as RunRecord;
      if (typeof r.spec !== 'string' || typeof r.started !== 'string') throw new Error('spec/started 없음');
      out.push(r);
    } catch (err) {
      warn(
        `(경고) ${path.join('reports', 'runs', f)} 를 읽지 못해 건너뜁니다: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return out.sort((a, b) => a.started.localeCompare(b.started));
}

function toRel(p: string): string {
  const rel = path.relative(process.cwd(), p);
  return (rel.startsWith('..') ? p : rel).split(path.sep).join('/');
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
