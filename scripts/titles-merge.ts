/**
 * 스모크 실행 중 관측한 document.title(test-results/observed-titles.jsonl)을 service-map/titles.json 에 반영한다.
 * 같은 라우트에서 서로 다른 제목이 관측되면 반영하지 않고 경고한다.
 *
 *   npm run titles:merge -- [--input test-results/observed-titles.jsonl] [--dry-run]
 */
import path from 'node:path';
import { OBSERVED_TITLES, TITLE_PATTERN, knownTitles, readObservedTitles } from '../src/console/titles';
import { TITLES_JSON, parseArgs, writeJson } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const input = typeof flags.input === 'string' ? flags.input : OBSERVED_TITLES;
const observed = readObservedTitles(input);
if (observed.length === 0) {
  console.log(`관측 기록이 없습니다: ${path.relative(process.cwd(), input)} (스모크를 먼저 실행하세요)`);
  process.exit(0);
}
const byRoute = new Map<string, Set<string>>();
for (const o of observed) {
  if (!TITLE_PATTERN.test(o.title)) continue;
  byRoute.set(o.route, (byRoute.get(o.route) ?? new Set()).add(o.title));
}
const merged: Record<string, string> = { ...knownTitles() };
let added = 0;
let changed = 0;
for (const [route, titles] of byRoute) {
  if (titles.size !== 1) {
    console.warn(
      `경고: ${route} 에서 제목이 ${titles.size}가지 관측되어 반영하지 않습니다: ${[...titles].join(' / ')}`,
    );
    continue;
  }
  const title = [...titles][0]!;
  if (merged[route] === undefined) added++;
  else if (merged[route] !== title) {
    changed++;
    console.warn(`변경: ${route}\n  이전: ${merged[route]}\n  이번: ${title}`);
  }
  merged[route] = title;
}
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
if (!flags['dry-run']) writeJson(TITLES_JSON, sorted);
console.log(
  `${path.relative(process.cwd(), TITLES_JSON)}: 총 ${Object.keys(sorted).length} (추가 ${added}, 변경 ${changed})${flags['dry-run'] ? ' [dry-run]' : ''}`,
);
