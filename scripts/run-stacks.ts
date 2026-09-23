/**
 * 회귀 스택 스위트를 정해진 순서로 하나씩 돌린다 (직렬, 워커 1).
 *   npm run test:stacks                     전부 (아래 ORDER 순서)
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
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import '../src/console/env';
import { connectLiveBrowser } from '../src/console/browser';
import { listLeftovers } from '../src/console/inventory';
import { parseArgs } from '../src/service-map/io';

/** 실행 순서: 싼 것부터. 각 항목은 spec 파일 id 이며 tests/regression/<id>.spec.ts 에 있다. */
const ORDER = [
  'networking.vpc.create-delete', // ≈20초. VPC 생성·해지
  'compute.vm-stack', // ≈12분. Keypair(공유) → VPC → Subnet → 서버 → 역순 정리
  'compute.vm-volume', // ≈16분. 위 스택 + 볼륨 생성·연결·분리·삭제
  'compute.vm-stack-net', // ≈15분. SG · IGW · Public IP 까지
];

const { flags } = parseArgs(process.argv.slice(2));
const only = typeof flags.only === 'string' ? flags.only.split(',').map((s) => s.trim()) : null;
const from = typeof flags.from === 'string' ? flags.from : null;

function selected(): string[] {
  let ids = ORDER;
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

function runOne(id: string): { ok: boolean; seconds: number } {
  const file = path.join('tests', 'regression', `${id}.spec.ts`);
  const started = Date.now();
  console.log(`\n===== ${id} (${new Date().toLocaleTimeString()}) =====`);
  const result = spawnSync('npx', ['playwright', 'test', file, '--project=regression', '--reporter=line'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, RUN_DESTRUCTIVE: '1', PW_WORKERS: '1' },
  });
  return { ok: result.status === 0, seconds: Math.round((Date.now() - started) / 1000) };
}

async function main(): Promise<void> {
  const ids = selected();
  console.log(`실행 순서 (${ids.length}개, 직렬): ${ids.join(' → ')}`);
  if (!flags['no-preflight']) await preflight();
  const results: { id: string; ok: boolean; seconds: number }[] = [];
  for (const id of ids) results.push({ id, ...runOne(id) });
  console.log('\n===== 결과 =====');
  for (const r of results)
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${Math.floor(r.seconds / 60)}분 ${r.seconds % 60}초`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`실패 ${failed.length}개. 남은 리소스 확인: npm run stacks:check`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
