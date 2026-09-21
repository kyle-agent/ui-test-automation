/**
 * Jev 기록 러너 CLI. 시나리오의 각 step goal 을 Jev 에게 주고, 고른 동작을 실행하며, expect 를 코드로 판정해 트레이스를 남긴다.
 *
 *   npm run record -- scenarios/networking/vpc-create-delete.yaml [옵션]
 *
 * 옵션
 *   --confirm            동작마다 터미널에서 y(실행) / n(이 후보 제외하고 다시) / q(중단) 를 묻는다. 첫 기록 때 권장
 *   --dry-run            Jev 의 첫 선택만 보여주고 실행하지 않는다
 *   --steps 0,1          실행할 step 인덱스 (teardown 은 --no-teardown 이 없으면 항상 실행)
 *   --no-teardown        teardown 을 건너뛴다 (리소스가 남을 수 있다!)
 *   --budget 12          step 당 최대 동작 수
 *   --run-id 0921-1305   {{run_id}} 를 고정한다 (teardown 만 다시 돌릴 때)
 *   --launch [--headed]  PW_CDP_URL 대신 새 브라우저를 띄운다 (storageState 파일이 있으면 사용)
 *   --base-url file:///…/fake-vpc.html   콘솔 대신 픽스처 페이지에 대해 돌린다 (파이프라인 검증용)
 *   --out recordings/<id>
 *
 * 결과: <out>/trace.json, <out>/screenshots/*.jpg. 다음 단계: npm run gen:spec -- <out>/trace.json
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { connectLiveBrowser, liveContext, usingLiveBrowser } from '../src/console/browser';
import { sessionFile } from '../src/console/env';
import { recordScenario, type ConfirmRequest } from '../src/jev/recorder';
import { loadScenario } from '../src/scenario/schema';
import { parseArgs } from '../src/service-map/io';

async function main(): Promise<void> {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const file = positional[0];
  if (!file)
    throw new Error(
      '사용법: npm run record -- <scenario.yaml> [--confirm] [--dry-run] [--steps 0,1] [--launch --headed]',
    );
  const scenario = loadScenario(file);
  const outDir = typeof flags.out === 'string' ? flags.out : path.join('recordings', scenario.id);
  const baseUrl = typeof flags['base-url'] === 'string' ? flags['base-url'] : undefined;
  const steps =
    typeof flags.steps === 'string' ? flags.steps.split(',').map((s) => Number(s.trim())) : undefined;

  let browser: Browser;
  let context: BrowserContext;
  let live = false;
  if (usingLiveBrowser() && !flags.launch && !baseUrl) {
    browser = await connectLiveBrowser();
    context = liveContext(browser);
    live = true;
  } else {
    browser = await chromium.launch({
      headless: !flags.headed,
      channel: process.env.PW_CHANNEL || undefined,
    });
    const state = sessionFile();
    context = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      viewport: { width: 1440, height: 900 },
      storageState: !baseUrl && fs.existsSync(state) ? state : undefined,
    });
  }
  const page = await context.newPage();
  const rl = flags.confirm
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const confirm = rl
    ? async (req: ConfirmRequest): Promise<'yes' | 'no' | 'quit'> => {
        const what = req.action
          ? `${req.decision.operation} [${req.action.id}] ${req.action.role ?? req.action.kind} "${req.action.label}"`
          : req.decision.operation;
        const answer = (
          await rl.question(
            `  실행할까요? ${what}${req.text !== null ? ` 값=${JSON.stringify(req.text)}` : ''}  [y/n/q] `,
          )
        )
          .trim()
          .toLowerCase();
        return answer === 'y' || answer === 'yes'
          ? 'yes'
          : answer === 'q' || answer === 'quit'
            ? 'quit'
            : 'no';
      }
    : undefined;

  console.log(`시나리오: ${scenario.id} (${scenario.title})`);
  console.log(
    `브라우저: ${live ? `살아 있는 로그인 브라우저 (${process.env.PW_CDP_URL})` : baseUrl ? `새 브라우저, base ${baseUrl}` : '새 브라우저 + storageState'}`,
  );
  console.log(`출력: ${outDir}${flags['dry-run'] ? ' (dry-run)' : ''}`);
  try {
    const trace = await recordScenario({
      scenario,
      page,
      outDir,
      runId: typeof flags['run-id'] === 'string' ? flags['run-id'] : undefined,
      budget: typeof flags.budget === 'string' ? Number(flags.budget) : undefined,
      steps,
      runTeardown: !flags['no-teardown'],
      dryRun: !!flags['dry-run'],
      baseUrl,
      confirm,
      log: (line) => console.log(line),
    });
    console.log(
      `\n결과: ${trace.status}  (Jev 결정 ${trace.totals.decisions}회, 동작 ${trace.totals.actions}회, 비용 $${trace.totals.cost.toFixed(5)})`,
    );
    console.log(`트레이스: ${path.join(outDir, 'trace.json')}`);
    for (const s of trace.steps)
      console.log(
        `  ${s.phase}[${s.index}] ${s.result.padEnd(8)} ${s.goal_resolved}${s.failures.length ? `  ← ${s.failures.join(' / ')}` : ''}`,
      );
    if (trace.status === 'passed')
      console.log(`다음: npm run gen:spec -- ${path.join(outDir, 'trace.json')}`);
    process.exitCode = trace.status === 'passed' ? 0 : 1;
  } finally {
    rl?.close();
    await page.close().catch(() => undefined);
    if (live) await browser.close().catch(() => undefined);
    else await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
