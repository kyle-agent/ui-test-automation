// 직접 작성 (2026-09-23). 시나리오: scenarios/networking/vpc-peering.yaml.
// VPC 2개 → VPC Peering(동일 Account) → 규칙 추가·삭제(2026-09-30 에이전트 B) → 상세에서 삭제 → VPC 해지. 콘솔 사실은 yaml 머리 주석.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { openDetailTab } from '../../src/console/networking';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/vpc-peering.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

const rules = (page: Page) => openDetailTab(page, ROUTES.peer, vars.name!, /^규칙 \(/);

/** 규칙 탭에서 이 실행의 규칙(목적지 peer_dest)을 지우고 사라질 때까지 기다린다. 없으면 건너뜀. */
async function deleteRule(page: Page): Promise<void> {
  const tab = await rules(page);
  // 탭 표가 늦게 채워진다(2026-09-30 TGW 규칙에서 "행 없음" 오판) → 탭 이름 "규칙 (n)" 으로 판단하고 n > 0 이면 행을 기다린다
  const label = (await page.getByText(/^규칙 \(\d+\)/).first().innerText().catch(() => '')).trim();
  if (/\(0\)/.test(label)) return;
  const shown = await waitForRow(page, tab, vars.peer_dest!, { timeoutMs: 60_000, intervalMs: 10_000, log }).then(
    () => true,
    () => false,
  );
  if (!shown) return;
  await waitForRow(page, tab, vars.peer_dest!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
  await selectRow(page, vars.peer_dest!);
  await topButton(page, '삭제').click();
  await confirmModal(page, /규칙을 삭제하시겠습니까/);
  await waitForRow(page, tab, vars.peer_dest!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
}

async function createVpc(page: Parameters<typeof gotoRoute>[0], name: string, cidr: string) {
  await openCreateForm(page, ROUTES.vpc, '서비스 생성');
  await fillField(page, 'VPC명', name);
  await fillField(page, 'IP 대역', cidr);
  await submitForm(page, '생성');
  await confirmModal(page, /생성하시겠습니까/);
  await waitForRow(page, ROUTES.vpc, name, { status: /Active/, timeoutMs: 180_000, log });
}

// 실측(2026-09-23): Peering 을 지운 직후의 VPC 해지는 확인을 눌러도 조용히 무시된다(행이 Active 로 남음). 잠시 뒤 다시 누르면 "VPC 해지가 성공하였습니다" → 최대 5회 재시도.
async function deleteVpc(page: Parameters<typeof gotoRoute>[0], name: string) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await gotoRoute(page, ROUTES.vpc);
    if ((await row(page, name).count()) === 0) return;
    await row(page, name).getByRole('button', { name: '서비스 해지', exact: true }).click();
    await confirmModal(page, /해지하시겠습니까/);
    try {
      await waitForRow(page, ROUTES.vpc, name, { gone: true, timeoutMs: 60_000, intervalMs: 15_000, log });
      return;
    } catch {
      log(`  VPC ${name} 해지 재시도 ${attempt}/5 (아직 Active)`);
    }
  }
  await waitForRow(page, ROUTES.vpc, name, { gone: true, timeoutMs: 120_000, intervalMs: 15_000, log });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 40 * 60_000 });

  test.afterEach('정리 (역순: Peering → VPC 2개)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    const errors: string[] = [];
    const attempt = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
        log(`  정리 실패 ${name}: ${errors[errors.length - 1]}`);
      }
    };
    await attempt('Peering 삭제', async () => {
      await gotoRoute(page, ROUTES.peer);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] VPC Peering ${vars.name} 삭제`, async () => {
        // Creating 동안은 삭제가 막힐 수 있어 Active 를 기다린다
        await waitForRow(page, ROUTES.peer, vars.name!, {
          status: /Active/i,
          timeoutMs: 300_000,
          intervalMs: 15_000,
          log,
        });
        await deleteRule(page); // 본 단계가 중간에 실패했을 때만 남아 있다
        await gotoRoute(page, ROUTES.peer);
        await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, 'VPC Peering 삭제').click();
        await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTES.peer, vars.name!, {
          gone: true,
          timeoutMs: 300_000,
          intervalMs: 15_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('VPC 해지', async () => {
      await test.step(`teardown[1] VPC ${vars.vpc_a}, ${vars.vpc_b} 해지`, async () => {
        await deleteVpc(page, vars.vpc_a!);
        await deleteVpc(page, vars.vpc_b!);
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      });
    });
    if (errors.length) throw new Error(`정리 중 실패 (남은 리소스를 확인하세요):\n${errors.join('\n')}`);
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, ROUTES.vpc);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc_a}, ${vars.vpc_b} 생성`, async () => {
      await createVpc(page, vars.vpc_a!, vars.cidr_a!);
      await createVpc(page, vars.vpc_b!, vars.cidr_b!);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] VPC Peering ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTES.peer, 'VPC Peering 생성');
      await fillField(page, 'VPC Peering명', vars.name!);
      await pickOption(page, '요청 VPC명', vars.vpc_a!);
      const same = page.getByRole('button', { name: '동일 Account', exact: true }).first();
      if (await same.count()) await same.click();
      await pickOption(page, '승인 VPC명', vars.vpc_b!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.peer, vars.name!, {
        status: /Active/i,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      log(
        `  Peering 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] 규칙 추가 (요청 VPC → 승인 VPC ${vars.peer_dest})`, async () => {
      const tab = await rules(page);
      await page.getByRole('button', { name: '규칙 추가', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.waitFor();
      await pickOption(page, '출발지', '요청 VPC'); // 모달 안, 목적지는 자동으로 승인 VPC
      await fillStable(page, modal.locator('input[type=text]:visible').last(), vars.peer_dest!, '목적지 IP 대역');
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /규칙을 추가하시겠습니까/);
      await waitForRow(page, tab, vars.peer_dest!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      log(`  규칙 행: ${(await row(page, vars.peer_dest!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] 규칙 ${vars.peer_dest} 삭제`, async () => {
      await deleteRule(page);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
  });
});
