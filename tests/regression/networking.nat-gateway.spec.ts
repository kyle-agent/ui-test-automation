// 직접 작성 (2026-09-28). 시나리오: scenarios/networking/nat-gateway.yaml. 콘솔 사실은 yaml 머리 주석.
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
  submitForm,
  terminateVpc,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/nat-gateway.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

async function publicIps(page: Page): Promise<string[]> {
  await gotoRoute(page, ROUTES.pip);
  const rows = await page.locator('tr.scp-body-row').allInnerTexts();
  return rows.map((r) => r.trim().split(/\s+/)[0]!).filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
}
/** NAT 목록에서 이 실행의 Subnet 이 든 행 (NAT Gateway명은 콘솔이 자동으로 짓는다) */
const natRow = (page: Page) => page.locator('tr.scp-body-row').filter({ hasText: vars.subnet! });

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 60 * 60_000 });
  let publicIp: string | null = null;

  test.afterEach('정리 (역순: NAT → Public IP → Subnet → VPC)', async ({ page }) => {
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
    await attempt('NAT 삭제', async () => {
      await gotoRoute(page, ROUTES.nat);
      if ((await natRow(page).count()) === 0) return;
      await test.step('teardown[0] NAT Gateway 삭제', async () => {
        await waitForRow(page, ROUTES.nat, vars.subnet!, {
          status: /Active/i,
          timeoutMs: 600_000,
          intervalMs: 15_000,
          log,
        });
        const inRow = natRow(page).first().getByRole('button', { name: '삭제', exact: true });
        if (await inRow.count()) await inRow.click();
        else {
          await natRow(page)
            .first()
            .locator('i.table-select, .scp-select, input[type=checkbox]')
            .first()
            .click();
          await topButton(page, '삭제').click();
        }
        await confirmModal(page, /삭제/, '확인', { agree: true });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTES.nat, vars.subnet!, {
          gone: true,
          timeoutMs: 600_000,
          intervalMs: 15_000,
          log,
        });
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('Public IP 반납', async () => {
      if (!publicIp) return;
      await gotoRoute(page, ROUTES.pip);
      if ((await row(page, publicIp).count()) === 0) return;
      await test.step('teardown[1] Public IP 반납', async () => {
        await waitForRow(page, ROUTES.pip, publicIp!, {
          status: /Reserved/i,
          timeoutMs: 300_000,
          intervalMs: 15_000,
          log,
        });
        await row(page, publicIp!).getByRole('button', { name: '반납', exact: true }).click();
        await confirmModal(page, /반납하시겠습니까/);
        await waitForRow(page, ROUTES.pip, publicIp!, {
          gone: true,
          timeoutMs: 180_000,
          intervalMs: 10_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      });
    });
    await attempt('Subnet·VPC 삭제', async () => {
      await test.step('teardown[2] Subnet · VPC 삭제', async () => {
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
        await expectStep(page, resolveExpectation(scenario.teardown[2]!.expect, vars), ctx(2));
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
    await test.step(`steps[1] VPC ${vars.vpc} · Subnet ${vars.subnet} 생성`, async () => {
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
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step('steps[2] Public IP 예약', async () => {
      const before = new Set(await publicIps(page));
      await openCreateForm(page, ROUTES.pip, 'Public IP 예약');
      await pickOption(page, '구분', 'Internet Gateway');
      await pickOption(page, 'Availability Zone', 'kr-west1-b');
      await submitForm(page, '생성');
      await confirmModal(page, /예약하시겠습니까/);
      let added: string[] = [];
      for (const start = Date.now(); Date.now() - start < 90_000;) {
        added = (await publicIps(page)).filter((ip) => !before.has(ip));
        if (added.length) break;
        await page.waitForTimeout(5_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
      }
      if (added.length !== 1)
        throw new Error(`예약된 Public IP 를 하나로 특정하지 못했습니다: ${JSON.stringify(added)}`);
      publicIp = added[0]!;
      log(`  예약한 Public IP: ${publicIp}`);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step('steps[3] NAT Gateway 생성', async () => {
      await openCreateForm(page, ROUTES.nat, 'NAT Gateway 생성');
      await pickOption(page, 'VPC명', new RegExp(vars.vpc!)); // 항목 "vpc-… AZ: kr-west1-b" 는 앞뒤 공백이 있어 ^ 가 안 맞는다
      await pickOption(page, 'Subnet명', new RegExp(vars.subnet!));
      const multiAz = page
        .locator('.scp-select:visible')
        .filter({ hasText: /^사용$/ })
        .first();
      if ((await multiAz.count()) && (await isChecked(multiAz))) await multiAz.click(); // Multi-AZ 끔 (IP 2개 필요)
      // "NAT Gateway용 IP" 절: 앞 드롭다운은 종류("Public IP"), 뒤 드롭다운이 예약된 IP 목록("선택하세요."). 라벨 "Public IP" 가 종류 값과 겹쳐
      // below() 가 엉뚱한 드롭다운을 잡으므로(2026-09-28 run 2) 남은 "선택하세요." 드롭다운을 직접 연다.
      const ipDropdown = page.locator('.scp-dropdown:visible').filter({ hasText: '선택하세요.' }).last();
      await ipDropdown.click();
      const ipMenu = page.locator('.scp-menu:visible').last();
      await ipMenu.waitFor({ timeout: 5_000 });
      await ipMenu.locator('.scp-menu-item').filter({ hasText: publicIp! }).first().click();
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      const fee = page.getByRole('button', { name: '요금 확인', exact: true }).first();
      if (await fee.count()) await fee.click();
      await page.waitForTimeout(800);
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.nat, vars.subnet!, {
        status: /Active/i,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      log(`  NAT 행: ${(await natRow(page).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
  });
});
