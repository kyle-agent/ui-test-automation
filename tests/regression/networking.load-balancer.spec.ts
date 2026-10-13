// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/load-balancer.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → Subnet → Load Balancer → LB 헬스 체크 → LB 서버 그룹 → Listener 생성 → Public NAT IP 연결·해제(2026-09-30 에이전트 B) → 역순 삭제.
// SHARED_VPC 가 있으면 그 네트워크를 쓴다(그땐 IGW 가 필요한 Public NAT 단계는 건너뛴다).
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { logWriteRequests } from '../../src/console/api-log';
import {
  detailValue,
  editDescriptionRoundTrip,
  editDetailText,
  logDetail,
  logModal,
  openDetail,
  openLabelEdit,
  probeEdits,
  saveModal,
  waitDetailValue,
} from '../../src/console/detail-edit';
import { ROUTES } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmUntil,
  createIgw,
  deleteIgw,
  pickLate,
  releasePublicIp,
  reservePublicIp,
  setPublicNatIp,
} from '../../src/console/networking';
import { deleteNetwork, ensureNetwork, type SharedNetwork } from '../../src/console/shared';
import {
  confirmModal,
  fillField,
  fillStable,
  openCreateForm,
  row,
  setCheckbox,
  submitForm,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/load-balancer.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let publicIp = ''; // steps[6] 에서 예약한 IP (teardown 반납용)

/** LB 상세(상세 정보 탭)를 연다. */
async function openLbDetail(page: Page): Promise<void> {
  await gotoRoute(page, ROUTES.lb);
  await row(page, vars.lb!).getByText(vars.lb!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 1_000 });
}

/** LB 상세 → "연결된 자원" 탭 (Listener 목록). 돌아올 route 를 돌려준다. */
async function openLinkedResources(page: Page): Promise<string> {
  await gotoRoute(page, ROUTES.lb);
  await row(page, vars.lb!).getByText(vars.lb!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.getByText(/^연결된 자원/).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  return '#' + page.url().split('#')[1]!;
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 60 * 60_000 });
  let net: SharedNetwork | null = null;

  test.afterEach('정리 (역순: Listener → 서버 그룹 → 헬스 체크 → LB → Subnet → VPC)', async ({ page }) => {
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
    await attempt('Listener 삭제', async () => {
      await gotoRoute(page, ROUTES.lb);
      if ((await row(page, vars.lb!).count()) === 0) return;
      const route = await openLinkedResources(page);
      if ((await row(page, vars.ls!).count()) === 0) return;
      await test.step(`teardown[0] Listener ${vars.ls} 삭제`, async () => {
        await waitForRow(page, route, vars.ls!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
        await row(page, vars.ls!).getByRole('button', { name: '삭제', exact: true }).click();
        await confirmModal(page, /Listener를 삭제하시겠습니까/);
        await waitForRow(page, route, vars.ls!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('서버 그룹·헬스 체크 삭제', async () => {
      await test.step(`teardown[1] LB 서버 그룹 ${vars.sg} · LB 헬스 체크 ${vars.hc} 삭제`, async () => {
        for (const [route, name, text] of [
          [ROUTES.lbsg, vars.sg!, /LB 서버 그룹을 삭제하시겠습니까/],
          [ROUTES.lbhc, vars.hc!, /LB 헬스 체크를 삭제하시겠습니까/],
        ] as const) {
          await gotoRoute(page, route);
          if ((await row(page, name).count()) === 0) continue;
          await waitForRow(page, route, name, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
          await row(page, name).getByRole('button', { name: '삭제', exact: true }).click();
          await confirmModal(page, text);
          await waitForRow(page, route, name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
        }
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      });
    });
    await attempt('Public NAT IP 해제', async () => {
      if (!publicIp) return;
      await gotoRoute(page, ROUTES.lb);
      if ((await row(page, vars.lb!).count()) === 0) return;
      await openLbDetail(page); // 본 단계가 중간에 실패했을 때만 연결돼 있다
      const nat = (await page.locator('[formlabel="Public NAT IP"]').first().innerText().catch(() => '-')).trim();
      if (nat !== '-') await setPublicNatIp(page, null, log);
    });
    await attempt('LB 해지', async () => {
      await gotoRoute(page, ROUTES.lb);
      if ((await row(page, vars.lb!).count()) === 0) return;
      await test.step(`teardown[2] Load Balancer ${vars.lb} 해지`, async () => {
        await waitForRow(page, ROUTES.lb, vars.lb!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
        await row(page, vars.lb!).getByRole('button', { name: '서비스 해지', exact: true }).click();
        await confirmModal(page, /Load Balancer를 해지하시겠습니까/);
        await waitForRow(page, ROUTES.lb, vars.lb!, { gone: true, timeoutMs: 900_000, intervalMs: 20_000, log });
        await expectStep(page, resolveExpectation(scenario.teardown[2]!.expect, vars), ctx(2));
      });
    });
    await attempt('Public IP 반납 · IGW 삭제', async () => {
      if (net?.shared) return;
      await test.step(`teardown[4] Public IP ${publicIp || '(없음)'} 반납 · IGW_${vars.vpc} 삭제`, async () => {
        if (publicIp) await releasePublicIp(page, publicIp, log);
        await deleteIgw(page, vars.vpc!, log);
        await gotoRoute(page, ROUTES.igw);
        await expectStep(page, resolveExpectation(scenario.teardown[4]!.expect, vars), ctx(4));
      });
    });
    await attempt('Subnet·VPC 삭제', async () => {
      if (net?.shared) return;
      await test.step('teardown[3] Subnet · VPC 삭제', async () => {
        await deleteNetwork(page, vars.vpc!, vars.subnet!, log);
        await expectStep(page, resolveExpectation(scenario.teardown[3]!.expect, vars), ctx(3));
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
      await gotoRoute(page, ROUTES.lb);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step('steps[1] VPC · Subnet 준비', async () => {
      net = await ensureNetwork(page, { vpc: vars.vpc!, subnet: vars.subnet! }, log);
      await gotoRoute(page, ROUTES.subnet);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    const vpcRe = () => new RegExp(escapeRe(net!.vpc));
    const subnetRe = () => new RegExp(escapeRe(net!.subnet));
    await test.step(`steps[2] Load Balancer ${vars.lb} 생성`, async () => {
      await openCreateForm(page, ROUTES.lb, '서비스 생성');
      await fillField(page, 'Load Balancer명', vars.lb!);
      await pickLate(page, 'VPC명', vpcRe(), log); // 항목 "vpc-… AZ: kr-west1-b"
      await pickLate(page, 'Service Subnet명', subnetRe(), log); // 항목 "sub-… (10.250.0.0/24) AZ: kr-west1-b"
      await pickLate(page, 'Availability Zone 1', 'kr-west1-b', log);
      await setCheckbox(page, 'Firewall 사용', false);
      await setCheckbox(page, 'Firewall 로그 저장', false);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '생성');
      await confirmUntil(page, /Load Balancer를 생성하시겠습니까/, log); // 앞에 Firewall 미사용 경고가 온다
      await waitForRow(page, ROUTES.lb, vars.lb!, { status: /Active/, timeoutMs: 900_000, intervalMs: 20_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] LB 헬스 체크 ${vars.hc} 생성`, async () => {
      await openCreateForm(page, ROUTES.lbhc, 'LB 헬스 체크 생성');
      await fillField(page, 'LB 헬스 체크명', vars.hc!);
      await pickLate(page, 'VPC명', vpcRe(), log);
      await pickLate(page, 'Service Subnet명', subnetRe(), log); // LB 가 있는 Subnet 만 나온다
      await submitForm(page, '생성');
      await confirmModal(page, /LB 헬스 체크를 생성하시겠습니까/);
      await waitForRow(page, ROUTES.lbhc, vars.hc!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] LB 서버 그룹 ${vars.sg} 생성`, async () => {
      await openCreateForm(page, ROUTES.lbsg, 'LB 서버 그룹 생성');
      await fillField(page, 'LB 서버 그룹명', vars.sg!);
      await pickLate(page, 'VPC명', vpcRe(), log);
      await pickLate(page, 'Service Subnet명', subnetRe(), log);
      await pickLate(page, 'LB 헬스 체크', vars.hc!, log); // 항목: 미사용 · 시스템 기본(HTTP_Default …) · 이 실행의 헬스 체크
      await submitForm(page, '생성');
      await confirmModal(page, /LB 서버 그룹을 생성하시겠습니까/);
      await waitForRow(page, ROUTES.lbsg, vars.sg!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] Listener ${vars.ls} 생성 (TCP 80)`, async () => {
      await openLinkedResources(page);
      await page.getByRole('button', { name: 'Listener 생성', exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await fillField(page, 'Listener명', vars.ls!);
      await fillField(page, '서비스 포트', '80');
      await pickLate(page, 'LB 서버 그룹', vars.sg!, log);
      await submitForm(page, '생성');
      await confirmModal(page, /Listener를 생성하시겠습니까/);
      await settleConsole(page, { appearGraceMs: 800 });
      const route = '#' + page.url().split('#')[1]!; // 생성 뒤 연결된 자원 탭으로 돌아온다
      await waitForRow(page, route, vars.ls!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      log(`  Listener 행: ${(await row(page, vars.ls!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
    await test.step('steps[6] Internet Gateway · Public IP 준비', async () => {
      if (net!.shared) {
        log('  공유 네트워크 — IGW 를 만들지 않으려고 Public NAT 단계(6~8)를 건너뜀');
        return;
      }
      await createIgw(page, net!.vpc, { log }); // Public NAT IP 드롭다운엔 IGW 가 있는 VPC 의 IGW 구분 IP 가 나온다
      publicIp = await reservePublicIp(page, log);
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
    });
    await test.step(`steps[7] Public NAT IP ${publicIp || '(건너뜀)'} 연결`, async () => {
      if (!publicIp) return;
      await openLbDetail(page);
      await setPublicNatIp(page, publicIp, log);
      await expectStep(page, resolveExpectation(scenario.steps[7]!.expect, vars), ctx(7));
    });
    await test.step('steps[8] Public NAT IP 해제', async () => {
      if (!publicIp) return;
      await setPublicNatIp(page, null, log);
      await expectStep(page, resolveExpectation(scenario.steps[8]!.expect, vars), ctx(8));
    });
    // ---- 동작(L3, 2026-10-06 에이전트 3D): 헬스 체크 · 서버 그룹 · Listener 설정 수정 → 화면 반영 → 되돌림 ----
    const openListener = async () => {
      await openLinkedResources(page);
      await row(page, vars.ls!).getByText(vars.ls!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 1_000 });
    };
    const editDesc = async (what: string) => {
      await logDetail(page, log, `${what} 상세`);
      const original = await detailValue(page, '설명');
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id} edited`, { log });
      await editDetailText(page, '설명', original === '-' ? '' : original, {
        log,
        expectShown: (v) => v === original || (original === '-' && v === ''),
      });
    };
    /** 연필 아이콘이 있는 라벨인지 확인한다 (2026-10-06 프로브에서 확인된 항목이라 없으면 오류) */
    const editable = async (name: RegExp) => {
      const ok = (await page.locator('.scp-form-group-label:visible').filter({ hasText: name }).filter({ has: page.locator('i') }).count()) > 0;
      if (!ok) throw new Error(`${name} 수정 아이콘이 없습니다 (화면 변경?)`);
      return ok;
    };
    if (process.env.PROBE_EDITS === '1') {
      // 프로브: 앞 단계가 실패해도 세 화면의 수정 모달 구조를 먼저 남긴다
      await openDetail(page, ROUTES.lbsg, vars.sg!);
      await logDetail(page, log, 'LB 서버 그룹 상세');
      await probeEdits(page, log, 'LB 서버 그룹');
      await openListener();
      await logDetail(page, log, 'Listener 상세');
      await probeEdits(page, log, 'Listener');
    }
    await test.step(`steps[9] LB 헬스 체크 ${vars.hc} 탐지 횟수 3→5·설명 수정 → 반영 → 되돌림 (L3)`, async () => {
      await openDetail(page, ROUTES.lbhc, vars.hc!);
      // "헬스 체크 방식" 연필 → 모달: 프로토콜·헬스 체크 포트 드롭다운, 주기·대기 시간·탐지 횟수 입력(순서대로 input 0·1·2). 대기 시간 ≤ 주기
      for (const value of ['5', '3']) {
        const modal = await openLabelEdit(page, '헬스 체크 방식');
        await fillStable(page, modal.locator('input[type=text]:visible').nth(2), value, '탐지 횟수');
        await saveModal(page, log);
        await waitDetailValue(page, '탐지 횟수', (v) => v === `${value}회`, { log });
      }
      await editDesc('LB 헬스 체크');
      await expectStep(page, resolveExpectation(scenario.steps[9]!.expect, vars), ctx(9));
    });
    await test.step(`steps[10] LB 서버 그룹 ${vars.sg} 설정 수정 → 반영 → 되돌림 (L3)`, async () => {
      await openDetail(page, ROUTES.lbsg, vars.sg!);
      if (await editable(/^\s*부하 분산\s*$/)) {
        const before = await detailValue(page, '부하 분산');
        const other = /Round Robin/i.test(before) ? /Least Connection/i : /Round Robin/i;
        for (const target of [other, new RegExp(escapeRe(before), 'i')]) {
          const modal = await openLabelEdit(page, '부하 분산');
          await logModal(page, log, '부하 분산 수정');
          await modal.locator('.scp-dropdown:visible').first().click();
          await page.locator('.scp-menu:visible .scp-menu-item').filter({ hasText: target }).first().click();
          await saveModal(page, log);
          await waitDetailValue(page, '부하 분산', (v) => target.test(v), { log });
        }
      }
      await editDesc('LB 서버 그룹');
      await expectStep(page, resolveExpectation(scenario.steps[10]!.expect, vars), ctx(10));
    });
    await test.step(`steps[11] Listener ${vars.ls} 설정 수정 → 반영 → 되돌림 (L3)`, async () => {
      await openListener();
      if (await editable(/^\s*세션 유지 시간\s*$/)) {
        for (const value of ['300', '120']) {
          const modal = await openLabelEdit(page, '세션 유지 시간');
          await logModal(page, log, '세션 유지 시간 수정');
          await fillStable(page, modal.locator('input[type=text]:visible').first(), value, '세션 유지 시간');
          await saveModal(page, log);
          await waitDetailValue(page, '세션 유지 시간', (v) => v.replace(/,/g, '').includes(value), { log });
        }
      }
      await editDesc('Listener');
      await expectStep(page, resolveExpectation(scenario.steps[11]!.expect, vars), ctx(11));
    });
    // 동작(L3, 2026-10-13 6E, API setloadbalancer): LB 상세 설명 수정 → 반영 → 되돌림
    await test.step(`steps[12] Load Balancer ${vars.lb} 설명 수정 → 반영 → 되돌림 (L3)`, async () => {
      await logWriteRequests(page, log);
      await openLbDetail(page);
      await logDetail(page, log, 'Load Balancer 상세');
      await probeEdits(page, log, 'Load Balancer');
      await editDescriptionRoundTrip(page, `scp-console-tests ${vars.run_id} edited`, log);
      await expectStep(page, resolveExpectation(scenario.steps[12]!.expect, vars), ctx(12));
    });
  });
});
