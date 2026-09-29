// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/messagehub-email.yaml.
// 목록의 주소가 가려져("mhe***@*******.com") 이름으로 행을 못 찾는다 → 검색창에 전체 주소를 넣어 거른 뒤 상세에서 확인·삭제.
// 상세 "Email 인증"(인증 메일 발송)은 누르지 않는다.
import type { Locator, Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, fillField, openCreateForm, submitForm, topButton } from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/application-service/messagehub-email.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/messagehub/email';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
/** 가려진 주소: 앞 3글자만 보인다 ("mhe***@*******.com", 2026-09-29 실측) */
const MASKED = /mhe\*+@\*+/;

/** 목록을 새로 열고 검색창에 전체 주소를 넣어 거른 뒤 가려진 행(0 또는 1개)을 돌려준다 */
async function searchRow(page: Page): Promise<Locator> {
  await gotoRoute(page, ROUTE);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  const search = page.locator('input[placeholder="Email Address를 입력하세요."]:visible').first();
  await search.fill(vars.name!);
  await search.press('Enter');
  await settleConsole(page, { appearGraceMs: 800 });
  await page
    .locator('tr.scp-body-row, :text("검색 결과가 없습니다"), :text("서비스를 생성하세요")')
    .first()
    .waitFor({ timeout: 30_000 })
    .catch(() => undefined);
  return page.locator('tr.scp-body-row').filter({ hasText: MASKED });
}

/** 걸러진 행을 눌러 상세로 가고, 상세 제목이 우리 주소인지 확인한다 */
async function openDetail(page: Page, r: Locator) {
  await r.first().getByText(MASKED).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.waitForURL(/\/messagehub\/email\/detail/, { timeout: 30_000 });
  await page.getByText(vars.name!, { exact: true }).first().waitFor({ timeout: 30_000 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test.afterEach('정리 (Email 삭제)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    let r = await searchRow(page);
    if ((await r.count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 삭제`, async () => {
      await openDetail(page, r);
      await topButton(page, 'Email 삭제').click();
      await confirmModal(page, /Email을 삭제하시겠습니까/, '확인');
      const start = Date.now();
      for (;;) {
        await page.waitForTimeout(5_000);
        r = await searchRow(page);
        if ((await r.count()) === 0) break;
        if (Date.now() - start > 120_000) throw new Error(`${vars.name} 삭제 대기 120초 초과`);
        log(`  [${Math.round((Date.now() - start) / 1000)}s] ${vars.name} 소멸 대기…`);
      }
      await gotoRoute(page, ROUTE);
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
    await test.step(`steps[1] Email ${vars.name} 등록`, async () => {
      await openCreateForm(page, ROUTE, 'Email 추가');
      await fillField(page, 'Email Address', vars.name!);
      await submitForm(page, '완료');
      await confirmModal(page, /Email을 추가하시겠습니까/, '확인');
      const start = Date.now();
      let r = await searchRow(page);
      while ((await r.count()) === 0) {
        if (Date.now() - start > 120_000) throw new Error(`${vars.name} 등장 대기 120초 초과`);
        await page.waitForTimeout(5_000);
        r = await searchRow(page);
      }
      log(`  행: ${(await r.first().innerText()).replace(/\s+/g, ' ').trim()}`);
      await openDetail(page, r);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
  });
});
