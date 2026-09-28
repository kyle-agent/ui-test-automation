// 직접 작성 (2026-09-28). 시나리오: scenarios/compute/auto-scaling-group.yaml. 콘솔 사실은 yaml 머리 주석.
import type { Page } from '@playwright/test';
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

const scenario = loadScenario('scenarios/compute/auto-scaling-group.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const ASG = '#/virtualserver/auto-scaling-group/list';

const visibleButtons = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => b.checkVisibility() && !b.closest('header'))
      .map(
        (b) =>
          b.innerText.trim().replace(/\s+/g, ' ') +
          (b.getAttribute('aria-disabled') === 'true' ? '(dis)' : ''),
      )
      .filter(Boolean),
  );

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 60 * 60_000 });

  test.afterEach('정리 (역순: ASG → LC → SG → Subnet → VPC)', async ({ page }) => {
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
    await attempt('ASG 삭제', async () => {
      await gotoRoute(page, ASG);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] Auto-Scaling Group ${vars.name} 삭제`, async () => {
        // 목록에 삭제가 없으면 상세로 들어가 "삭제"/"서비스 해지" 를 찾는다
        const inRow = row(page, vars.name!)
          .getByRole('button', { name: /삭제|해지/ })
          .first();
        if (await inRow.count()) await inRow.click();
        else {
          const top = page.locator('button:visible').filter({ hasText: /^(삭제|서비스 해지)$/ });
          if (await top.count()) {
            await selectRow(page, vars.name!);
            await top.first().click();
          } else {
            await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
            await settleConsole(page, { appearGraceMs: 800 });
            log(`  ASG 상세 버튼: ${JSON.stringify(await visibleButtons(page))}`);
            const del = page
              .locator('button:visible')
              .filter({ hasText: /삭제|서비스 해지/ })
              .first();
            await del.click();
          }
        }
        await confirmModal(page, /삭제|해지/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ASG, vars.name!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('LC·SG·Subnet·VPC 삭제', async () => {
      await test.step('teardown[1] LC · SG · Subnet · VPC 삭제', async () => {
        await gotoRoute(page, ROUTES.lc);
        if (await row(page, vars.lc!).count()) {
          await selectRow(page, vars.lc!);
          await topButton(page, '삭제').click();
          await confirmModal(page, /삭제/, '확인', { agree: true });
          await waitForRow(page, ROUTES.lc, vars.lc!, {
            gone: true,
            timeoutMs: 180_000,
            intervalMs: 10_000,
            log,
          });
        }
        await gotoRoute(page, ROUTES.subnet);
        if (await row(page, vars.subnet!).count()) {
          await selectRow(page, vars.subnet!);
          await topButton(page, '삭제').click();
          await confirmModal(page, /삭제하시겠습니까/);
          await waitForRow(page, ROUTES.subnet, vars.subnet!, {
            gone: true,
            timeoutMs: 1_200_000,
            intervalMs: 20_000,
            log,
          });
        }
        await terminateVpc(page, ROUTES.vpc, vars.vpc!, log);
        await gotoRoute(page, ROUTES.sg);
        if (await row(page, vars.sg!).count()) {
          await row(page, vars.sg!).getByText(vars.sg!, { exact: true }).first().click();
          await settleConsole(page, { appearGraceMs: 800 });
          await topButton(page, '서비스 해지').click();
          await confirmModal(page, /해지하시겠습니까/);
          await waitForRow(page, ROUTES.sg, vars.sg!, { gone: true, timeoutMs: 120_000, log });
        }
        await gotoRoute(page, ROUTES.vpc);
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
      await gotoRoute(page, ROUTES.vpc);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step('steps[1] VPC · Subnet · SG · LC 생성', async () => {
      await openCreateForm(page, ROUTES.sg, '서비스 생성');
      await fillField(page, 'Security Group명', vars.sg!);
      await setCheckbox(page, '로그 저장 여부', false);
      await submitForm(page, '생성');
      await confirmModal(page, /진행하시겠습니까/);
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.sg, vars.sg!, { timeoutMs: 60_000, log });

      await openCreateForm(page, ROUTES.vpc, '서비스 생성');
      await fillField(page, 'VPC명', vars.vpc!);
      await fillField(page, 'IP 대역', '10.250.0.0/20');
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpc, vars.vpc!, { status: /Active/, timeoutMs: 180_000, log });

      await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet 유형', 'Public');
      await pickOption(page, 'Subnet 구분', /primary/i);
      await fillField(page, 'Subnet명', vars.subnet!);
      await fillField(page, 'IP 대역', '10.250.0.0/24');
      const gateway = await below(page, 'Gateway IP', 'input');
      if (!(await gateway.inputValue())) await fillField(page, 'Gateway IP', '10.250.0.1');
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.subnet, vars.subnet!, {
        status: /Active/,
        timeoutMs: 900_000,
        intervalMs: 15_000,
        log,
      });

      await openCreateForm(page, ROUTES.lc, 'Launch Configuration 생성');
      await fillField(page, 'Launch Configuration명', vars.lc!);
      await pickOption(page, '서비스 유형', /^Standard-1/);
      await pickOption(page, '서버 타입', /./);
      await pickOption(page, '기본 OS', /^SSD$/);
      await pickOption(page, 'Keypair명', /qa-shared-keypair/);
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.lc, vars.lc!, { timeoutMs: 120_000, intervalMs: 10_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Auto-Scaling Group ${vars.name} 생성`, async () => {
      await openCreateForm(page, ASG, 'Auto-Scaling Group 생성');
      // 위쪽 Launch Configuration 표에서 이 실행의 LC 행 선택
      const lcRow = page.locator('tr').filter({ hasText: vars.lc! }).first();
      await lcRow
        .locator('i.table-select, .scp-select, input[type=radio], input[type=checkbox]')
        .first()
        .click();
      await fillField(page, 'Auto-Scaling Group명', vars.name!);
      await fillField(page, '서버명', vars.name!);
      await fillField(page, 'Min', '0');
      await fillField(page, 'Desired', '0');
      await fillField(page, 'Max', '1');
      await pickOption(page, 'VPC명', new RegExp(vars.vpc!)); // 항목 "vpc-… AZ: kr-west1-b" 는 앞뒤 공백이 있어 ^ 가 안 맞는다
      await pickOption(page, 'Subnet명', new RegExp(vars.subnet!));
      // Security Group "선택" 모달
      const sel = page
        .locator('button:visible')
        .filter({ hasText: /^선택$/ })
        .first();
      await sel.click();
      const sgModal = visibleModal(page);
      await sgModal.waitFor({ timeout: 10_000 });
      const search = sgModal.locator('input:visible').first();
      if (await search.count()) {
        await search.fill(vars.sg!);
        await search.press('Enter');
        await page.waitForTimeout(1_000);
      }
      const sgRow = sgModal.locator('tr').filter({ hasText: vars.sg! }).first();
      await sgRow.locator('i.table-select, .scp-select, input[type=checkbox]').first().click();
      await sgModal.getByRole('button', { name: '확인', exact: true }).click();
      await page.waitForTimeout(500);
      // 정책은 나중에 설정
      for (const later of await page
        .locator('.scp-select:visible')
        .filter({ hasText: /^나중에 설정$/ })
        .all())
        if (!(await isChecked(later))) await later.click();
      const fee = page.getByRole('button', { name: '요금 확인', exact: true }).first();
      if (await fee.count()) await fee.click();
      await page.waitForTimeout(800);
      log(`  폼 버튼: ${JSON.stringify(await visibleButtons(page))}`);
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ASG, vars.name!, { timeoutMs: 300_000, intervalMs: 15_000, log });
      log(
        `  ASG 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
  });
});
