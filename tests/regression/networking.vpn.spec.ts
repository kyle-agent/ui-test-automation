// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/vpn.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → IGW → Public IP → VPN Gateway → VPN Tunnel → 역순 삭제. 상대 장비가 없어 터널 협상은 되지 않는다(자원 CRUD 만 검증).
import type { Locator, Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { createIgw, createVpcOnly, deleteIgw, pickLate, releasePublicIp, reservePublicIp } from '../../src/console/networking';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  fillField,
  openCreateForm,
  row,
  submitForm,
  terminateVpc,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/vpn.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const PEER = '203.0.113.2';

/** 이름 없는 드롭다운(IKE/IPSEC 알고리즘)을 열고 항목을 고른다 */
async function pickIn(page: Page, dd: Locator, item: RegExp): Promise<void> {
  await dd.click();
  const menu = page.locator('.scp-menu:visible').last();
  await menu.waitFor({ timeout: 5_000 });
  await menu.locator('.scp-menu-item').filter({ hasText: item }).first().click();
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
}

/** 목록에 삭제가 없는 VPN·Tunnel: 이름 링크 → 상세 상단 버튼 → 확인 → 목록에서 소멸 대기 */
async function deleteFromDetail(page: Page, route: string, name: string, button: string, text: RegExp): Promise<void> {
  await gotoRoute(page, route);
  if ((await row(page, name).count()) === 0) return;
  await waitForRow(page, route, name, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
  await row(page, name).getByText(name, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.getByRole('button', { name: button, exact: true }).first().click();
  await confirmModal(page, text);
  await waitForRow(page, route, name, { gone: true, timeoutMs: 900_000, intervalMs: 15_000, log });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 45 * 60_000 });
  let publicIp: string | null = null;

  test.afterEach('정리 (역순: Tunnel → VPN → Public IP → IGW → VPC)', async ({ page }) => {
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
    await attempt('Tunnel 삭제', async () => {
      await test.step(`teardown[0] VPN Tunnel ${vars.tunnel} 삭제`, async () => {
        await deleteFromDetail(page, ROUTES.vpnt, vars.tunnel!, 'VPN Tunnel 삭제', /VPN Tunnel을 삭제하시겠습니까/);
        await gotoRoute(page, ROUTES.vpnt);
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('VPN 해지', async () => {
      await test.step(`teardown[1] VPN ${vars.vpn} 해지`, async () => {
        await deleteFromDetail(page, ROUTES.vpn, vars.vpn!, '서비스 해지', /VPN을 해지하시겠습니까/);
        await gotoRoute(page, ROUTES.vpn);
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      });
    });
    await attempt('Public IP 반납', async () => {
      if (publicIp) await releasePublicIp(page, publicIp, log);
    });
    await attempt('IGW 삭제', async () => deleteIgw(page, vars.vpc!, log));
    await attempt('VPC 해지', async () => {
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
      await gotoRoute(page, ROUTES.vpn);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc} · IGW · Public IP`, async () => {
      await createVpcOnly(page, vars.vpc!, log);
      await createIgw(page, vars.vpc!, { firewall: false, log });
      publicIp = await reservePublicIp(page, log);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] VPN Gateway ${vars.vpn} 생성`, async () => {
      await openCreateForm(page, ROUTES.vpn, '서비스 생성');
      await fillField(page, 'VPN Gateway명', vars.vpn!);
      await pickLate(page, '연결 VPC명', vars.vpc!, log);
      await pickLate(page, 'Public IP', publicIp!, log);
      await submitForm(page, '생성');
      await confirmModal(page, /VPN을 생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpn, vars.vpn!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] VPN Tunnel ${vars.tunnel} 생성`, async () => {
      await openCreateForm(page, ROUTES.vpnt, 'VPN Tunnel 생성');
      await fillField(page, 'VPN Tunnel명', vars.tunnel!);
      await pickLate(page, 'VPN Gateway명', vars.vpn!, log);
      await page.waitForTimeout(1_000); // VPC명·Public IP 가 자동으로 채워진다
      await fillField(page, 'Peer VPN GW IP', PEER);
      await fillField(page, 'Remote Subnet(CIDR)', '20.0.0.0/24');
      await page.getByRole('button', { name: '추가', exact: true }).first().click();
      // Pre-shared Key: run_id 로 만든다(외부 장비가 없어 쓰이지 않는다). 값은 출력·기록하지 않는다
      const psk = await below(page, 'Pre-shared Key', 'input[type=password]');
      await psk.fill(`Psk${vars.run_id_compact}x`);
      await psk.press('Tab');
      // 보이는 드롭다운 순서(2026-09-29 프로브): 0 헤더 리전 · 1 VPN Gateway명 · 2 IKE Version · 3/4 IKE Encryption/Digest · 5/6 IPSEC Encryption/Digest
      // "추가" 버튼 순서: 0 Remote Subnet · 1 IKE 알고리즘 · 2 IPSEC 알고리즘. DH 체크박스 "14" 는 IKE·IPSEC 에 하나씩
      const dds = page.locator('.scp-dropdown:visible');
      const add = page.getByRole('button', { name: '추가', exact: true });
      const dh14 = page.locator('.scp-select:visible').filter({ hasText: /^\s*14\s*$/ });
      await pickIn(page, dds.nth(3), /^\s*aes256\s*$/);
      await pickIn(page, dds.nth(4), /^\s*sha256\s*$/);
      await add.nth(1).click();
      await dh14.nth(0).click();
      await pickIn(page, dds.nth(5), /^\s*aes256\s*$/);
      await pickIn(page, dds.nth(6), /^\s*sha256\s*$/);
      await add.nth(2).click();
      await dh14.nth(1).click();
      await submitForm(page, '생성');
      await confirmModal(page, /VPN Tunnel을 생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpnt, vars.tunnel!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      log(`  Tunnel 행: ${(await row(page, vars.tunnel!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
  });
});
