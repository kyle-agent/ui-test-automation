// 직접 작성 (2026-09-29). 시나리오: scenarios/financial-management/budget.yaml.
// 계정 예산 생성(알림·신규 생성 방지 끔) → 금액 수정(L3) → "⋮" 메뉴 삭제. 계정당 1개라 다른 예산이 있으면 건너뛴다.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { setGroupCheckbox } from '../../src/console/form-group';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  fillField,
  openCreateForm,
  row,
  selectRow,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/financial-management/budget.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/costmanagement/budget';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** "예산 (￦)" 칸: 입력 뒤 천 단위 쉼표로 바뀌므로 숫자만 비교한다 */
async function fillAmount(page: Page, amount: string) {
  // 키보드로 치면 쉼표가 끼어들며 커서가 밀려 자릿수가 빠진다(1000000 → 10000, 실측) → fill 로 한 번에 넣는다
  const input = await below(page, '예산 (￦)', 'input');
  for (let i = 0; i < 2; i++) {
    await input.fill(amount);
    await input.press('Tab');
    await page.keyboard.press('Escape'); // Tab 이 시작월 달력을 연다
    if ((await input.inputValue()).replace(/,/g, '') === amount) break;
  }
  const shown = (await input.inputValue()).replace(/,/g, '');
  if (shown !== amount) throw new Error(`예산 금액이 ${amount} 가 아니라 ${shown} 입니다`);
}

async function reloadList(page: Page) {
  await gotoRoute(page, ROUTE);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test.afterEach('정리 (예산 삭제)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 삭제`, async () => {
      await selectRow(page, vars.name!);
      await page.locator('button:visible:has(i.i-card-handle)').first().click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 10_000 });
      await menu.locator('.scp-menu-item').filter({ hasText: /^\s*삭제\s*$/ }).first().click();
      await confirmModal(page, /예산을 삭제하시겠습니까/, '확인');
      await waitForRow(page, ROUTE, vars.name!, { gone: true, timeoutMs: 120_000, intervalMs: 5_000, log });
      await reloadList(page);
      await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
    });
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await reloadList(page);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
      const existing = (await page.locator('tr.scp-body-row').allInnerTexts()).map((s) =>
        s.replace(/\s+/g, ' ').trim(),
      );
      test.skip(
        existing.length > 0,
        `계정에 이미 예산이 있다(계정당 1개): ${existing.map((s) => s.split(' ')[0]).join(', ')}`,
      );
    });
    await test.step(`steps[1] 예산 ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '예산 생성');
      await fillField(page, '예산명', vars.name!);
      await fillAmount(page, '1000000');
      // 기본값이 꺼져 있지만 확실히: 알림(메일)·신규 생성 방지(다른 spec 의 생성 차단)를 끈다
      await setGroupCheckbox(page, '임계치 도달 알림', false);
      await setGroupCheckbox(page, '신규 생성 방지', false);
      await submitForm(page, '생성');
      await confirmModal(page, /예산을 생성하시겠습니까/, '확인');
      await waitForRow(page, ROUTE, vars.name!, { timeoutMs: 120_000, intervalMs: 5_000, log });
      await reloadList(page);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 예산 ${vars.name} 금액 수정`, async () => {
      await selectRow(page, vars.name!);
      await topButton(page, '수정').click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/\/costmanagement\/budget\/[0-9a-f]+\/modify/, { timeout: 30_000 });
      await fillAmount(page, '2000000');
      await submitForm(page, '완료');
      await confirmModal(page, undefined, '확인');
      await waitForRow(page, ROUTE, vars.name!, {
        status: /2,000,000/,
        timeoutMs: 120_000,
        intervalMs: 5_000,
        log,
      });
      await reloadList(page);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
  });
});
