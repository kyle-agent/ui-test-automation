/**
 * 탐색(scripts/explore.ts)을 여러 건 직렬로 돌린다 (로그인 브라우저 하나를 같이 쓰므로 병렬 금지).
 *
 *   npx tsx scripts/explore-batch.ts --plan plans/explore-default.json
 *
 * plan 파일: [{ "name": "subnet-form", "args": ["--route", "#/vpc/subnet/list", "--open", "Subnet 생성", "--prereq", "vpc", "--minutes", "10"] }, …]
 * 각 항목은 explore.ts 의 인자를 그대로 넘긴다(--name 은 항목의 name 으로 채운다). 한 건이 실패해도 다음 건을 계속한다.
 * Jev 호출 환경(NODE_OPTIONS/NODE_USE_SYSTEM_CA/NODE_EXTRA_CA_CERTS)은 호출한 쪽 환경을 그대로 물려받는다 (docs/HANDOFF.md 8절).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../src/service-map/io';

interface PlanItem {
  name: string;
  args: string[];
}

const { flags } = parseArgs(process.argv.slice(2));
const planFile = typeof flags.plan === 'string' ? flags.plan : '';
if (!planFile) {
  console.error('사용법: npx tsx scripts/explore-batch.ts --plan <plan.json>');
  process.exit(2);
}
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8')) as PlanItem[];
const stamp = () => new Date().toLocaleTimeString('ko-KR', { hour12: false });
const results: { name: string; code: number | null; seconds: number }[] = [];
for (const item of plan) {
  const started = Date.now();
  console.log(`\n===== ${item.name} (${stamp()}) =====`);
  // shell 없이 node 로 tsx 를 직접 부른다: 공백·한글이 든 인자("Subnet 생성")가 셸에서 쪼개지지 않도록.
  const r = spawnSync(
    process.execPath,
    [
      path.join('node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.join('scripts', 'explore.ts'),
      '--name',
      item.name,
      ...item.args,
    ],
    { stdio: 'inherit', env: { ...process.env, MSYS_NO_PATHCONV: '1' } },
  );
  const seconds = Math.round((Date.now() - started) / 1000);
  results.push({ name: item.name, code: r.status, seconds });
  console.log(`--- ${item.name}: exit ${r.status} (${seconds}s, ${stamp()})`);
}
console.log('\n===== 탐색 배치 결과 =====');
for (const r of results) console.log(`  ${r.code === 0 ? 'OK  ' : 'FAIL'}  ${r.name}  ${r.seconds}s`);
console.log('보고서: recordings/explore/<이름>-<시각>/report.md · 대시보드 반영: npm run results');
process.exitCode = results.some((r) => r.code !== 0) ? 1 : 0;
