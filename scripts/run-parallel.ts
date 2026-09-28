/**
 * 공유 VPC 위에서 여러 spec 을 병렬로 돌린다 (api-test-automation 의 shared-infra 방식).
 *
 *   npx tsx scripts/run-parallel.ts --specs database.postgresql,database.mysql,database.mariadb [--max 4] [--no-shared] [--keep-shared]
 *
 * 1) VPC+Subnet 을 한 번 만든다(이름 vpc-/sub-<run_id>, 계정 VPC 한도 5 중 1개).
 * 2) 각 spec 을 `scripts/run-stacks.ts --only <spec> --no-preflight` 로 동시에(최대 --max 개) 띄운다. 환경 변수 SHARED_VPC/SHARED_SUBNET 을 넘기면
 *    spec 은 자기 VPC 를 만들지 않고 공유 자원을 쓴다(src/console/shared.ts ensureNetwork). 실행 기록은 spec 마다 reports/runs/ 에 남는다.
 * 3) 전부 끝나면 Subnet → VPC 를 지운다(--keep-shared 면 남긴다).
 * 로그인 브라우저(PW_CDP_URL) 하나를 탭으로 나눠 쓴다. 병렬 중엔 `npm run stacks:cleanup --yes` 를 돌리지 말 것.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import '../src/console/env';
import { connectLiveBrowser } from '../src/console/browser';
import { createNetwork, deleteNetwork } from '../src/console/shared';
import { SUITE_ORDER } from '../src/report/suite';
import { newRunId } from '../src/scenario/schema';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const specs =
  typeof flags.specs === 'string'
    ? flags.specs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
const max = typeof flags.max === 'string' ? Number(flags.max) : 4;
const useShared = flags['no-shared'] !== true;
const keepShared = flags['keep-shared'] === true;
if (!specs.length) {
  console.error(
    '사용법: npx tsx scripts/run-parallel.ts --specs a,b,c [--max 4] [--no-shared] [--keep-shared]',
  );
  process.exit(2);
}
for (const s of specs)
  if (!SUITE_ORDER.some((id) => id === s || id.endsWith(s)))
    console.error(`(경고) ${s} 는 SUITE_ORDER 에 없다 — run-stacks 가 거부할 수 있다`);

const stamp = () => new Date().toLocaleTimeString('ko-KR', { hour12: false });
const log = (line: string) => console.log(`[${stamp()}] ${line}`);

function runOne(
  spec: string,
  env: NodeJS.ProcessEnv,
): Promise<{ spec: string; code: number | null; seconds: number }> {
  return new Promise((resolve) => {
    const started = Date.now();
    log(`시작: ${spec}`);
    const child = spawn(
      process.execPath,
      [
        path.join('node_modules', 'tsx', 'dist', 'cli.mjs'),
        path.join('scripts', 'run-stacks.ts'),
        '--only',
        spec,
        '--no-preflight',
      ],
      {
        env: { ...process.env, ...env, MSYS_NO_PATHCONV: '1', FORCE_COLOR: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const tag = spec.split('.').pop()!;
    const relay = (chunk: Buffer) => {
      for (const l of chunk.toString().split(/\r?\n/)) {
        const t = l.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim();
        if (/PASS|FAIL|passed|failed|Error:|정리 실패|재시도|실행 기록/.test(t))
          console.log(`  [${tag}] ${t.slice(0, 160)}`);
      }
    };
    child.stdout.on('data', relay);
    child.stderr.on('data', relay);
    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - started) / 1000);
      log(`끝: ${spec} exit ${code} (${seconds}s)`);
      resolve({ spec, code, seconds });
    });
  });
}

async function main(): Promise<void> {
  const runId = newRunId();
  const shared = useShared ? { vpc: `vpc-${runId}`, subnet: `sub-${runId}` } : null;
  const results: { spec: string; code: number | null; seconds: number }[] = [];
  const browser = await connectLiveBrowser();
  const page = await browser.contexts()[0]!.newPage();
  try {
    if (shared) {
      log(`공유 네트워크 생성: ${shared.vpc} / ${shared.subnet}`);
      await createNetwork(page, shared.vpc, shared.subnet, (l) => console.log(l));
    }
    const env: NodeJS.ProcessEnv = shared ? { SHARED_VPC: shared.vpc, SHARED_SUBNET: shared.subnet } : {};
    // 최대 max 개씩 동시에
    const queue = [...specs];
    const running: Promise<void>[] = [];
    const next = async (): Promise<void> => {
      const spec = queue.shift();
      if (!spec) return;
      results.push(await runOne(spec, env));
      await next();
    };
    const workers = Math.min(max, queue.length); // queue 가 줄어들기 전에 개수를 고정한다 (아니면 절반만 뜬다)
    for (let i = 0; i < workers; i++) running.push(next());
    await Promise.all(running);
  } finally {
    if (shared && !keepShared) {
      log(`공유 네트워크 삭제: ${shared.subnet} → ${shared.vpc}`);
      await deleteNetwork(page, shared.vpc, shared.subnet, (l) => console.log(l)).catch((e) =>
        log(
          `(경고) 공유 네트워크 정리 실패: ${e instanceof Error ? e.message.split('\n')[0] : String(e)} → npm run stacks:cleanup`,
        ),
      );
    }
    await page.close().catch(() => undefined);
    await browser.close();
  }
  console.log('\n===== 병렬 결과 =====');
  for (const r of results)
    console.log(
      `  ${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.spec}  ${Math.floor(r.seconds / 60)}분 ${r.seconds % 60}초`,
    );
  console.log('결과 정리: npm run results');
  process.exitCode = results.some((r) => r.code !== 0) ? 1 : 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
