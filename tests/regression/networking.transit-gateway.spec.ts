// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/transit-gateway.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → Transit Gateway → VPC 연결 추가(L3) → 연결 해제 → TGW 삭제 → VPC 해지.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { createVpcOnly, openDetailTab } from '../../src/console/networking';
import {
  confirmModal,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  terminateVpc,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/transit-gateway.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const connections = (page: Page) => openDetailTab(page, ROUTES.tgw, vars.tgw!, /^연결 VPC 관리/);

/** 연결 VPC 관리 탭에서 이 실행의 VPC 연결을 해제하고 사라질 때까지 기다린다. */
async function detachVpc(page: Page): Promise<void> {
  const tab = await connections(page);
  if ((await row(page, vars.vpc!).count()) === 0) return;
  await waitForRow(page, tab, vars.vpc!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
  await selectRow(page, vars.vpc!);
  await topButton(page, '삭제').click();
  await confirmModal(page, /VPC 연결을 삭제하시겠습니까/);
  await waitForRow(page, tab, vars.vpc!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 45 * 60_000 });

  test.afterEach('정리 (역순: VPC 연결 → TGW → VPC)', async ({ page }) => {
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
    await attempt('TGW 삭제', async () => {
      await gotoRoute(page, ROUTES.tgw);
      if ((await row(page, vars.tgw!).count()) === 0) return;
      await test.step(`teardown[0] Transit Gateway ${vars.tgw} 삭제`, async () => {
        await detachVpc(page); // 본 단계가 중간에 실패했을 때만 남아 있다
        await waitForRow(page, ROUTES.tgw, vars.tgw!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
        await selectRow(page, vars.tgw!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /Transit Gateway를 삭제하시겠습니까/);
        await waitForRow(page, ROUTES.tgw, vars.tgw!, { gone: true, timeoutMs: 900_000, intervalMs: 15_000, log });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('VPC 해지', async () => {
      await test.step(`teardown[1] VPC ${vars.vpc} 해지`, async () => {
        await terminateVpc(page, ROUTES.vpc, vars.vpc!, log);
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
      await gotoRoute(page, ROUTES.tgw);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc} 생성`, async () => {
      await createVpcOnly(page, vars.vpc!, log);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Transit Gateway ${vars.tgw} 생성`, async () => {
      await openCreateForm(page, ROUTES.tgw, 'Transit Gateway 생성');
      await fillField(page, 'Transit Gateway명', vars.tgw!);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '생성');
      await confirmModal(page, /Transit Gateway를 생성하시겠습니까/);
      await waitForRow(page, ROUTES.tgw, vars.tgw!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] VPC 연결 추가 (${vars.vpc})`, async () => {
      const tab = await connections(page);
      await page.getByRole('button', { name: 'VPC 연결 추가', exact: true }).first().click();
      await visibleModal(page).waitFor();
      await pickOption(page, '연결 VPC명', vars.vpc!); // 모달 안
      await visibleModal(page).getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /VPC 연결을 추가하시겠습니까/);
      await waitForRow(page, tab, vars.vpc!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step('steps[4] VPC 연결 해제', async () => {
      await detachVpc(page);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
  });
});
