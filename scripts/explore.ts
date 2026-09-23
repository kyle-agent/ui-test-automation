/**
 * Jev 탐색 (Level 5): 이미 확보된 화면에서 Jev 가 아직 눌러보지 않은 컨트롤을 골라 동작시키고, 코드가 판정·보고한다.
 *
 *   npx tsx scripts/explore.ts --route '#/vpc/vpc/list' --open '서비스 생성' --name vpc-form [--budget 30] [--cost 0.05] [--minutes 20]
 *   npx tsx scripts/explore.ts --route '#/vpc/subnet/list' --open 'Subnet 생성' --name subnet-form --prereq vpc
 *   --prereq vpc[,subnet]  탐색 전에 선행 리소스를 만든다 (Subnet 폼은 VPC 가 있어야 드롭다운이 채워진다). 끝나면 run_id 이름의 리소스를 자동 정리한다 (--no-cleanup 으로 끔)
 *
 * Git Bash 에서는 `#/vpc/...` 인자가 Windows 경로로 바뀌므로 `MSYS_NO_PATHCONV=1` 을 앞에 붙인다. Jev 호출은 사내 프록시 CA 때문에
 * NODE_OPTIONS=--openssl-config=C:/jev/node-openssl.cnf 와 NODE_USE_SYSTEM_CA=1 이 필요하다(docs/HANDOFF.md 8절, `npm run jev:ping` 으로 확인).
 *
 * 결과: recordings/explore/<name>-<시각>/report.md, trace.json, screenshots/. 탐색 중 실제로 생성된 리소스는 이름 규칙을 따르므로
 * 끝난 뒤 `npm run stacks:check` → `npm run stacks:cleanup` 으로 지운다. 로그인 브라우저(PW_CDP_URL)가 필요하다.
 */
import '../src/console/env';
import fs from 'node:fs';
import path from 'node:path';
import { connectLiveBrowser } from '../src/console/browser';
import { exploreScreen, renderReport } from '../src/jev/explorer';
import { cleanupByRunId, createPrereqs, type Prereq } from '../src/explore/prereq';
import { newRunId } from '../src/scenario/schema';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const route = typeof flags.route === 'string' ? flags.route : '';
if (!route) {
  console.error(
    "사용법: npx tsx scripts/explore.ts --route '#/vpc/vpc/list' --open '서비스 생성' --name vpc-form [--budget 30]",
  );
  process.exit(2);
}
const name =
  typeof flags.name === 'string' ? flags.name : route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const outDir = path.join('recordings', 'explore', `${name}-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

async function main(): Promise<void> {
  const browser = await connectLiveBrowser();
  const page = await browser.contexts()[0]!.newPage();
  const runId = newRunId();
  const prereqs = (typeof flags.prereq === 'string' ? flags.prereq.split(',') : [])
    .map((s) => s.trim())
    .filter(Boolean) as Prereq[];
  const cleanup = !flags['no-cleanup'];
  console.log(`탐색: ${route}${flags.open ? ` → "${flags.open}"` : ''} (run_id ${runId}, 출력 ${outDir})`);
  try {
    if (prereqs.length) await createPrereqs(page, prereqs, runId, console.log);
    const report = await exploreScreen({
      page,
      route,
      open: typeof flags.open === 'string' ? flags.open : undefined,
      name,
      runId,
      outDir,
      budget: typeof flags.budget === 'string' ? Number(flags.budget) : undefined,
      costCapUsd: typeof flags.cost === 'string' ? Number(flags.cost) : undefined,
      timeCapMs: typeof flags.minutes === 'string' ? Number(flags.minutes) * 60_000 : undefined,
      log: console.log,
    });
    fs.writeFileSync(path.join(outDir, 'report.md'), renderReport(report));
    console.log(`보고서: ${path.join(outDir, 'report.md')}`);
    if (report.names_used.length)
      console.log(
        `생성됐을 수 있는 리소스: ${[...new Set(report.names_used)].join(', ')} → npm run stacks:check`,
      );
  } finally {
    if (cleanup) {
      const errors = await cleanupByRunId(page, runId, console.log).catch((e) => [String(e).slice(0, 120)]);
      if (errors.length) console.error(`정리 실패: ${errors.join('; ')} → npm run stacks:cleanup`);
    }
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
