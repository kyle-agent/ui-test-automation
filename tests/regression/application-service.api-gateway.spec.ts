// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/api-gateway.yaml.
// API(Region) → 리소스 /items → GET 메서드(HTTP) → 새 스테이지로 배포(L3) → API 해지(스테이지·리소스 함께 삭제).
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { pickGroupOption } from '../../src/console/form-group';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  fillField,
  openCreateForm,
  row,
  submitForm,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/application-service/api-gateway.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/apigateway/api';
const RESOURCE_ROUTE = '#/apigateway/resource';
const STAGE_ROUTE = '#/apigateway/stage';
const RESOURCE = 'items';
const ENDPOINT = 'https://example.com';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 열린 모달의 (유일한) 텍스트 입력란에 값을 넣는다. 뒤 화면에 같은 라벨(리소스명 등)이 있어 below() 대신 모달 안에서 찾는다 */
async function modalFill(page: Page, value: string) {
  const input = visibleModal(page).locator('input[type=text]:visible').first();
  await input.fill(value);
  if ((await input.inputValue()) !== value) {
    await input.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(value, { delay: 20 });
  }
  await input.press('Tab');
  if ((await input.inputValue()) !== value) throw new Error(`모달 입력란 값이 ${value} 가 아닙니다`);
}

/** 리소스·스테이지 화면 제목 옆 API 드롭다운에서 우리 API 를 고르고 "조회" (API 가 하나면 이미 골라져 있다) */
async function selectApi(page: Page, route: string) {
  await gotoRoute(page, route);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  const query = page.getByRole('button', { name: '조회', exact: true }).first();
  const dd = page.locator('.scp-dropdown:visible:left-of(button:has-text("조회"))').first();
  await dd.click();
  const menu = page.locator('.scp-menu:visible').last();
  await menu.waitFor({ timeout: 10_000 });
  await menu.locator('.scp-menu-item').filter({ hasText: vars.name! }).first().click();
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  await query.click();
  await settleConsole(page, { appearGraceMs: 800 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 25 * 60_000 });

  test.afterEach('정리 (API 해지)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 해지`, async () => {
      // Creating 중에는 해지가 안 될 수 있다 → Active 까지 기다린다
      await waitForRow(page, ROUTE, vars.name!, { status: /Active|Error|Failed/i, timeoutMs: 600_000, intervalMs: 15_000, log });
      await row(page, vars.name!).getByRole('button', { name: '서비스 해지', exact: true }).click();
      await confirmModal(page, /해지하시겠습니까/, '확인', { agree: true, resourceName: vars.name });
      await waitForRow(page, ROUTE, vars.name!, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
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
      await gotoRoute(page, ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] API ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '서비스 생성');
      await fillField(page, 'API명', vars.name!);
      await pickGroupOption(page, 'API 엔드포인트 유형', 'Region');
      await submitForm(page, '생성');
      await confirmModal(page, /API를 생성하시겠습니까/, '확인');
      await waitForRow(page, ROUTE, vars.name!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 리소스 /${RESOURCE} 생성`, async () => {
      await selectApi(page, RESOURCE_ROUTE);
      await page.getByRole('button', { name: '리소스 생성', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('리소스명').first().waitFor({ timeout: 10_000 });
      await modalFill(page, RESOURCE);
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /리소스를 생성하시겠습니까/, '확인');
      await page.getByText(`/${RESOURCE}`, { exact: true }).first().waitFor({ timeout: 30_000 });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] /${RESOURCE} GET 메서드 생성`, async () => {
      await page.getByText(`/${RESOURCE}`, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByRole('button', { name: '메서드 생성', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('메서드 유형').first().waitFor({ timeout: 10_000 });
      await modal.locator('.scp-dropdown:visible').first().click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 10_000 });
      await menu.locator('.scp-menu-item').filter({ hasText: /^\s*GET\s*$/ }).first().click();
      await modal.locator('.scp-select').filter({ hasText: /^\s*HTTP\s*$/ }).first().click();
      await modal.getByText('엔드포인트 URL').first().waitFor({ timeout: 10_000 });
      await modalFill(page, ENDPOINT);
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /메서드를 생성하시겠습니까/, '확인');
      await page.waitForURL(/methodType=GET/, { timeout: 30_000 });
      await page.getByText(ENDPOINT, { exact: true }).first().waitFor({ timeout: 30_000 });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] 스테이지 ${vars.stage} 로 배포`, async () => {
      await page.getByRole('button', { name: 'API 배포', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('신규 스테이지명').first().waitFor({ timeout: 10_000 });
      await modalFill(page, vars.stage!);
      await modal.getByRole('button', { name: '배포', exact: true }).click();
      await confirmModal(page, /배포하시겠습니까/, '확인');
      await page.waitForTimeout(2_000);
      await selectApi(page, STAGE_ROUTE);
      await page.getByText(vars.stage!, { exact: true }).first().waitFor({ timeout: 30_000 });
      await page.getByText(vars.stage!, { exact: true }).first().click(); // 트리에서 스테이지 선택 → 배포 이력 표
      await settleConsole(page, { appearGraceMs: 800 });
      await page.locator('tr.scp-body-row').filter({ hasText: 'Active' }).first().waitFor({ timeout: 60_000 });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
  });
});
