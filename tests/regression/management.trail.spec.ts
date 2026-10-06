// 직접 작성 (2026-10-06). 시나리오: scenarios/management/trail.yaml.
// Object Storage 버킷 → Trail 생성(Active) → 상세에서 중지(L3) → Trail 삭제 → 버킷 해지.
// 버킷은 "저장된 데이터가 없을 때만" 해지되므로 Trail 을 오래 켜 두지 않는다(생성 → 삭제 수 분).
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/management/trail.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/loggingaudit/trail';
const BUCKET_ROUTE = '#/objectstorage/objectstorage/list';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 목록에서 Trail 이름을 눌러 상세(#/loggingaudit/trail/<id>/info)로 들어간다 */
async function openDetail(page: Page): Promise<void> {
  await gotoRoute(page, ROUTE);
  await waitForRow(page, ROUTE, vars.name!, { timeoutMs: 60_000, intervalMs: 5_000, log });
  await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await topButton(page, 'Trail 삭제').waitFor({ timeout: 30_000 });
}

async function deleteTrail(page: Page): Promise<void> {
  await openDetail(page);
  await topButton(page, 'Trail 삭제').click();
  await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.name });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await waitForRow(page, ROUTE, vars.name!, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test.afterEach('정리 (Trail 삭제 → 버킷 해지)', async ({ page }) => {
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
    await attempt('Trail 삭제', async () => {
      await gotoRoute(page, ROUTE);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] ${vars.name} 삭제`, async () => {
        await deleteTrail(page);
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('버킷 해지', async () => {
      await gotoRoute(page, BUCKET_ROUTE);
      if ((await row(page, vars.bucket!).count()) === 0) return;
      await test.step(`teardown[1] ${vars.bucket} 해지`, async () => {
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
    await test.step(`steps[2] Trail ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, 'Trail 생성');
      await fillField(page, 'Trail명', vars.name!);
      await pickOption(page, '저장 버킷', vars.bucket!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, vars.name!, {
        status: /Active/,
        timeoutMs: 180_000,
        intervalMs: 10_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] Trail ${vars.name} 중지`, async () => {
      await openDetail(page);
      // topButton('중지') 는 못 잡는다(버튼 텍스트 노드가 정규식 ^중지$ 와 안 맞음) → 역할 이름으로
      await page.getByRole('button', { name: '중지', exact: true }).click();
      await confirmModal(page, /중지/, '확인', { agree: true, resourceName: vars.name });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      // 확인 모달 "Trail을 중지 하시겠습니까?" → 목록 상태 Active → Stopped (2026-10-06 실측)
      await gotoRoute(page, ROUTE);
      await waitForRow(page, ROUTE, vars.name!, {
        status: /Stopped/,
        timeoutMs: 120_000,
        intervalMs: 10_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] Trail ${vars.name} 삭제`, async () => {
      await deleteTrail(page);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
  });
});
