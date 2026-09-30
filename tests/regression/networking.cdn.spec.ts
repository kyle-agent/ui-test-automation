// 직접 작성 (2026-09-30). 시나리오: scenarios/networking/cdn.yaml. 콘솔 사실은 yaml 머리 주석.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { deleteCdn } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  openCreateForm,
  row,
  submitForm,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const ROUTE = '#/cdn/cdn/list';
const scenario = loadScenario('scenarios/networking/cdn.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

const rowText = async (page: Page) =>
  (
    await row(page, vars.name!)
      .first()
      .innerText({ timeout: 5_000 })
      .catch(() => '')
  )
    .replace(/\s+/g, ' ')
    .trim();

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud'] }, () => {
  // 배포(설정 버전 Pending) 대기가 길 수 있다
  test.describe.configure({ mode: 'serial', timeout: 90 * 60_000 });

  test.afterEach('정리', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] CDN ${vars.name} 해지`, async () => {
      // 배포("CDN 설정 버전 n Pending") 중엔 상세 버튼이 모두 비활성 → 끝날 때까지 기다린 뒤 (중지 →) 서비스 해지
      await deleteCdn(page, vars.name!, log);
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
    await test.step(`steps[1] CDN ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '서비스 생성');
      await fillField(page, 'CDN명', vars.name!);
      await fillField(page, 'CDN 도메인', vars.name!);
      // 원본 도메인 칸은 라벨 연결이 없다(formlabel 없음, formid=cdn_origin_hostname)
      await fillStable(page, page.locator('input[formid=cdn_origin_hostname]:visible'), 'example.com', '원본 위치');
      await page.getByRole('button', { name: 'HTTP', exact: true }).first().click();
      await fillField(page, 'Port 번호', '80');
      await fillField(page, 'Cache 만료시간', '86400');
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, vars.name!, { timeoutMs: 300_000, intervalMs: 10_000, log });
      log(`  CDN 행: ${await rowText(page)}`);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
  });
});
