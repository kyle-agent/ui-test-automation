/**
 * 대시보드 1단계(2026-10-02)가 쓰는 파생 지표. 실행 기록·스위트 요약·API 대응표에서 계산만 한다(파일 읽기는 read* 함수만).
 *
 *  - 실패 원인(cause): 저장된 class 를 그대로 믿지 않고 화면에서 다시 판정한다(예전 기록은 환경 패턴이 좁아 unclassified 로 남았다).
 *      product      알려진 이슈(kind=product)로 사람이 확정한 것
 *      test         알려진 이슈(kind=test)
 *      environment  알려진 이슈(kind=environment) 또는 세션·브라우저·CDP·산출물 폴더 문구(ENVIRONMENT_PATTERNS)
 *      cleanup      본 단계는 지나갔고 정리(teardown)만 실패 — 남은 리소스 위험
 *      flaky        같은 spec 의 바로 다음 실행이 48시간 안에 통과 — 재시도로 풀린 실패
 *      unclassified 나머지(사람이 봐야 함)
 *  - 불안정 spec: 최근 10회에 통과와 실패가 섞여 있고 마지막은 통과
 *  - 오류 시그니처: 오류 첫 줄에서 숫자·run_id·이름 접미사를 # 로 바꿔 같은 원인을 묶는다
 */
import fs from 'node:fs';
import path from 'node:path';
import { isEnvironmentError, type RunRecord } from './run-record';

export type Cause = 'product' | 'test' | 'environment' | 'cleanup' | 'flaky' | 'unclassified';

export const CAUSE_LABEL: Record<Cause, string> = {
  product: '제품 결함',
  test: '테스트 코드',
  environment: '환경',
  cleanup: '정리 실패',
  flaky: '간헐(재시도 통과)',
  unclassified: '미분류',
};

/** 화면 표시 순서(위험한 것 먼저) */
export const CAUSE_ORDER: readonly Cause[] = ['product', 'unclassified', 'cleanup', 'test', 'flaky', 'environment'];

const HOUR = 3_600_000;

/** 실패 기록 하나의 원인. later = 같은 spec 의 그 뒤 기록(시간순) */
export function causeOf(r: RunRecord, later: readonly RunRecord[]): Cause {
  if (r.class === 'product' || r.class === 'test') return r.class;
  if (r.class === 'environment' || isEnvironmentError(r.error ?? '')) return 'environment';
  if (/정리 중 실패/.test(r.error ?? '')) return 'cleanup';
  const next = later[0];
  if (next && next.status === 'pass' && Date.parse(next.started) - Date.parse(r.started) < 48 * HOUR) return 'flaky';
  return 'unclassified';
}

/** 오류 첫 줄 → 묶음 키. 숫자·run_id(0930-1839-74ce 등)·따옴표 안 이름을 # 로 */
export function errorSignature(error: string | undefined): string {
  if (!error) return '(오류 문구 없음)';
  return error
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/"[^"]{1,80}"/g, '"#"')
    .replace(/'[^']{1,120}'/g, "'#'")
    .replace(/\b[a-z]{2,6}-?\d{4}-\d{4}-[0-9a-f]{4}\b/gi, '#')
    .replace(/\b[a-z]{2,4}\d{8}[0-9a-f]{4}\b/gi, '#')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

export interface FailureView {
  record: RunRecord;
  cause: Cause;
  signature: string;
}

/** 모든 실패 기록에 원인·시그니처를 붙인다 */
export function failureViews(records: readonly RunRecord[]): FailureView[] {
  const bySpec = new Map<string, RunRecord[]>();
  for (const r of [...records].sort((a, b) => a.started.localeCompare(b.started))) {
    const list = bySpec.get(r.spec) ?? [];
    list.push(r);
    bySpec.set(r.spec, list);
  }
  const out: FailureView[] = [];
  for (const runs of bySpec.values())
    runs.forEach((r, i) => {
      if (r.status === 'fail') out.push({ record: r, cause: causeOf(r, runs.slice(i + 1)), signature: errorSignature(r.error) });
    });
  return out.sort((a, b) => b.record.started.localeCompare(a.record.started));
}

export interface SignatureGroup {
  signature: string;
  cause: Cause;
  count: number;
  specs: string[];
  latest: RunRecord;
}

/** 시그니처별 묶음(많은 순). 묶음의 원인은 가장 위험한 원인(CAUSE_ORDER 앞쪽)으로 */
export function groupBySignature(views: readonly FailureView[]): SignatureGroup[] {
  const m = new Map<string, SignatureGroup>();
  for (const v of views) {
    const g = m.get(v.signature);
    if (!g) {
      m.set(v.signature, { signature: v.signature, cause: v.cause, count: 1, specs: [v.record.spec], latest: v.record });
      continue;
    }
    g.count++;
    if (!g.specs.includes(v.record.spec)) g.specs.push(v.record.spec);
    if (CAUSE_ORDER.indexOf(v.cause) < CAUSE_ORDER.indexOf(g.cause)) g.cause = v.cause;
    if (v.record.started > g.latest.started) g.latest = v.record;
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.latest.started.localeCompare(a.latest.started));
}

/** 최근 n회에 통과·실패가 섞여 있고 마지막이 통과 */
export function isFlakySpec(runs: readonly RunRecord[], n = 10): boolean {
  const recent = runs.slice(-n);
  const last = recent[recent.length - 1];
  return !!last && last.status === 'pass' && recent.some((r) => r.status === 'fail');
}

// ───────── 스위트 요약 (scripts/run-suite.ts 가 reports/suites/<id>-a<attempt>.json 으로 남김) ─────────

export const SUITES_DIR = path.resolve(process.cwd(), 'reports', 'suites');

export interface SuiteSummaryFile {
  suite_id: string;
  attempt: number;
  started: string;
  ended: string;
  wall_minutes: number;
  serial_minutes: number;
  max_tabs: number;
  results: { spec: string; status: 'pass' | 'fail' | 'skip'; seconds: number }[];
  leftovers_end: string[] | null;
}

export interface SuiteView {
  suite_id: string;
  started: string;
  specs: number;
  first_pass: number;
  final_pass: number;
  attempts: number;
  wall_minutes: number;
  serial_minutes: number;
  max_tabs: number;
  still_failing: string[];
  leftovers_end: string[] | null;
}

export function readSuiteSummaries(dir = SUITES_DIR): SuiteSummaryFile[] {
  if (!fs.existsSync(dir)) return [];
  const out: SuiteSummaryFile[] = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as SuiteSummaryFile);
    } catch {
      // 깨진 요약은 건너뛴다
    }
  }
  return out;
}

/** 같은 suite_id 의 시도들을 합친다: 첫 시도 통과 = attempt 1 의 pass, 최종 = 마지막으로 돈 결과 기준 */
export function suiteViews(files: readonly SuiteSummaryFile[]): SuiteView[] {
  const by = new Map<string, SuiteSummaryFile[]>();
  for (const f of files) by.set(f.suite_id, [...(by.get(f.suite_id) ?? []), f]);
  const out: SuiteView[] = [];
  for (const [id, list] of by) {
    const tries = [...list].sort((a, b) => a.attempt - b.attempt);
    const first = tries[0]!;
    const final = new Map<string, string>();
    for (const t of tries) for (const r of t.results) final.set(r.spec, r.status);
    const last = tries[tries.length - 1]!;
    out.push({
      suite_id: id,
      started: first.started,
      specs: first.results.length,
      first_pass: first.results.filter((r) => r.status === 'pass').length,
      final_pass: [...final.values()].filter((s) => s === 'pass').length,
      attempts: tries.length,
      wall_minutes: tries.reduce((n, t) => n + t.wall_minutes, 0),
      serial_minutes: first.serial_minutes,
      max_tabs: first.max_tabs,
      still_failing: [...final].filter(([, s]) => s !== 'pass').map(([spec]) => spec),
      leftovers_end: last.leftovers_end,
    });
  }
  return out.sort((a, b) => b.started.localeCompare(a.started));
}

// ───────── API 대응표 (docs/api-ui-parity.md) ─────────

export const PARITY_FILE = path.resolve(process.cwd(), 'docs', 'api-ui-parity.md');

export type ParityStatus = 'done' | 'wip' | 'skip';

export interface ParityRow {
  category: string;
  api: string;
  ui: string;
  status: ParityStatus;
}

/** "| 분류 | API 리소스 | UI spec | 상태 |" 표의 행을 읽는다(✅ done · 🔧 wip · ⏭ skip) */
export function parseParity(markdown: string): ParityRow[] {
  const rows: ParityRow[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 6 || cells[1] === '분류' || /^-+$/.test(cells[1] ?? '')) continue;
    const mark = cells[4] ?? '';
    const status: ParityStatus | null = mark.startsWith('✅') ? 'done' : mark.startsWith('🔧') ? 'wip' : mark.startsWith('⏭') ? 'skip' : null;
    if (!status) continue;
    rows.push({ category: cells[1]!, api: cells[2]!, ui: cells[3]!, status });
  }
  return rows;
}

export function readParity(file = PARITY_FILE): ParityRow[] {
  return fs.existsSync(file) ? parseParity(fs.readFileSync(file, 'utf8')) : [];
}
