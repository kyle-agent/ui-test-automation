// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/direct-connect.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → Direct Connect(콘솔 자원만, 물리 회선 신청 아님) → 라우팅 규칙 추가·삭제(L3) → 해지 → VPC 해지.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { confirmUntil, createVpcOnly, openDetailTab, pickLate } from '../../src/console/networking';
import {
  confirmModal,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  setCheckbox,
  submitForm,
  terminateVpc,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/direct-connect.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const DEST = '11.11.11.0/24';
const rules = (page: Page) => openDetailTab(page, ROUTES.dc, vars.name!, /^규칙 \(/);

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 40 * 60_000 });

  test.afterEach('정리 (역순: Direct Connect → VPC)', async ({ page }) => {
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
    await attempt('Direct Connect 해지', async () => {
      await gotoRoute(page, ROUTES.dc);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] Direct Connect ${vars.name} 해지`, async () => {
        await waitForRow(page, ROUTES.dc, vars.name!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
        await row(page, vars.name!).getByRole('button', { name: '서비스 해지', exact: true }).click();
        await confirmModal(page, /Direct Connect를 해지하시겠습니까/);
        await waitForRow(page, ROUTES.dc, vars.name!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
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
      await gotoRoute(page, ROUTES.dc);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc} 생성`, async () => {
      await createVpcOnly(page, vars.vpc!, log);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Direct Connect ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTES.dc, '서비스 생성');
      await fillField(page, 'Direct Connect명', vars.name!);
      await pickLate(page, 'VPC명', new RegExp(vars.vpc!), log);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await setCheckbox(page, 'Firewall 사용', false);
      await setCheckbox(page, 'Firewall 로그 저장 여부', false);
      await submitForm(page, '생성');
      await confirmUntil(page, /Direct Connect를 생성하시겠습니까/, log); // 앞에 Firewall 미사용 경고가 온다
      await waitForRow(page, ROUTES.dc, vars.name!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] 규칙 추가 (원격지 ${DEST})`, async () => {
      const tab = await rules(page);
      await page.getByRole('button', { name: '규칙 추가', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.waitFor();
      await pickOption(page, '목적지', '원격지'); // 모달 안 (Escape 로 닫히지 않게 재시도 없이)
      const input = modal.locator('input[type=text]:visible').first();
      await input.fill(DEST);
      await input.press('Tab');
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /규칙을 추가하시겠습니까/);
      await waitForRow(page, tab, DEST, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      log(`  규칙 행: ${(await row(page, DEST).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step('steps[4] 규칙 삭제', async () => {
      const tab = await rules(page);
      await selectRow(page, DEST);
      await topButton(page, '삭제').click();
      await confirmModal(page, /규칙을 삭제하시겠습니까/);
      await waitForRow(page, tab, DEST, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
  });
});
