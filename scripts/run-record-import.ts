/**
 * Playwright JSON 리포트(PLAYWRIGHT_JSON_OUTPUT_FILE 로 남긴 원본) → 실행 기록(reports/runs/<시각>-<spec id>.json).
 * 런처(npm run test:stacks) 를 거치지 않고 `npx playwright test …` 로 직접 돌린 결과를 결과 정리에 넣을 때 쓴다.
 *
 *   npx tsx scripts/run-record-import.ts --spec storage.object-storage-bucket --json test-results/stacks/x.json [--rm]
 *
 * 시작·종료 시각은 리포트의 stats.startTime/duration 에서 뽑는다. --rm 이면 원본을 지운다 (reports/runs 에 원본이 있으면 안 된다: readRunRecords 가 건너뛴다).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { JSONReport } from '@playwright/test/reporter';
import { loadKnownIssues } from '../src/report/known-issues';
import { buildRunRecord, writeRunRecord } from '../src/report/run-record';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const spec = typeof flags.spec === 'string' ? flags.spec : '';
const json = typeof flags.json === 'string' ? flags.json : '';
if (!spec || !json) {
  console.error(
    '사용법: npx tsx scripts/run-record-import.ts --spec <spec id> --json <playwright json> [--rm]',
  );
  process.exit(2);
}
const report = JSON.parse(fs.readFileSync(json, 'utf8')) as JSONReport;
if (!Array.isArray(report.suites) || !report.stats) {
  console.error(`${json}: Playwright JSON 리포트가 아닙니다 (suites/stats 없음)`);
  process.exit(2);
}
const started = new Date(report.stats.startTime);
const ended = new Date(started.getTime() + report.stats.duration);
const record = buildRunRecord({
  spec,
  started,
  ended,
  ok: report.stats.unexpected === 0 && (report.errors ?? []).length === 0,
  report,
  issues: loadKnownIssues(),
});
const written = writeRunRecord(record);
console.log(
  `${path.relative(process.cwd(), written)} ← ${json} (${record.status}${record.status === 'fail' ? `/${record.class}` : ''}, ${record.seconds}s)`,
);
if (flags.rm === true) fs.unlinkSync(json);
