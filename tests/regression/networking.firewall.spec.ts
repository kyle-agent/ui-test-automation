// 직접 작성 (2026-09-29). 시나리오: scenarios/networking/firewall.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → IGW(Firewall 사용) → Firewall 규칙 추가 → 규칙 삭제 → IGW 삭제 → VPC 해지. IGW 가 VPC 당 1개라 공유 VPC 는 쓰지 않는다.
import { expect, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { createIgw, createVpcOnly, deleteIgw } from '../../src/console/networking';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, fillStable, isChecked, row, submitForm, terminateVpc, waitForRow } from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/firewall.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const FW_ROUTE = '#/firewall/firewall/list';
const SRC = '192.168.1.1';
const DST = '10.250.0.10';
// :visible — 규칙 수정 화면으로 넘어가도 규칙 탭의 행이 숨은 채 DOM 에 남아 first() 가 그걸 잡았다(2026-09-30 스위트 실패)
const ruleRow = (page: Page) => page.locator('tr.scp-body-row:visible').filter({ hasText: SRC });

/** Firewall 상세 "규칙" 탭을 열고 그 route 를 돌려준다. */
async function openRules(page: Page): Promise<string> {
  await gotoRoute(page, FW_ROUTE);
  await row(page, vars.vpc!).getByText(`FW_IGW_${vars.vpc}`, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.getByText(/^규칙 \(/).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  return '#' + page.url().split('#')[1]!;
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 40 * 60_000 });

  test.afterEach('정리 (역순: IGW(+Firewall) → VPC)', async ({ page }) => {
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
    await attempt('IGW 삭제', async () => {
      await test.step('teardown[0] Internet Gateway(+Firewall) 삭제', async () => {
        await deleteIgw(page, vars.vpc!, log);
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
      await gotoRoute(page, FW_ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc} · IGW(Firewall 사용) 생성`, async () => {
      await createVpcOnly(page, vars.vpc!, log);
      await createIgw(page, vars.vpc!, { firewall: true, log });
      await waitForRow(page, FW_ROUTE, `FW_IGW_${vars.vpc}`, { status: /Active/, timeoutMs: 300_000, intervalMs: 10_000, log });
      log(`  Firewall 행: ${(await row(page, vars.vpc!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 규칙 추가 (${SRC} → ${DST}, TCP 22, Allow, Inbound)`, async () => {
      await openRules(page);
      await page.getByRole('button', { name: '규칙 추가', exact: true }).click();
      await settleConsole(page, { appearGraceMs: 1000 });
      // 출발지·목적지 주소는 라벨 연결이 없는 textarea (순서: 출발지, 목적지, 설명)
      const areas = page.locator('textarea:visible');
      await fillStable(page, areas.nth(0), SRC, '출발지 주소');
      await fillStable(page, areas.nth(1), DST, '목적지 주소');
      await expect(areas.nth(0), '출발지 주소가 남아 있어야 합니다').toHaveValue(SRC);
      const tcp = page.locator('.scp-select:visible').filter({ hasText: /^TCP$/ }).first();
      if (!(await isChecked(tcp))) await tcp.click();
      await page.waitForTimeout(500);
      // 목적지 포트는 읽기 전용 기본값 22(SSH). 첫 "추가" = 서비스(TCP 22) 추가, 마지막 "추가" = 규칙을 '추가된 규칙' 표에 넣기
      await page.getByRole('button', { name: '추가', exact: true }).first().click({ force: true });
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: '추가', exact: true }).last().click({ force: true });
      await expect(ruleRow(page).first(), '추가된 규칙 표에 규칙이 보여야 합니다').toBeVisible({ timeout: 10_000 });
      await submitForm(page, '완료');
      await confirmModal(page, /규칙을 추가하시겠습니까/);
      await settleConsole(page, { appearGraceMs: 800 });
      const route = '#' + page.url().split('#')[1]!;
      await waitForRow(page, route, SRC, { status: /활성화/, timeoutMs: 300_000, intervalMs: 10_000, log });
      log(`  규칙 행: ${(await ruleRow(page).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step('steps[3] 규칙 삭제 (규칙 수정 화면)', async () => {
      const rules = await openRules(page);
      // 규칙 추가 직후엔 방화벽이 Syncing 이라 "규칙 수정" 이 눌려도 화면이 안 바뀐다(2026-09-30 재실행 실패) → 넘어갈 때까지 다시 연다(최대 5분)
      for (let attempt = 1; ; attempt++) {
        await page.getByRole('button', { name: '규칙 수정', exact: true }).click();
        const moved = await page.waitForURL(/\/rule\/edit/, { timeout: 20_000 }).then(() => true, () => false);
        if (moved) break;
        if (attempt >= 15) throw new Error('"규칙 수정" 화면으로 5분 안에 넘어가지 않았습니다(방화벽 동기화 대기)');
        log(`  규칙 수정 화면 대기 ${attempt} (방화벽 동기화 중으로 보임)`);
        await gotoRoute(page, rules);
      }
      await settleConsole(page, { appearGraceMs: 1000 });
      await ruleRow(page).first().locator('i.table-select').first().click();
      await page.getByRole('button', { name: '삭제', exact: true }).first().click();
      await expect(ruleRow(page).first(), '변경 사항이 "삭제 예정" 이어야 합니다').toContainText('삭제 예정');
      await submitForm(page, '완료');
      await confirmModal(page, /규칙을 수정하시겠습니까/);
      await settleConsole(page, { appearGraceMs: 800 });
      await waitForRow(page, rules, SRC, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
  });
});
