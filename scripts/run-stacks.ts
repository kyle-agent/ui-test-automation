/**
 * 회귀 스택 스위트를 정해진 순서로 하나씩 돌린다 (직렬, 워커 1).
 *   npm run test:stacks                     전부 (src/report/suite.ts 의 SUITE_ORDER 순서)
 *   npm run test:stacks -- --only vm-volume 일부만 (콤마 구분, id 의 끝부분 일치)
 *   npm run test:stacks -- --from vm-stack  그 spec 부터 끝까지
 *   npm run test:stacks -- --no-preflight   사전 점검 생략
 *
 * 왜 하나씩인가
 *  - Playwright 는 파일 실행 순서를 보장하지 않는다. 계정당 VPC 5개 한도와 로그인 브라우저 탭 하나를 공유하므로 동시에 여러 스택을 만들면 안 된다.
 *  - spec 마다 리소스를 만들고 지우므로(각 12~16분) 하나가 실패해도 다음 spec 은 새 리소스로 독립 실행된다.
 *  - 실행마다 `session` 프로젝트가 먼저 세션을 확인한다(약 12초). 세션이 만료됐으면 사람이 로그인해야 한다.
 *
 * 사전 점검: 남은 테스트 리소스가 있으면 경고하고 VPC 가 5개면 중단한다 (npm run stacks:cleanup 으로 정리).
 * 20분 넘게 걸리므로 터미널에서 직접 띄운다 (Claude Code 의 Bash 백그라운드는 10분에서 끊긴다).
 *
 * 실행 기록: spec 하나가 끝날 때마다 reports/runs/<YYYYMMDD-HHMM>-<spec id>.json 을 쓴다 (src/report/run-record.ts).
 * Playwright 는 `--reporter=line,json` 으로 띄우고 JSON 은 PLAYWRIGHT_JSON_OUTPUT_FILE 로 test-results/stacks/ 에 받는다
 * (playwright.config.ts 의 json 리포터 설정(test-results/report.json)은 그대로 두고 이 실행에서만 위치를 바꾼다).
 * 실패는 data/known-issues.yaml 과 세션·브라우저 오류 문구로 분류한다. 끝나면 `npm run results` 로 reports/RESULTS.md 를 갱신하면 된다.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { JSONReport } from '@playwright/test/reporter';
import '../src/console/env';
import { connectLiveBrowser } from '../src/console/browser';
import { listLeftovers } from '../src/console/inventory';
import { loadKnownIssues, type KnownIssue } from '../src/report/known-issues';
import { buildRunRecord, runStamp, writeRunRecord, type RunRecord } from '../src/report/run-record';
import { SUITE_ORDER } from '../src/report/suite';
import { parseArgs } from '../src/service-map/io';

/** 실행 순서. 각 항목은 spec 파일 id 이며 tests/regression/<id>.spec.ts 에 있다. */
const ORDER = SUITE_ORDER;
/** spec 별 Playwright JSON 리포트를 받는 곳 (gitignore 의 test-results/ 아래) */
const JSON_DIR = path.resolve(process.cwd(), 'test-results', 'stacks');

const { flags } = parseArgs(process.argv.slice(2));
const only = typeof flags.only === 'string' ? flags.only.split(',').map((s) => s.trim()) : null;
const from = typeof flags.from === 'string' ? flags.from : null;

function selected(): string[] {
  let ids = [...ORDER];
  if (from) {
    const i = ids.findIndex((id) => id.endsWith(from));
    if (i < 0) throw new Error(`--from ${from}: 해당 spec 이 없습니다. 목록: ${ORDER.join(', ')}`);
    ids = ids.slice(i);
  }
  if (only) {
    ids = ids.filter((id) => only.some((o) => id.endsWith(o)));
    if (ids.length === 0)
      throw new Error(`--only ${only.join(',')}: 해당 spec 이 없습니다. 목록: ${ORDER.join(', ')}`);
  }
  return ids;
}

async function preflight(): Promise<void> {
  const browser = await connectLiveBrowser();
  const page = await browser.contexts()[0]!.newPage();
  try {
    const { leftovers, vpcTotal } = await listLeftovers(page);
    console.log(`사전 점검: VPC ${vpcTotal}/5, 남은 테스트 리소스 ${leftovers.length}개`);
    for (const l of leftovers) console.log(`  ${l.kind.padEnd(6)} ${l.name}`);
    if (vpcTotal >= 5)
      throw new Error(
        'VPC 가 계정 한도(5개)에 도달해 새 스택을 만들 수 없습니다. npm run stacks:cleanup 으로 정리하세요.',
      );
    if (leftovers.length)
      console.log(
        '  (경고) 남은 리소스가 있습니다. 실행에는 지장이 없지만 npm run stacks:cleanup 으로 정리하는 편이 안전합니다.',
      );
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

function readJsonReport(file: string): { report: JSONReport | null; error?: string } {
  if (!fs.existsSync(file)) return { report: null, error: `JSON 리포트가 없습니다: ${file}` };
  try {
    return { report: JSON.parse(fs.readFileSync(file, 'utf8')) as JSONReport };
  } catch (err) {
    return {
      report: null,
      error: `JSON 리포트를 읽지 못했습니다: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function runOne(id: string, issues: readonly KnownIssue[]): RunRecord {
  const file = `tests/regression/${id}.spec.ts`; // 슬래시 고정: Windows 의 역슬래시는 Playwright 필터에 안 맞는다
  const started = new Date();
  fs.mkdirSync(JSON_DIR, { recursive: true });
  const jsonFile = path.join(JSON_DIR, `${runStamp(started)}-${id}.json`);
  console.log(`\n===== ${id} (${started.toLocaleTimeString()}) =====`);
  const result = spawnSync(
    'npx',
    ['playwright', 'test', file, '--project=regression', '--reporter=line,json'],
    {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        RUN_DESTRUCTIVE: '1',
        PW_WORKERS: '1',
        PLAYWRIGHT_JSON_OUTPUT_FILE: jsonFile,
        // 병렬 실행(test:suite) 때 서로의 산출물 폴더를 지우지 않도록 spec 별로 나눈다
        PW_OUTPUT_DIR: path.join('test-results', 'artifacts', id),
      },
    },
  );
  const ended = new Date();
  const { report, error } = readJsonReport(jsonFile);
  const record = buildRunRecord({
    spec: id,
    started,
    ended,
    ok: result.status === 0,
    report,
    reportError: error,
    issues,
  });
  const written = writeRunRecord(record);
  console.log(`실행 기록: ${path.relative(process.cwd(), written)}`);
  return record;
}

async function main(): Promise<void> {
  const ids = selected();
  const issues = loadKnownIssues();
  console.log(`실행 순서 (${ids.length}개, 직렬): ${ids.join(' → ')}`);
  if (!flags['no-preflight']) await preflight();
  const results: RunRecord[] = [];
  for (const id of ids) results.push(runOne(id, issues));
  console.log('\n===== 결과 =====');
  for (const r of results) {
    const verdict =
      r.status === 'pass' ? 'PASS' : `FAIL${r.known_issue ? `(known: ${r.known_issue})` : `(${r.class})`}`;
    console.log(`  ${verdict}  ${r.spec}  ${Math.floor(r.seconds / 60)}분 ${r.seconds % 60}초`);
    if (r.error) console.log(`        ${r.error}`);
  }
  const failed = results.filter((r) => r.status !== 'pass');
  console.log('RESULTS.md 갱신: npm run results');
  if (failed.length) {
    console.log(`실패 ${failed.length}개. 남은 리소스 확인: npm run stacks:check`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
