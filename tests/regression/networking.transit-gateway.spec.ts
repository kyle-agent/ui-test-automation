// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/transit-gateway.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → Transit Gateway → VPC 연결 추가(L3) → 규칙 추가·삭제(2026-09-30 에이전트 B) → 연결 해제 → TGW 삭제 → VPC 해지.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { logWriteRequests } from '../../src/console/api-log';
import { editDescriptionRoundTrip, logDetail, openDetail, probeEdits } from '../../src/console/detail-edit';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { createVpcOnly, openDetailTab } from '../../src/console/networking';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  fillField,
  fillStable,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  terminateVpc,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/transit-gateway.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const connections = (page: Page) => openDetailTab(page, ROUTES.tgw, vars.tgw!, /^연결 VPC 관리/);
const rules = (page: Page) => openDetailTab(page, ROUTES.tgw, vars.tgw!, /^규칙 \(/);

/** 규칙 탭에서 이 실행의 규칙(목적지 tgw_dest)을 지우고 사라질 때까지 기다린다. 없으면 건너뜀. */
async function deleteRule(page: Page): Promise<void> {
  const tab = await rules(page);
  // 탭 표가 늦게 채워져 첫 실행(2026-09-30)에서 "행 없음" 으로 보고 삭제를 건너뛰었다 → 규칙이 남아 VPC 연결 삭제가 조용히 무시됐다.
  // 탭 이름 "규칙 (n)" 으로 판단하고, n > 0 이면 행이 보일 때까지 기다린다.
  const label = (await page.getByText(/^규칙 \(\d+\)/).first().innerText().catch(() => '')).trim();
  if (/\(0\)/.test(label)) return;
  const shown = await waitForRow(page, tab, vars.tgw_dest!, { timeoutMs: 60_000, intervalMs: 10_000, log }).then(
    () => true,
    () => false,
  );
  if (!shown) return;
  await waitForRow(page, tab, vars.tgw_dest!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
  await selectRow(page, vars.tgw_dest!);
  await topButton(page, '삭제').click();
  await confirmModal(page, /규칙을 삭제하시겠습니까/);
  await waitForRow(page, tab, vars.tgw_dest!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
  // 2026-09-30 첫 실행: 소멸 판정이 첫 확인에서 바로 났고 그 직후 VPC 연결 삭제가 무시됐다 → 탭 이름 "규칙 (0)" 이 될 때까지 다시 읽어 확인
  for (const start = Date.now(); Date.now() - start < 300_000; ) {
    const label = (await page.getByText(/^규칙 \(\d+\)/).first().innerText().catch(() => '')).trim();
    if (/\(0\)/.test(label) && !(await row(page, vars.tgw_dest!).count())) return;
    log(`  규칙 탭: ${label || '(탭 못 읽음)'} — 삭제 완료 대기`);
    await page.waitForTimeout(15_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 1_000 });
  }
}

/** 연결 VPC 관리 탭에서 이 실행의 VPC 연결을 해제하고 사라질 때까지 기다린다. */
async function detachVpc(page: Page): Promise<void> {
  const tab = await connections(page);
  if ((await row(page, vars.vpc!).count()) === 0) return;
  // 실측(2026-09-30): 규칙 삭제 직후의 연결 삭제 요청은 확인을 눌러도 행이 Active 로 남았다 → 모달 문구를 남기고 Deleting 이 안 되면 다시 누른다
  for (let attempt = 1; attempt <= 4; attempt++) {
    await waitForRow(page, tab, vars.vpc!, { status: /Active|Deleting/, timeoutMs: 600_000, intervalMs: 15_000, log });
    const text = (await row(page, vars.vpc!).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    if (!/Deleting/.test(text)) {
      await selectRow(page, vars.vpc!);
      await topButton(page, '삭제').click();
      await confirmModal(page, /VPC 연결을 삭제하시겠습니까/);
      const after = visibleModal(page);
      if (await after.waitFor({ timeout: 3_000 }).then(() => true, () => false)) {
        log(`  연결 삭제 뒤 모달: ${(await after.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}`);
        await after.getByRole('button').last().click({ timeout: 5_000 }).catch(() => undefined);
      }
    }
    try {
      await waitForRow(page, tab, vars.vpc!, { gone: true, timeoutMs: attempt < 4 ? 120_000 : 600_000, intervalMs: 15_000, log });
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      const now = (await row(page, vars.vpc!).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (/Deleting/.test(now)) { await waitForRow(page, tab, vars.vpc!, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log }); return; }
      log(`  VPC 연결 삭제 재시도 ${attempt}/4 (아직: ${now.slice(0, 80)})`);
    }
  }
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 45 * 60_000 });

  test.afterEach('정리 (역순: VPC 연결 → TGW → VPC)', async ({ page }) => {
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
    await attempt('TGW 삭제', async () => {
      await gotoRoute(page, ROUTES.tgw);
      if ((await row(page, vars.tgw!).count()) === 0) return;
      await test.step(`teardown[0] Transit Gateway ${vars.tgw} 삭제`, async () => {
        await deleteRule(page); // 본 단계가 중간에 실패했을 때만 남아 있다
        await detachVpc(page);
        await waitForRow(page, ROUTES.tgw, vars.tgw!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
        await selectRow(page, vars.tgw!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /Transit Gateway를 삭제하시겠습니까/);
        await waitForRow(page, ROUTES.tgw, vars.tgw!, { gone: true, timeoutMs: 900_000, intervalMs: 15_000, log });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('VPC 해지', async () => {
      await test.step(`teardown[1] VPC ${vars.vpc} 해지`, async () => {
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
      await gotoRoute(page, ROUTES.tgw);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc} 생성`, async () => {
      await createVpcOnly(page, vars.vpc!, log);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Transit Gateway ${vars.tgw} 생성`, async () => {
      await openCreateForm(page, ROUTES.tgw, 'Transit Gateway 생성');
      await fillField(page, 'Transit Gateway명', vars.tgw!);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '생성');
      await confirmModal(page, /Transit Gateway를 생성하시겠습니까/);
      await waitForRow(page, ROUTES.tgw, vars.tgw!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] VPC 연결 추가 (${vars.vpc})`, async () => {
      const tab = await connections(page);
      await page.getByRole('button', { name: 'VPC 연결 추가', exact: true }).first().click();
      await visibleModal(page).waitFor();
      await pickOption(page, '연결 VPC명', vars.vpc!); // 모달 안
      await visibleModal(page).getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /VPC 연결을 추가하시겠습니까/);
      await waitForRow(page, tab, vars.vpc!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] 규칙 추가 (${vars.vpc} → TGW ${vars.tgw_dest})`, async () => {
      const tab = await rules(page);
      await page.getByRole('button', { name: '규칙 추가', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.waitFor();
      await pickOption(page, '연결 VPC명', vars.vpc!); // 모달 안 (규칙 유형은 기본 "VPC-TGW 규칙")
      await pickOption(page, '목적지', 'TGW');
      await fillStable(page, modal.locator('input[type=text]:visible').last(), vars.tgw_dest!, '목적지 IP 대역');
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /규칙을 추가하시겠습니까/);
      await waitForRow(page, tab, vars.tgw_dest!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      log(`  규칙 행: ${(await row(page, vars.tgw_dest!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] 규칙 ${vars.tgw_dest} 삭제`, async () => {
      await deleteRule(page);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
    await test.step('steps[6] VPC 연결 해제', async () => {
      await detachVpc(page);
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
    });
    // 동작(L3, 2026-10-13 6E, API settransitgateway): 상세 설명 수정 → 반영 → 되돌림. 상세 버튼은 로그로(Firewall 연결 = TGW Firewall, 과금이라 누르지 않음)
    await test.step(`steps[7] Transit Gateway ${vars.tgw} 설명 수정 → 반영 → 되돌림 (L3)`, async () => {
      await logWriteRequests(page, log);
      await openDetail(page, ROUTES.tgw, vars.tgw!);
      await logDetail(page, log, 'Transit Gateway 상세');
      await probeEdits(page, log, 'Transit Gateway');
      await editDescriptionRoundTrip(page, `scp-console-tests ${vars.run_id} edited`, log);
      await expectStep(page, resolveExpectation(scenario.steps[7]!.expect, vars), ctx(7));
    });
  });
});
