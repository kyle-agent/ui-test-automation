// 직접 작성 (2026-09-29). 시나리오: scenarios/management/network-logging.yaml.
// Object Storage 버킷 → Firewall Logging 로그 저장소로 적용 → 미사용으로 해제 → 버킷 해지.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  row,
  selectRow,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/management/network-logging.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/network-logging/firewall-logging/list';
const BUCKET_ROUTE = '#/objectstorage/objectstorage/list';
const OFF = '미사용';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 화면 위 로그 저장소 드롭다운(현재 값이 보인다)에서 항목을 고르고 "적용" → 확인 */
async function setStorage(page: Page, from: string, to: string, confirmText: RegExp) {
  await gotoRoute(page, ROUTE);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  const dd = page.locator('.scp-dropdown:visible').filter({ hasText: from }).first();
  await dd.click();
  const menu = page.locator('.scp-menu:visible').last();
  await menu.waitFor({ timeout: 10_000 });
  const item = menu.locator('.scp-menu-item').filter({ hasText: to }).first();
  if (!(await item.count()))
    throw new Error(`로그 저장소 드롭다운에 ${to} 가 없습니다: ${JSON.stringify(await menu.allInnerTexts())}`);
  await item.click();
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  await page.getByRole('button', { name: '적용', exact: true }).first().click();
  await confirmModal(page, confirmText, '확인');
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
}

async function currentStoragePath(page: Page): Promise<boolean> {
  await gotoRoute(page, ROUTE);
  await page.waitForTimeout(1_000);
  return (await page.getByText(`${vars.bucket}/LOG/FW`).count()) > 0;
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test.afterEach('정리 (저장소 해제 → 버킷 해지)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    const errors: string[] = [];
    const attempt = async (what: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${what}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
        log(`  정리 실패 ${errors[errors.length - 1]}`);
      }
    };
    await attempt('로그 저장소 해제', () =>
      test.step('teardown[0] 로그 저장소 미사용', async () => {
        if (await currentStoragePath(page))
          await setStorage(page, vars.bucket!, OFF, /해제하시겠습니까/);
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      }),
    );
    await attempt('버킷 해지', () =>
      test.step(`teardown[1] ${vars.bucket} 해지`, async () => {
        await gotoRoute(page, BUCKET_ROUTE);
        if ((await row(page, vars.bucket!).count()) === 0) return;
        const inRow = row(page, vars.bucket!).getByRole('button', { name: '서비스 해지', exact: true });
        if (await inRow.count()) await inRow.click();
        else {
          await selectRow(page, vars.bucket!);
          await topButton(page, '서비스 해지').click();
        }
        await confirmModal(page, /해지/, '확인', { agree: true, resourceName: vars.bucket });
        await waitForRow(page, BUCKET_ROUTE, vars.bucket!, {
          gone: true,
          timeoutMs: 180_000,
          intervalMs: 10_000,
          log,
        });
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      }),
    );
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
      await gotoRoute(page, ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] 버킷 ${vars.bucket} 생성`, async () => {
      await openCreateForm(page, BUCKET_ROUTE, '서비스 생성');
      await fillField(page, '버킷명', vars.bucket!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, BUCKET_ROUTE, vars.bucket!, { timeoutMs: 180_000, intervalMs: 10_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Firewall 로그 저장소 = ${vars.bucket}`, async () => {
      await setStorage(page, OFF, vars.bucket!, /로그 저장소를 수정하시겠습니까/);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step('steps[3] Firewall 로그 저장소 미사용', async () => {
      await setStorage(page, vars.bucket!, OFF, /해제하시겠습니까/);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
  });
});
