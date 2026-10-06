/**
 * API 자동화 저장소에서 서비스별 엔드포인트 커버리지 숫자만 가져와 data/api-coverage.json 으로 저장한다.
 *   npx tsx scripts/import-api-coverage.ts --repo <api-test-automation 경로>
 * "검증됨" = data/verified_endpoints.json 에 있는 엔드포인트. 2xx = endpoint_status.json 의 마지막 응답이 2xx.
 * 엔드포인트 이름·본문은 저장하지 않는다(서비스별 숫자만).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { API_COVERAGE_FILE, API_SERVICE, type ApiCoverageSnapshot } from '../src/report/api-coverage';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const repo = typeof flags.repo === 'string' ? flags.repo : process.env.API_REPO_DIR;
if (!repo) {
  console.error('사용법: npx tsx scripts/import-api-coverage.ts --repo <api-test-automation 경로>  (또는 API_REPO_DIR)');
  process.exit(1);
}
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(repo, p), 'utf8'));
const catalog = read('data/api_catalog.json') as { key: string; category: string; service: string }[];
const verified = new Set<string>(read('data/verified_endpoints.json').verified);
const status = read('data/endpoint_status.json').status as Record<string, [number, ...unknown[]]>;

const agg = new Map<string, { category: string; service: string; total: number; verified: number; ok2xx: number }>();
for (const e of catalog) {
  const k = `${e.category}/${e.service}`;
  const a = agg.get(k) ?? { category: e.category, service: e.service, total: 0, verified: 0, ok2xx: 0 };
  a.total++;
  if (verified.has(e.key)) a.verified++;
  const s = status[e.key]?.[0];
  if (typeof s === 'number' && s >= 200 && s < 300) a.ok2xx++;
  agg.set(k, a);
}
const unmapped = [...agg.values()].filter((s) => !(s.service in API_SERVICE)).map((s) => s.service);
const git = (args: string[]) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).stdout.trim();
const snapshot: ApiCoverageSnapshot = {
  source: 'kyle-agent/api-test-automation',
  source_commit: git(['rev-parse', '--short', 'HEAD']),
  source_date: fs.statSync(path.join(repo, 'data', 'verified_endpoints.json')).mtime.toISOString().slice(0, 10),
  imported: new Date().toISOString().slice(0, 10),
  services: [...agg.values()].sort((a, b) => a.category.localeCompare(b.category) || a.service.localeCompare(b.service)),
};
fs.mkdirSync(path.dirname(API_COVERAGE_FILE), { recursive: true });
fs.writeFileSync(API_COVERAGE_FILE, JSON.stringify(snapshot, null, 2) + '\n');
const t = snapshot.services.reduce((n, s) => n + s.total, 0);
const v = snapshot.services.reduce((n, s) => n + s.verified, 0);
console.log(`${path.relative(process.cwd(), API_COVERAGE_FILE)}: 서비스 ${snapshot.services.length}개, 엔드포인트 검증 ${v}/${t} (${snapshot.source_commit}, ${snapshot.source_date})`);
if (unmapped.length) console.log(`(경고) 화면 대응표(src/report/api-coverage.ts API_SERVICE)에 없는 서비스: ${unmapped.join(', ')}`);
