// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/vpc-endpoint.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → VPC Endpoint 유형 Subnet → VPC Endpoint(Object Storage) → 역순 삭제.
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { createVpcOnly, pickLate } from '../../src/console/networking';
import {
  below,
  confirmModal,
  fillField,
  openCreateForm,
  row,
  selectRow,
  submitForm,
  terminateVpc,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/vpc-endpoint.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const IP = '10.250.1.10';

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 45 * 60_000 });

  test.afterEach('정리 (역순: Endpoint → Subnet → VPC)', async ({ page }) => {
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
    await attempt('Endpoint 삭제', async () => {
      await gotoRoute(page, ROUTES.vpce);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] VPC Endpoint ${vars.name} 삭제`, async () => {
        await waitForRow(page, ROUTES.vpce, vars.name!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
        await row(page, vars.name!).getByRole('button', { name: '삭제', exact: true }).click();
        await confirmModal(page, /VPC Endpoint를 삭제하시겠습니까/);
        await waitForRow(page, ROUTES.vpce, vars.name!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('Subnet·VPC 삭제', async () => {
      await test.step('teardown[1] Subnet · VPC 삭제', async () => {
        await gotoRoute(page, ROUTES.subnet);
        if (await row(page, vars.subnet!).count()) {
          await selectRow(page, vars.subnet!);
          await topButton(page, '삭제').click();
          await confirmModal(page, /삭제하시겠습니까/);
          await waitForRow(page, ROUTES.subnet, vars.subnet!, { gone: true, timeoutMs: 1_200_000, intervalMs: 20_000, log });
        }
        await terminateVpc(page, ROUTES.vpc, vars.vpc!, log);
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
      await gotoRoute(page, ROUTES.vpce);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc} · Endpoint Subnet ${vars.subnet} 생성`, async () => {
      await createVpcOnly(page, vars.vpc!, log);
      await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
      await pickLate(page, 'VPC명', vars.vpc!, log);
      await pickLate(page, 'Subnet 유형', 'VPC Endpoint', log);
      await pickLate(page, 'Subnet 구분', /primary/i, log);
      await fillField(page, 'Subnet명', vars.subnet!);
      await fillField(page, 'IP 대역', '10.250.1.0/24');
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.subnet, vars.subnet!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] VPC Endpoint ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTES.vpce, 'VPC Endpoint 생성');
      await pickLate(page, 'VPC명', new RegExp(vars.vpc!), log); // 항목 "vpc-… AZ: kr-west1-b"
      await pickLate(page, '대상 서비스 정보', 'Object Storage', log);
      await pickLate(page, '연결 자원', /object-store/, log);
      await fillField(page, 'VPC Endpoint명', vars.name!);
      await pickLate(page, 'Subnet명', new RegExp(vars.subnet!), log); // VPC Endpoint 유형 Subnet 만 나온다
      await page.waitForTimeout(800);
      const ip = await below(page, 'Subnet명', 'input[type=text]'); // IP 입력란(라벨 "IP" 가 설명문과 붙어 있다)
      await ip.fill(IP);
      await ip.press('Tab');
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '생성');
      await confirmModal(page, /VPC Endpoint를 생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpce, vars.name!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      log(`  Endpoint 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
  });
});
