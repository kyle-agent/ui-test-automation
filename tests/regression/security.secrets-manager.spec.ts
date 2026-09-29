// 직접 작성 (2026-09-29). 시나리오: scenarios/security/secrets-manager.yaml.
// 시크릿은 즉시 삭제가 없다: 해지 대기 기간(최소 7일) 예약 → "To be terminated". 상세 "해지 취소" 로 되돌리는 동작까지 확인(L3).
// 시크릿 값은 run_id 로 만들고 로그·오류 메시지에 넣지 않는다.
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
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/security/secrets-manager.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/secretsmanager/secretsmanager/list';
const SCHEDULED = /To be terminated/;
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({ consoleTitle: CONSOLE_CHECKS, scenario: scenario.id, step, testInfo: test.info() });

/** 목록에서 행 선택 → 상단 "서비스 해지" → 대기 기간 7일 → 확인 → 행이 To be terminated 가 될 때까지 */
async function scheduleTermination(page: Page) {
  await gotoRoute(page, ROUTE);
  await selectRow(page, vars.name!);
  await topButton(page, '서비스 해지').click();
  const modal = visibleModal(page);
  await modal.getByText('해지 대기 기간').first().waitFor({ timeout: 10_000 });
  const days = modal.locator('input:visible').first();
  await days.fill('7');
  await days.press('Tab');
  if ((await days.inputValue()) !== '7') {
    await days.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('7');
    await page.keyboard.press('Tab');
  }
  await confirmModal(page, /해지하시겠습니까/, '확인');
  await waitForRow(page, ROUTE, vars.name!, { status: SCHEDULED, timeoutMs: 120_000, intervalMs: 5_000, log });
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test.afterEach('정리 (해지 예약)', async ({ page }) => {
    test.info().annotations.push({ type: 'scenario', description: scenario.id }, { type: 'phase', description: 'teardown' });
    await gotoRoute(page, ROUTE);
    const r = row(page, vars.name!);
    if ((await r.count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 해지 예약`, async () => {
      const text = await r.first().innerText().catch(() => '');
      if (!SCHEDULED.test(text)) await scheduleTermination(page);
      await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
    });
  });

  test(scenario.title, async ({ page }) => {
    test.info().annotations.push({ type: 'scenario', description: scenario.id }, { type: 'run_id', description: vars.run_id! });
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '서비스 생성');
      await fillField(page, 'Secret명', vars.name!);
      await fillField(page, 'Key', 'qa');
      // Value 칸은 Key 칸 바로 오른쪽 다음 input. 프로그램식 fill 이 가끔 안 먹어 키보드로 보강한다(ui.ts fillField 와 같은 이유)
      const secretValue = `v${vars.run_id_compact}`; // 기록 금지
      const valueInput = (await below(page, 'Key', 'input')).locator('xpath=following::input[1]');
      await valueInput.fill(secretValue);
      if ((await valueInput.inputValue()) !== secretValue) {
        await valueInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.type(secretValue, { delay: 20 });
      }
      await valueInput.press('Tab');
      if ((await valueInput.inputValue()) !== secretValue) throw new Error('Value 입력란에 값이 들어가지 않았습니다');
      await pickOption(page, '암호화 키', 'scp/secretsmanager');
      await setGroupCheckbox(page, '프라이빗 접근 제어', false);
      await fillField(page, '퍼블릭 접근 허용 IP', '192.0.2.10/32');
      // "추가" 버튼: Key/Value 추가(0) · IP 추가(1) · 프라이빗 리소스 추가(꺼져서 숨김)
      await page.getByRole('button', { name: '추가', exact: true }).nth(1).click();
      await page.getByText('192.0.2.10/32', { exact: true }).first().waitFor({ timeout: 5_000 });
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/, '확인');
      await waitForRow(page, ROUTE, vars.name!, { status: /Active/, timeoutMs: 180_000, intervalMs: 10_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] ${vars.name} 해지 예약 (7일)`, async () => {
      await scheduleTermination(page);
      log(`  행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').trim()}`);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] 상세 "해지 취소" → Active`, async () => {
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '해지 취소').click();
      await confirmModal(page, /해지를 취소하시겠습니까/, '확인');
      await topButton(page, '서비스 해지').waitFor({ timeout: 30_000 });
      await waitForRow(page, ROUTE, vars.name!, { status: /Active/, timeoutMs: 120_000, intervalMs: 5_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
  });
});
