// 직접 작성 (2026-09-23). 시나리오: scenarios/networking/dns-hosted-zone.yaml.
// Private DNS(Active) → Hosted Zone(Private, .com) 생성 → 행 삭제 → Private DNS 상세 서비스 해지. 콘솔 사실은 yaml 머리 주석.
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  pickOption,
  row,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/dns-hosted-zone.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  // Private DNS Creating 3~5분(최대 15분 대기) + Hosted Zone 은 즉시.
  test.describe.configure({ mode: 'serial', timeout: 40 * 60_000 });

  test.afterEach('정리 (역순: Hosted Zone → Private DNS)', async ({ page }) => {
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
    await attempt('Hosted Zone 삭제', async () => {
      await gotoRoute(page, ROUTES.hz);
      if ((await row(page, vars.zone!).count()) === 0) return;
      await test.step(`teardown[0] Hosted Zone ${vars.zone} 삭제`, async () => {
        await row(page, vars.zone!).getByRole('button', { name: '삭제', exact: true }).click();
        await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true, resourceName: vars.zone });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTES.hz, vars.zone!, {
          gone: true,
          timeoutMs: 300_000,
          intervalMs: 10_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('Private DNS 해지', async () => {
      await gotoRoute(page, ROUTES.pdns);
      if ((await row(page, vars.pdns!).count()) === 0) return;
      await test.step(`teardown[1] Private DNS ${vars.pdns} 해지`, async () => {
        await waitForRow(page, ROUTES.pdns, vars.pdns!, {
          status: /Active/i,
          timeoutMs: 900_000,
          intervalMs: 20_000,
          log,
        });
        await row(page, vars.pdns!).getByText(vars.pdns!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지/, '확인', { agree: true, resourceName: vars.pdns });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTES.pdns, vars.pdns!, {
          gone: true,
          timeoutMs: 300_000,
          intervalMs: 15_000,
          log,
        });
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
      await gotoRoute(page, ROUTES.pdns);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] Private DNS ${vars.pdns} 생성`, async () => {
      await openCreateForm(page, ROUTES.pdns, '서비스 생성');
      await fillField(page, 'Private DNS명', vars.pdns!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.pdns, vars.pdns!, {
        status: /Active/i,
        timeoutMs: 900_000,
        intervalMs: 20_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Hosted Zone ${vars.zone} 생성`, async () => {
      await openCreateForm(page, ROUTES.hz, 'Hosted Zone 생성');
      const priv = page.getByRole('button', { name: 'Private', exact: true }).first();
      if (await priv.count()) await priv.click();
      await page.waitForTimeout(500);
      await pickOption(page, '등록할 Private DNS명', new RegExp(vars.pdns!));
      await fillField(page, '등록할 Hosted Zone명', vars.name!);
      await page.getByRole('button', { name: '사용 가능 여부 조회', exact: true }).click();
      await page.waitForTimeout(1500);
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.hz, vars.zone!, {
        status: /Active/i,
        timeoutMs: 180_000,
        intervalMs: 10_000,
        log,
      });
      log(
        `  Hosted Zone 행: ${(await row(page, vars.zone!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
  });
});
