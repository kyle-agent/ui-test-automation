// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/vpn.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → IGW → Public IP → VPN Gateway → VPN Tunnel → 역순 삭제. 상대 장비가 없어 터널 협상은 되지 않는다(자원 CRUD 만 검증).
import type { Locator, Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { detailValue, editDetailText, logDetail, logModal, openDetail, probeEdits, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { ROUTES } from '../../src/console/inventory';
import { createIgw, createVpcOnly, deleteIgw, pickLate, releasePublicIp, reservePublicIp } from '../../src/console/networking';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  fillField,
  fillStable,
  openCreateForm,
  row,
  submitForm,
  terminateVpc,
  visibleModal,
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
    await test.step(`steps[4] VPN Gateway ${vars.vpn} 설명 수정 → 반영 확인 → 되돌림 (L3)`, async () => {
      if (process.env.PROBE_EDITS === '1') {
        // 프로브: 다음 단계가 실패해도 Tunnel 수정 모달 구조를 먼저 남긴다
        await openDetail(page, ROUTES.vpnt, vars.tunnel!);
        await logDetail(page, log, 'VPN Tunnel 상세');
        await probeEdits(page, log, 'VPN Tunnel');
      }
      await openDetail(page, ROUTES.vpn, vars.vpn!);
      await logDetail(page, log, 'VPN Gateway 상세');
      await probeEdits(page, log, 'VPN Gateway');
      const original = await detailValue(page, '설명');
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id} edited`, { log });
      await editDetailText(page, '설명', original === '-' ? '' : original, {
        log,
        expectShown: (v) => v === original || (original === '-' && v === ''),
      });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] VPN Tunnel ${vars.tunnel} 설정 수정 → 반영 확인 → 되돌림 (L3)`, async () => {
      await openDetail(page, ROUTES.vpnt, vars.tunnel!);
      await logDetail(page, log, 'VPN Tunnel 상세');
      if (process.env.PROBE_EDITS === '1') {
        // IKE·IPSEC 절의 "수정" 버튼(2개) 구조 프로브: 열어 보고 취소
        const edits = page.getByRole('button', { name: '수정', exact: true }).filter({ visible: true });
        for (let i = 0; i < (await edits.count()); i++) {
          const before = page.url();
          await edits.nth(i).click();
          await settleConsole(page, { appearGraceMs: 800 });
          if (await visibleModal(page).isVisible().catch(() => false)) {
            await logModal(page, log, `프로브 수정 버튼 ${i}`);
            await visibleModal(page).getByRole('button', { name: '취소', exact: true }).last().click().catch(() => undefined);
          } else {
            await logDetail(page, log, `프로브 수정 버튼 ${i} 화면`);
            await page.getByRole('button', { name: '취소', exact: true }).filter({ visible: true }).last().click().catch(() => undefined);
            await page.waitForTimeout(800);
            await visibleModal(page).getByRole('button', { name: '확인', exact: true }).last().click().catch(() => undefined);
          }
          await settleConsole(page, { appearGraceMs: 800 });
          if (page.url() !== before) await openDetail(page, ROUTES.vpnt, vars.tunnel!);
        }
      }
      // 1) DPD Probe Interval 60 → 30 → 60 (초)
      await editDetailText(page, 'DPD Probe Interval', '30', { log, expectShown: (v) => /^30\s*초$/.test(v) });
      await editDetailText(page, 'DPD Probe Interval', '60', { log, expectShown: (v) => /^60\s*초$/.test(v) });
      // 2) Peer VPN GW IP 203.0.113.2 → .3 → .2 (문서용 주소)
      await editDetailText(page, 'Peer VPN GW IP', '203.0.113.3', { log, expectShown: (v) => v === '203.0.113.3' });
      await editDetailText(page, 'Peer VPN GW IP', PEER, { log, expectShown: (v) => v === PEER });
      // 3) IKE 설정 "수정"(절 버튼 0번 = IKE, 1번 = IPSEC) 모달의 SA LifeTime 86400 → 28800 → 86400 초. 상세의 첫 "SA LifeTime" 이 IKE 값
      for (const [value, shown] of [
        ['28800', /^28,800\s*초$/],
        ['86400', /^86,400\s*초$/],
      ] as const) {
        await page.getByRole('button', { name: '수정', exact: true }).filter({ visible: true }).first().click();
        const modal = visibleModal(page);
        await modal.getByText('IKE 설정 수정').first().waitFor({ timeout: 10_000 });
        await fillStable(page, modal.locator('input[type=text]:visible').last(), value, 'IKE SA LifeTime');
        await saveModal(page, log);
        await waitDetailValue(page, 'SA LifeTime', (v) => shown.test(v), { log });
      }
      // 4) 설명
      const original = await detailValue(page, '설명');
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id} edited`, { log });
      await editDetailText(page, '설명', original === '-' ? '' : original, {
        log,
        expectShown: (v) => v === original || (original === '-' && v === ''),
      });
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
  });
});
