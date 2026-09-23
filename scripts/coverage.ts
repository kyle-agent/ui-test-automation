/**
 * 커버리지 장부(service-map/coverage.yaml) 검증과 요약.
 *   npm run coverage                 검증 후 텍스트 요약 (문제가 있으면 목록을 내고 종료 코드 1)
 *   npm run coverage -- --md         같은 내용을 Markdown 으로 (scripts/results.ts 가 RESULTS.md 에 넣는다)
 *   npm run coverage -- --screens f  서비스 맵을 이 screens.txt 에서 읽는다 (기본: service-map/screens.txt, 비어 있으면 git HEAD)
 * 콘솔·브라우저 없이 돈다.
 */
import {
  collectSpecIds,
  formatCoverageMarkdown,
  formatCoverageText,
  loadCoverageLedger,
  loadServiceMap,
  summarizeCoverage,
  validateCoverage,
} from '../src/report/coverage';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));

function main(): void {
  const map = loadServiceMap(typeof flags.screens === 'string' ? flags.screens : undefined);
  const ledger = loadCoverageLedger();
  const errors = validateCoverage(ledger, map, collectSpecIds());
  if (errors.length) {
    console.error(`coverage.yaml 검증 실패 ${errors.length}건:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return;
  }
  const summary = summarizeCoverage(ledger, map);
  process.stdout.write(flags.md ? formatCoverageMarkdown(summary) : formatCoverageText(summary));
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
