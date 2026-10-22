/**
 * reports/runs/*.json (scripts/run-stacks.ts 가 남긴 실행 기록) → reports/RESULTS.md.
 *   npm run results
 * 내용: spec 별 최근 상태 표(마지막 실행·PASS/FAIL·소요·최근 5회·통과 평균), 최근 실패, 적용된 알려진 이슈,
 * 커버리지 요약(scripts/coverage.ts --md 와 같음). 콘솔·브라우저 없이 돈다. 기록이 없으면 spec 마다 "기록 없음" 으로 채운다.
 * 같은 입력으로 reports/dashboard.html (브라우저용, 자체 완결 HTML) 도 만든다. --open 이면 만든 뒤 기본 브라우저로 연다.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  collectSpecIds,
  formatCoverageMarkdown,
  loadCoverageLedger,
  loadServiceMap,
  summarizeCoverage,
  validateCoverage,
} from '../src/report/coverage';
import { productComparison, readApiCoverage } from '../src/report/api-coverage';
import { consoleOnlyWrites, productOperations, readUiOperations } from '../src/report/operations';
import { readExclusions } from '../src/report/population';
import { buildProductMatrix, readDecisions } from '../src/report/product-matrix';
import { readScenarioCatalog } from '../src/report/scenario-catalog';
import { readExploreSummaries, renderDashboardHtml } from '../src/report/dashboard';
import {
  coverageHistory,
  readFindings,
  readParity,
  readSuiteSummaries,
  suiteViews,
} from '../src/report/insights';
import { loadKnownIssues } from '../src/report/known-issues';
import { failuresTable, fmtTime, knownIssuesSection, resultsTable } from '../src/report/results';
import { classifyFailure, readRunRecords, RUNS_DIR } from '../src/report/run-record';
import { SUITE_ORDER } from '../src/report/suite';
import { readScreenTree } from '../src/service-map/screen-tree';

const RESULTS_MD = path.resolve(process.cwd(), 'reports', 'RESULTS.md');
const DASHBOARD_HTML = path.resolve(process.cwd(), 'reports', 'dashboard.html');

function main(): void {
  const records = readRunRecords();
  const issues = loadKnownIssues();
  // 알려진 이슈를 실패 뒤에 등록해도(KI-001, 2026-10-14) 예전 미분류 실패가 다시 분류되게 한다. 기록 파일은 고치지 않고 보고서에서만 재판정.
  for (const r of records) {
    if (r.status !== 'fail' || r.class !== 'unclassified' || !r.error) continue;
    const c = classifyFailure(r.spec, r.error, issues, r.started.slice(0, 10));
    if (c.known_issue) {
      r.class = c.class;
      r.known_issue = c.known_issue;
    }
  }
  const map = loadServiceMap();
  const ledger = loadCoverageLedger();
  const errors = validateCoverage(ledger, map, collectSpecIds());
  const coverage = errors.length
    ? [
        `coverage.yaml 검증 실패 ${errors.length}건 (npm run coverage 로 확인)`,
        ...errors.map((e) => `- ${e}`),
      ]
    : formatCoverageMarkdown(summarizeCoverage(ledger, map, readExclusions()))
        .trimEnd()
        .split('\n');

  const out: string[] = [];
  out.push('# 회귀 결과 정리');
  out.push('');
  out.push(
    `> 생성 파일입니다. 직접 고치지 말고 \`npm run results\` 로 다시 만듭니다 (원본: \`reports/runs/*.json\`, \`service-map/coverage.yaml\`, \`data/known-issues.yaml\`). 생성 시각 ${fmtTime(new Date().toISOString())}, 실행 기록 ${records.length}건.`,
  );
  out.push('');
  out.push('## 1. spec 별 최근 상태');
  out.push('');
  out.push(...resultsTable(records, SUITE_ORDER));
  out.push('');
  out.push(
    '실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.',
  );
  out.push('');
  out.push('## 2. 최근 실패 (최대 10건)');
  out.push('');
  out.push(...failuresTable(records));
  out.push('');
  out.push('## 3. 알려진 이슈');
  out.push('');
  out.push(...knownIssuesSection(records, issues));
  out.push('');
  out.push('## 4. 커버리지 (service-map/coverage.yaml)');
  out.push('');
  out.push(
    'level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.',
  );
  out.push('');
  out.push(...coverage);
  out.push('');
  const apiSnapshot = readApiCoverage();
  const consoleOnly = consoleOnlyWrites(apiSnapshot, records);
  out.push('## 5. 콘솔 전용 쓰기 동작 (API 카탈로그에 없는 경로)');
  out.push('');
  out.push(
    '통과한 실행이 보낸 쓰기 요청(실행 기록 api_writes, 2026-10-14 이후 모든 spec 이 기록) 중 data/api-coverage.json 의 경로와 맞지 않는 것. 동작 단위 모수(API 쓰기 동작)에는 넣지 않고 따로 센다. ? = 카탈로그 {…} 자리에 글자 세그먼트가 온 느슨한 일치(확인 필요).',
  );
  out.push('');
  if (!records.some((r) => r.api_writes?.length)) out.push('아직 쓰기 요청을 기록한 실행이 없다.');
  else if (!consoleOnly.some((r) => r.kind === 'write'))
    out.push('없음 — 기록된 쓰기 요청이 모두 카탈로그 경로와 맞는다.');
  else {
    out.push('| 상품 | 메서드 | 경로 | spec | 마지막 |');
    out.push('| --- | --- | --- | --- | --- |');
    for (const r of consoleOnly.filter((x) => x.kind === 'write'))
      out.push(
        `| ${r.product} | ${r.method} | \`${r.path}\`${r.loose ? ' ?' : ''} | ${r.specs.join(', ')} | ${fmtTime(r.last_seen).slice(0, 10)} |`,
      );
  }
  const noApi = consoleOnly.filter((r) => r.kind === 'no-api-service');
  if (noApi.length) {
    out.push('');
    out.push('API 카탈로그에 서비스 자체가 없는 상품(콘솔로만 다루는 상품, 모수 밖):');
    out.push('');
    const byProd = new Map<string, typeof noApi>();
    for (const r of noApi) byProd.set(r.product, [...(byProd.get(r.product) ?? []), r]);
    for (const [prod, list] of byProd)
      out.push(
        `- ${prod}: ${list.map((r) => '`' + r.method + ' ' + r.path + '`').join(', ')} — ${[...new Set(list.flatMap((r) => r.specs))].join(', ')}`,
      );
  }
  const readLike = consoleOnly.filter((r) => r.kind === 'read-like');
  if (readLike.length) {
    out.push('');
    out.push(
      `POST 지만 조회로 보이는 경로(세지 않음) ${readLike.length}개: ${readLike.map((r) => '`' + r.method + ' ' + r.path + '`').join(', ')}`,
    );
  }
  out.push('');
  fs.mkdirSync(path.dirname(RESULTS_MD), { recursive: true });
  fs.writeFileSync(RESULTS_MD, out.join('\n'));
  const explores = readExploreSummaries();
  const catalog = readScenarioCatalog(records);
  const operations = productOperations(
    apiSnapshot,
    readUiOperations(),
    new Set(collectSpecIds()),
    new Set(records.filter((r) => r.status === 'pass').map((r) => r.spec)),
    readExclusions(),
  );
  fs.writeFileSync(
    DASHBOARD_HTML,
    renderDashboardHtml({
      generated: fmtTime(new Date().toISOString()),
      records,
      suiteOrder: SUITE_ORDER,
      coverage: errors.length ? null : summarizeCoverage(ledger, map, readExclusions()),
      coverageErrors: errors,
      entries: ledger.resources,
      issues,
      explores,
      suites: suiteViews(readSuiteSummaries(), records),
      parity: readParity(),
      findings: readFindings(),
      coverageHistory: coverageHistory(),
      products: productComparison(ledger.resources, apiSnapshot, readExclusions()),
      apiSnapshot,
      matrix: buildProductMatrix(map, ledger.resources, catalog, readDecisions(), readExclusions()),
      tree: readScreenTree(),
      operations,
      consoleOnly,
    }),
  );
  console.log(
    `${path.relative(process.cwd(), RESULTS_MD)} 갱신: 실행 기록 ${records.length}건 (${path.relative(process.cwd(), RUNS_DIR)}), 커버리지 ${errors.length ? '검증 실패' : 'OK'}`,
  );
  console.log(`${path.relative(process.cwd(), DASHBOARD_HTML)} 갱신: 탐색 보고서 ${explores.length}건`);
  const opsWarn = [...operations.unknown, ...operations.unknownServices, ...operations.unknownSpecs];
  if (opsWarn.length)
    console.log(`(경고) data/ui-operations.yaml 에 모르는 동작·서비스·spec: ${opsWarn.join(', ')}`);
  if (process.argv.includes('--open')) {
    const cmd =
      process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', DASHBOARD_HTML]]
        : process.platform === 'darwin'
          ? ['open', [DASHBOARD_HTML]]
          : ['xdg-open', [DASHBOARD_HTML]];
    spawn(cmd[0] as string, cmd[1] as string[], { detached: true, stdio: 'ignore' }).unref();
  }
  if (errors.length) process.exitCode = 1;
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
