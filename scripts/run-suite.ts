/**
 * 회귀 스위트 병렬 실행 (npm run test:suite). 직렬 런처(scripts/run-stacks.ts)와 같은 spec·같은 실행 기록을 쓰되 동시에 띄운다.
 *
 *   npm run test:suite                          SUITE_ORDER 전부
 *   npm run test:suite -- --only a,b --max 6    일부만 / 동시 탭 수
 *   npm run test:suite -- --dry-run             계획만 출력
 *
 * 스케줄 규칙 (api-test-automation 의 shared-infra + VPC 세마포어와 같은 생각):
 *  - 계정 VPC 한도 5 에서 실행 전에 이미 있는 VPC 수를 빼고, 공유 VPC 가 살아 있는 동안 1 을 더 뺀 만큼만 VPC 를 쓰는 spec 을 동시에 띄운다
 *    (spec 별 VPC 수는 src/report/suite-plan.ts). 공유 VPC 채택 spec(DBaaS)은 VPC 를 쓰지 않는다.
 *  - 오래 걸리는 spec 부터 띄운다. 한 로그인 브라우저의 탭을 최대 --max 개(기본 5)까지 나눠 쓴다.
 *  - 공유 VPC+Subnet 은 다른 spec 을 띄우기 전에 먼저 만든다(부하 중엔 Subnet 폼이 느려 실패했다, 한 번 재시도). 공유 spec 이 다 끝나면 지운다.
 * 각 spec 은 `scripts/run-stacks.ts --only <id> --no-preflight` 로 떠서 reports/runs/ 에 기록을 남긴다. 실행 중엔 stacks:cleanup --yes 금지.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import '../src/console/env';
import { connectLiveBrowser } from '../src/console/browser';
import { listLeftovers } from '../src/console/inventory';
import { createNetwork, deleteNetwork } from '../src/console/shared';
import { SUITE_ORDER } from '../src/report/suite';
import { planFor } from '../src/report/suite-plan';
import { newRunId } from '../src/scenario/schema';
import { parseArgs } from '../src/service-map/io';

const VPC_CAP = 5;
const { flags } = parseArgs(process.argv.slice(2));
const only = typeof flags.only === 'string' ? flags.only.split(',').map((s) => s.trim()).filter(Boolean) : null;
const maxTabs = typeof flags.max === 'string' ? Number(flags.max) : 5;
const dryRun = flags['dry-run'] === true;
const staggerMs = (typeof flags.stagger === 'string' ? Number(flags.stagger) : 20) * 1000;

const stamp = () => new Date().toLocaleTimeString('ko-KR', { hour12: false });
const log = (line: string) => console.log(`[${stamp()}] ${line}`);
const firstLine = (e: unknown) => (e instanceof Error ? e.message.split('\n')[0] : String(e));

interface Result {
  spec: string;
  code: number | null;
  seconds: number;
}

function runOne(spec: string, env: NodeJS.ProcessEnv): Promise<Result> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(
      process.execPath,
      [path.join('node_modules', 'tsx', 'dist', 'cli.mjs'), path.join('scripts', 'run-stacks.ts'), '--only', spec, '--no-preflight'],
      { env: { ...process.env, ...env, MSYS_NO_PATHCONV: '1', FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const tag = spec.split('.').slice(1).join('.');
    const relay = (chunk: Buffer) => {
      for (const l of chunk.toString().split(/\r?\n/)) {
        const t = l.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim();
        if (/^Error:|정리 실패|재시도/.test(t)) console.log(`    [${tag}] ${t.slice(0, 160)}`);
      }
    };
    child.stdout.on('data', relay);
    child.stderr.on('data', relay);
    child.on('close', (code) => resolve({ spec, code, seconds: Math.round((Date.now() - started) / 1000) }));
  });
}

async function main(): Promise<void> {
  const specs = (only ? SUITE_ORDER.filter((s) => only.some((o) => s === o || s.endsWith(o))) : [...SUITE_ORDER]).sort(
    (a, b) => planFor(b).minutes - planFor(a).minutes,
  );
  if (!specs.length) throw new Error('실행할 spec 이 없습니다');
  const needShared = specs.some((s) => planFor(s).shared);

  const browser = await connectLiveBrowser();
  const page = await browser.contexts()[0]!.newPage();
  const { leftovers, vpcTotal } = await listLeftovers(page);
  if (leftovers.length) log(`(경고) 남은 테스트 리소스 ${leftovers.length}개 — 먼저 npm run stacks:check 로 확인하세요`);
  const budgetBase = VPC_CAP - vpcTotal;
  log(`계획: spec ${specs.length}개, 동시 탭 ≤${maxTabs}, VPC 여유 ${budgetBase}/${VPC_CAP}${needShared ? ' (공유 VPC 1개 포함)' : ''}`);
  for (const s of specs) {
    const p = planFor(s);
    console.log(`    ${s.padEnd(34)} ${String(p.minutes).padStart(5)}분  VPC ${p.shared ? '공유' : p.vpc}`);
  }
  const serial = specs.reduce((n, s) => n + planFor(s).minutes, 0);
  log(`직렬 예상 ${Math.round(serial)}분`);
  if (dryRun) {
    await page.close();
    await browser.close();
    return;
  }
  if (specs.some((s) => planFor(s).vpc > budgetBase - (needShared ? 1 : 0)))
    throw new Error(`VPC 여유(${budgetBase})가 부족합니다 — 남은 VPC 를 정리하세요`);

  // 공유 네트워크: 다른 spec 을 띄우기 전에 먼저 만든다(부하가 없을 때 안정적, ≈3분). 실패하면 반쯤 만든 것을 지우고 한 번 더.
  let shared: { vpc: string; subnet: string } | null = null;
  const sharedPage = needShared ? await browser.contexts()[0]!.newPage() : null;
  for (let attempt = 1; needShared && !shared && attempt <= 2; attempt++) {
    const runId = newRunId();
    const net = { vpc: `vpc-${runId}`, subnet: `sub-${runId}` };
    log(`공유 네트워크 생성 시작(${attempt}/2): ${net.vpc}`);
    try {
      await createNetwork(sharedPage!, net.vpc, net.subnet, () => undefined);
      shared = net;
      log(`공유 네트워크 준비: ${net.vpc} / ${net.subnet}`);
    } catch (e) {
      log(`(오류) 공유 네트워크 생성 실패: ${firstLine(e)} → 정리`);
      await deleteNetwork(sharedPage!, net.vpc, net.subnet, () => undefined).catch((err) =>
        log(`(경고) 반쯤 만든 공유 네트워크 정리 실패: ${firstLine(err)}`),
      );
    }
  }
  let sharedHeld = shared ? 1 : 0;

  const pending = specs.filter((s) => shared || !planFor(s).shared);
  const running = new Map<string, Promise<Result>>();
  const results: Result[] = specs.filter((s) => !pending.includes(s)).map((spec) => ({ spec, code: -1, seconds: 0 }));
  let vpcInUse = 0;
  const started = Date.now();
  const env = shared ? { SHARED_VPC: shared.vpc, SHARED_SUBNET: shared.subnet } : {};

  const canStart = (s: string): boolean => {
    const p = planFor(s);
    if (p.shared) return !!shared;
    return vpcInUse + p.vpc <= budgetBase - sharedHeld;
  };

  while (pending.length || running.size) {
    // 공유 spec 이 모두 끝났으면 공유 네트워크를 지워 VPC 한 칸을 돌려준다
    if (shared && sharedHeld && !pending.some((s) => planFor(s).shared) && ![...running.keys()].some((s) => planFor(s).shared)) {
      log(`공유 네트워크 삭제 시작: ${shared.subnet} → ${shared.vpc}`);
      await deleteNetwork(sharedPage!, shared.vpc, shared.subnet, () => undefined).catch((e) =>
        log(`(경고) 공유 네트워크 정리 실패: ${e instanceof Error ? e.message.split('\n')[0] : String(e)} → npm run stacks:cleanup`),
      );
      sharedHeld = 0;
      log('공유 네트워크 삭제 완료');
    }
    let launched = false;
    for (const s of [...pending]) {
      if (running.size >= maxTabs) break;
      if (!canStart(s)) continue;
      pending.splice(pending.indexOf(s), 1);
      vpcInUse += planFor(s).vpc;
      log(`시작 ${s} (탭 ${running.size + 1}/${maxTabs}, VPC ${vpcInUse + sharedHeld}/${budgetBase})`);
      running.set(
        s,
        runOne(s, planFor(s).shared ? env : {}).then((r) => {
          running.delete(s);
          vpcInUse -= planFor(s).vpc;
          results.push(r);
          log(`${r.code === 0 ? 'PASS' : 'FAIL'} ${s} ${Math.floor(r.seconds / 60)}분 ${r.seconds % 60}초`);
          return r;
        }),
      );
      launched = true;
      // 동시에 여러 탭이 콘솔을 처음 열면 세션 확인이 시간 초과로 떨어진다(2026-09-29) → 띄우는 간격을 둔다
      await new Promise((r) => setTimeout(r, staggerMs));
    }
    if (!launched) {
      const waits: Promise<unknown>[] = [...running.values()];
      if (!waits.length) {
        log('(오류) 띄울 수 있는 spec 이 없는데 실행 중인 것도 없습니다 — VPC 여유를 확인하세요');
        break;
      }
      await Promise.race(waits);
    }
  }
  await sharedPage?.close().catch(() => undefined);
  await page.close().catch(() => undefined);
  await browser.close();

  const wall = Math.round((Date.now() - started) / 60000);
  console.log('\n===== 병렬 스위트 결과 =====');
  for (const r of results.sort((a, b) => SUITE_ORDER.indexOf(a.spec) - SUITE_ORDER.indexOf(b.spec)))
    console.log(`  ${r.code === 0 ? 'PASS' : r.code === -1 ? 'SKIP' : 'FAIL'}  ${r.spec}  ${Math.floor(r.seconds / 60)}분 ${r.seconds % 60}초`);
  const fail = results.filter((r) => r.code !== 0).length;
  console.log(`벽시계 ${wall}분 (직렬 예상 ${Math.round(serial)}분), 통과 ${results.length - fail}/${results.length}`);
  console.log('결과 정리: npm run results · 남은 리소스: npm run stacks:check');
  process.exitCode = fail ? 1 : 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
