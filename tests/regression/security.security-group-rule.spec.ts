// 직접 작성 (2026-09-28). 시나리오: scenarios/security/security-group-rule.yaml. 콘솔 사실은 yaml 머리 주석.
import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  dismissModalIfAny,
  fillField,
  isChecked,
  openCreateForm,
  row,
  setCheckbox,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/security/security-group-rule.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 상세 → "규칙 (n)" 탭 */
async function openRulesTab(page: Parameters<typeof gotoRoute>[0]) {
  await gotoRoute(page, ROUTES.sg);
  await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page
    .getByText(/^규칙 \(\d+\)$/)
    .first()
    .click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.waitForTimeout(800);
}
const ruleRow = (page: Parameters<typeof gotoRoute>[0]) =>
  page.locator('tr.scp-body-row').filter({ hasText: vars.cidr! });

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@action', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

  test.afterEach('정리', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await gotoRoute(page, ROUTES.sg);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] Security Group ${vars.name} 해지`, async () => {
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지하시겠습니까/);
      await waitForRow(page, ROUTES.sg, vars.name!, { gone: true, timeoutMs: 120_000, log });
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
      await gotoRoute(page, ROUTES.sg);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] Security Group ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTES.sg, '서비스 생성');
      await fillField(page, 'Security Group명', vars.name!);
      await setCheckbox(page, '로그 저장 여부', false);
      await submitForm(page, '생성');
      await confirmModal(page, /진행하시겠습니까/);
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.sg, vars.name!, { timeoutMs: 60_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 규칙 추가 (Inbound, ${vars.cidr}, ALL)`, async () => {
      await openRulesTab(page);
      await page.getByRole('button', { name: '규칙 추가', exact: true }).click();
      await settleConsole(page, { appearGraceMs: 1000 });
      await page.waitForTimeout(800);
      // 대상 입력 방법은 기본 CIDR. "대상 주소" 라벨 아래 입력란.
      await fillField(page, '대상 주소', vars.cidr!);
      // 유형은 기본 "목적지 포트/Type 선택". 프로토콜 TCP 체크박스를 켜면 그 아래 "목적지 포트" 입력란과 "추가" 버튼이 나타난다(2026-09-28 프로브).
      // "ALL" 을 고르면 경고 모달이 뜨므로 쓰지 않는다.
      const tcpBox = page.locator('.scp-select:visible').filter({ hasText: /^TCP$/ }).first();
      if (!(await isChecked(tcpBox))) await tcpBox.click();
      await page.waitForTimeout(500);
      // 포트 입력란은 라벨·placeholder 가 없다("1~65,535 …" 는 힌트 텍스트). 보이는 텍스트 입력란 순서: 헤더 검색창 → 대상 주소 → 포트 (2026-09-28 프로브)
      const port = page.locator('input[type=text]:visible').nth(2);
      await port.fill('22');
      await port.press('Tab');
      await expect(port, '포트 입력값이 남아 있어야 합니다').toHaveValue('22');
      await page.getByRole('button', { name: '추가', exact: true }).first().click({ force: true }); // 값을 넣으면 활성화된다
      await page.waitForTimeout(500);
      log(
        `  유형 절: ${(await page.locator('body').innerText()).replace(/\s+/g, ' ').match(/유형.{0,300}/)?.[0]}`,
      );
      const inbound = page
        .locator('.scp-select:visible')
        .filter({ hasText: /^Inbound 규칙$/ })
        .first();
      if ((await inbound.count()) && !(await isChecked(inbound))) await inbound.click();
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '완료');
      const m = visibleModal(page);
      if (await m.isVisible().catch(() => false)) {
        log(`  완료 모달: ${(await m.innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
        await confirmModal(page, /추가|규칙|완료/, '확인', { agree: true });
      }
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await settleConsole(page, { appearGraceMs: 800 });
      if (!(await ruleRow(page).count())) await openRulesTab(page);
      await expect(ruleRow(page).first(), '추가한 규칙이 규칙 탭에 보여야 합니다').toBeVisible({
        timeout: 30_000,
      });
      log(`  규칙 행: ${(await ruleRow(page).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step('steps[3] 규칙 삭제', async () => {
      if (!(await ruleRow(page).count())) await openRulesTab(page);
      const r = ruleRow(page).first();
      const inRow = r.getByRole('button', { name: '삭제', exact: true });
      if (await inRow.count()) await inRow.click();
      else {
        await r.locator('i.table-select, .scp-select, input[type=checkbox]').first().click();
        // 상단 "삭제" 가 없으면 ⋮ 메뉴 안에 있다
        const del = page.getByRole('button', { name: '삭제', exact: true });
        if (await del.count()) await del.first().click();
        else {
          // 규칙 탭 상단의 이름 없는 ⋮ 버튼 안에 있다
          const kebab = page.locator('button:visible').filter({ hasNotText: /\S/ }).first();
          await kebab.click();
          await page.locator('.scp-menu:visible .scp-menu-item').filter({ hasText: /삭제/ }).first().click();
        }
      }
      await confirmModal(page, /삭제/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await expect.poll(async () => ruleRow(page).count(), { timeout: 60_000, intervals: [3_000] }).toBe(0);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
  });
});
