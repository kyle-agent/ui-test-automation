// 직접 작성 (2026-09-23, VIP 단계 2026-09-30 에이전트 B). 시나리오: scenarios/networking/vpc-port.yaml.
// VPC → Subnet(Active) → Port 생성 → IGW·Public IP → Virtual IP 예약 → Port 연결 → Public NAT IP 연결·해제 → Port 연결 해제 → VIP 반납
// → 역순 삭제. 콘솔 사실은 yaml 머리 주석과 docs/service-facts/compute-vm-stack.md.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { logWriteRequests } from '../../src/console/api-log';
import { editDescriptionRoundTrip, logDetail, openDetail, probeEdits } from '../../src/console/detail-edit';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { releaseSubnetVips, ROUTES } from '../../src/console/inventory';
import { createIgw, deleteIgw, openDetailTab, releasePublicIp, reservePublicIp, setPublicNatIp } from '../../src/console/networking';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
  terminateVpc,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/vpc-port.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
let publicIp = ''; // steps[4] 에서 예약한 IP (teardown 반납용)
let vip = ''; // steps[5] 에서 예약된 Virtual IP

/** Subnet 상세 "Virtual IP 관리" 탭을 연다. 탭 route 를 돌려준다. */
const vipTab = (page: Page) => openDetailTab(page, ROUTES.subnet, vars.subnet!, /^Virtual IP 관리/);

/** VIP 상세를 연다 (탭 행의 IP 링크). */
async function openVip(page: Page): Promise<void> {
  await vipTab(page);
  await row(page, vip).getByText(vip, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 1_000 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  // Subnet Active ≈2~4분, 서버가 없던 Subnet 삭제 ≈1~4분(최대 20분 대기).
  test.describe.configure({ mode: 'serial', timeout: 60 * 60_000 });

  test.afterEach('정리 (역순: VIP → Port → Public IP · IGW → Subnet → VPC)', async ({ page }) => {
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

    // 본 단계가 중간에 실패했을 때만 남아 있다 (NAT 해제 → Port 연결 해제 → 반납)
    await attempt('Virtual IP 반납', () => releaseSubnetVips(page, vars.subnet!, log));
    await attempt('Port 삭제', async () => {
      await gotoRoute(page, ROUTES.port);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] Port ${vars.name} 삭제`, async () => {
        await selectRow(page, vars.name!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTES.port, vars.name!, {
          gone: true,
          timeoutMs: 180_000,
          intervalMs: 10_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('Public IP 반납 · IGW 삭제', async () => {
      await test.step(`teardown[3] Public IP ${publicIp || '(없음)'} 반납 · IGW_${vars.vpc} 삭제`, async () => {
        if (publicIp) await releasePublicIp(page, publicIp, log);
        await deleteIgw(page, vars.vpc!, log);
        await gotoRoute(page, ROUTES.igw);
        await expectStep(page, resolveExpectation(scenario.teardown[3]!.expect, vars), ctx(3));
      });
    });
    await attempt('Subnet 삭제', async () => {
      await gotoRoute(page, ROUTES.subnet);
      if ((await row(page, vars.subnet!).count()) === 0) return;
      await test.step(`teardown[1] Subnet ${vars.subnet} 삭제`, async () => {
        await selectRow(page, vars.subnet!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /삭제하시겠습니까/);
        await waitForRow(page, ROUTES.subnet, vars.subnet!, {
          gone: true,
          timeoutMs: 1_200_000,
          intervalMs: 20_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      });
    });
    await attempt('VPC 해지', async () => {
      await gotoRoute(page, ROUTES.vpc);
      if ((await row(page, vars.vpc!).count()) === 0) return;
      await test.step(`teardown[2] VPC ${vars.vpc} 해지`, async () => {
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
    await test.step(`steps[1] VPC ${vars.vpc} 생성`, async () => {
      await openCreateForm(page, ROUTES.vpc, '서비스 생성');
      await fillField(page, 'VPC명', vars.vpc!);
      await fillField(page, 'IP 대역', vars.vpc_cidr!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpc, vars.vpc!, { status: /Active/, timeoutMs: 180_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Subnet ${vars.subnet} 생성`, async () => {
      await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet 유형', 'Public');
      await pickOption(page, 'Subnet 구분', /primary/i);
      await fillField(page, 'Subnet명', vars.subnet!);
      await fillField(page, 'IP 대역', vars.subnet_cidr!);
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
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] Port ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTES.port, 'Port 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet명', new RegExp(vars.subnet!)); // 항목 텍스트 "sub-… (10.250.0.0/24)"
      await fillField(page, 'Port명', vars.name!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|추가/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.port, vars.name!, { timeoutMs: 180_000, intervalMs: 10_000, log });
      log(
        `  Port 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step('steps[4] Internet Gateway · Public IP 준비', async () => {
      await createIgw(page, vars.vpc!, { log }); // VIP Public NAT 는 VPC 에 IGW 가 있어야 설정된다
      publicIp = await reservePublicIp(page, log);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] Virtual IP 예약 (${vars.vip_desc})`, async () => {
      const tab = await vipTab(page);
      await page.getByRole('button', { name: 'Virtual IP 예약', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.waitFor();
      await fillStable(page, modal.locator('textarea:visible').first(), vars.vip_desc!, 'VIP 설명');
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /Virtual IP를 예약하시겠습니까/);
      await waitForRow(page, tab, '반납', { timeoutMs: 120_000, intervalMs: 10_000, log }); // 새 Subnet 이라 이 VIP 한 행뿐
      const text = (await page.locator('tr.scp-body-row:visible').first().innerText()).replace(/\s+/g, ' ').trim();
      vip = text.split(' ')[0]!;
      log(`  VIP 행: ${text}`);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
    await test.step(`steps[6] VIP ${vip} 에 Port ${vars.name} 연결`, async () => {
      await openVip(page);
      await page.getByRole('button', { name: '추가', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.waitFor();
      await modal.locator('tr.scp-body-row').filter({ hasText: vars.name! }).locator('i.table-select').first().click();
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /연결 Port를 추가하시겠습니까/);
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 1_000 });
        if (await row(page, vars.name!).count()) break;
      }
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
    });
    await test.step(`steps[7] VIP Public NAT IP ${publicIp} 연결`, async () => {
      await setPublicNatIp(page, publicIp, log);
      await expectStep(page, resolveExpectation(scenario.steps[7]!.expect, vars), ctx(7));
    });
    await test.step('steps[8] VIP Public NAT IP 해제 → VIP 설명 수정·되돌림 (L3, setsubnetvip)', async () => {
      await setPublicNatIp(page, null, log);
      await logWriteRequests(page, log);
      await logDetail(page, log, 'Virtual IP 상세');
      await probeEdits(page, log, 'Virtual IP');
      await editDescriptionRoundTrip(page, `${vars.vip_desc} edited`, log);
      await expectStep(page, resolveExpectation(scenario.steps[8]!.expect, vars), ctx(8));
    });
    await test.step(`steps[9] Port ${vars.name} 연결 해제`, async () => {
      await row(page, vars.name!).getByRole('button', { name: '연결 해제', exact: true }).click();
      await confirmModal(page, /연결 Port를 해제하시겠습니까/);
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 1_000 });
        if (!(await row(page, vars.name!).count())) break;
      }
      await expectStep(page, resolveExpectation(scenario.steps[9]!.expect, vars), ctx(9));
    });
    await test.step(`steps[10] VIP ${vip} 반납`, async () => {
      const tab = await vipTab(page);
      await row(page, vip).getByRole('button', { name: '반납', exact: true }).click();
      await confirmModal(page, /Virtual IP를 반납하시겠습니까/);
      await waitForRow(page, tab, vip, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[10]!.expect, vars), ctx(10));
    });
    // 동작(L3, 2026-10-13 6E): Subnet · Port · IGW · Public IP 상세 설명 수정 → 반영 → 되돌림 (API setsubnet · setport · setinternetgateway · setpublicip)
    await test.step('steps[11] Subnet · Port · IGW · Public IP 상세 설명 수정 → 반영 → 되돌림 (L3)', async () => {
      await logWriteRequests(page, log);
      const edited = `scp-console-tests ${vars.run_id} edited`;
      for (const [what, route, name] of [
        ['Subnet', ROUTES.subnet, vars.subnet!],
        ['Port', ROUTES.port, vars.name!],
        ['Internet Gateway', ROUTES.igw, `IGW_${vars.vpc}`],
        ['Public IP', ROUTES.pip, publicIp],
      ] as const) {
        await openDetail(page, route, name);
        await logDetail(page, log, `${what} 상세`);
        await probeEdits(page, log, what);
        await editDescriptionRoundTrip(page, edited, log);
      }
      await expectStep(page, resolveExpectation(scenario.steps[11]!.expect, vars), ctx(11));
    });
  });
});
