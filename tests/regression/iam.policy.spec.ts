// 직접 작성 (2026-09-29). 시나리오: scenarios/iam/policy.yaml.
// 정책(기본 정책 불러오기) → 그룹 생성 → 그룹에 정책 연결 → 연결 해제(L3) → 그룹·정책 삭제.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  row,
  selectRow,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';
import { editDetailText, logDetail, logModal, openDetail } from '../../src/console/detail-edit';

const scenario = loadScenario('scenarios/iam/policy.yaml');
const vars = scenarioVars(scenario);
const POLICY_ROUTE = '#/iam/policy/list';
const GROUP_ROUTE = '#/iam/group/list';
const SOURCE_POLICY = 'BillingplanReadOnlyAccess';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 목록에서 행 선택 → 상단 "삭제" → 확인 → 소멸 대기 (그룹·정책 공통) */
async function deleteFromList(page: Page, route: string, name: string) {
  await gotoRoute(page, route);
  if ((await row(page, name).count()) === 0) return;
  await selectRow(page, name);
  await topButton(page, '삭제').click();
  await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true, resourceName: name });
  await waitForRow(page, route, name, { gone: true, timeoutMs: 120_000, intervalMs: 5_000, log });
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 그룹 상세의 정책 탭을 연다 (목록의 그룹명은 span[role=button]) */
async function openGroupPolicyTab(page: Page) {
  await gotoRoute(page, GROUP_ROUTE);
  await row(page, vars.group!).locator(`span[role=button]:text-is("${vars.group}")`).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.getByText(/^정책 \(\d+\)$/).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await topButton(page, '정책 연결').waitFor({ timeout: 15_000 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test.afterEach('정리 (그룹 → 정책)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    const errors: string[] = [];
    const attempt = async (what: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${what}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
        log(`  정리 실패 ${errors[errors.length - 1]}`);
      }
    };
    await attempt('그룹 삭제', () =>
      test.step(`teardown[0] ${vars.group} 삭제`, async () => {
        await deleteFromList(page, GROUP_ROUTE, vars.group!);
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      }),
    );
    await attempt('정책 삭제', () =>
      test.step(`teardown[1] ${vars.name} 삭제`, async () => {
        await deleteFromList(page, POLICY_ROUTE, vars.name!);
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      }),
    );
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
      await gotoRoute(page, POLICY_ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] 정책 ${vars.name} 생성 (${SOURCE_POLICY} 불러오기)`, async () => {
      await openCreateForm(page, POLICY_ROUTE, '정책 생성');
      await fillField(page, '정책명', vars.name!);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '다음');
      await page.getByRole('button', { name: '정책 불러오기', exact: true }).click();
      const picker = visibleModal(page);
      await picker.getByText(SOURCE_POLICY, { exact: true }).first().waitFor({ timeout: 15_000 });
      await picker
        .locator('tr.scp-body-row')
        .filter({ hasText: SOURCE_POLICY })
        .locator('i.table-select')
        .first()
        .click();
      await confirmModal(page, /정책 불러오기/, '확인');
      // "정책 불러오기 시, 기존에 입력한 내용은 모두 삭제되고 선택한 정책의 설정값으로 대체됩니다. 진행하시겠습니까?"
      await confirmModal(page, /대체됩니다/, '확인');
      // 불러온 서비스 블록(Allow · Billing Plan)이 그려지면 '액션 직접 추가' 버튼이 생긴다 (로딩 수 초)
      await page.getByRole('button', { name: '액션 직접 추가', exact: true }).first().waitFor({ timeout: 60_000 });
      await settleConsole(page, { appearGraceMs: 800 });
      await submitForm(page, '다음');
      // "JSON 모드로 변경하거나 화면 이동 시 …" 안내 (생성 과정 중 1회)
      await visibleModal(page)
        .waitFor({ timeout: 5_000 })
        .catch(() => undefined);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.getByText('입력 정보 확인').first().waitFor({ timeout: 15_000 });
      await submitForm(page, '생성');
      await confirmModal(page, /정책을 생성하시겠습니까/, '확인');
      await waitForRow(page, POLICY_ROUTE, vars.name!, { timeoutMs: 120_000, intervalMs: 5_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 그룹 ${vars.group} 생성`, async () => {
      await openCreateForm(page, GROUP_ROUTE, '사용자 그룹 생성');
      await fillField(page, '사용자 그룹명', vars.group!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인');
      await waitForRow(page, GROUP_ROUTE, vars.group!, { timeoutMs: 120_000, intervalMs: 5_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] 그룹에 정책 ${vars.name} 연결`, async () => {
      await openGroupPolicyTab(page);
      await topButton(page, '정책 연결').click();
      await settleConsole(page, { appearGraceMs: 800 });
      const search = page.locator('input[placeholder="정책명을 입력하세요."]:visible').first();
      await search.fill(vars.name!);
      await search.press('Enter');
      await settleConsole(page, { appearGraceMs: 800 });
      await row(page, vars.name!).first().waitFor({ timeout: 15_000 });
      await selectRow(page, vars.name!);
      await submitForm(page, '완료');
      await confirmModal(page, /연결하시겠습니까/, '확인');
      await topButton(page, '연결 해제').waitFor({ timeout: 30_000 });
      await row(page, vars.name!).first().waitFor({ timeout: 30_000 });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] 정책 ${vars.name} 연결 해제`, async () => {
      await selectRow(page, vars.name!);
      await topButton(page, '연결 해제').click();
      await confirmModal(page, /연결 해제하시겠습니까/, '확인');
      await row(page, vars.name!).first().waitFor({ state: 'detached', timeout: 30_000 });
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByText('정책 (0)', { exact: true }).first().waitFor({ timeout: 15_000 });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] 정책 ${vars.name} 설명 수정`, async () => {
      await openDetail(page, POLICY_ROUTE, vars.name!, /\/iam\/policy\/detail\//);
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id} edited`, { log });
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
    await test.step(`steps[6] 정책 상세 연결 대상에서 그룹 ${vars.group} 연결 → 해제`, async () => {
      await page.getByText(/^\s*연결 대상\s*\(\d+\)\s*$/).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByRole('button', { name: '사용자 그룹 연결', exact: true }).click();
      await settleConsole(page, { appearGraceMs: 1_000 });
      await logDetail(page, log, '사용자 그룹 연결');
      await logModal(page, log, '사용자 그룹 연결');
      const search = page.locator('input[placeholder*="그룹명"]:visible').last();
      await search.fill(vars.group!);
      await search.press('Enter');
      await settleConsole(page, { appearGraceMs: 800 });
      await row(page, vars.group!).first().waitFor({ timeout: 15_000 });
      await row(page, vars.group!).last().locator('i.table-select').first().click();
      const done = page.getByRole('button', { name: /^(완료|확인|연결)$/ }).last();
      await done.click();
      await confirmModal(page, /연결하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByText(/^\s*연결 대상\s*\(1\)\s*$/).first().waitFor({ timeout: 30_000 });
      log(`    연결 대상 (1): 그룹 ${vars.group}`);
      await selectRow(page, vars.group!);
      // 연결 해제 버튼은 사용자·사용자 그룹·역할 표마다 하나씩 → 그룹 표의 것(두 번째)
      await page.getByRole('button', { name: '연결 해제', exact: true }).nth(1).click();
      await confirmModal(page, /해제하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByText(/^\s*연결 대상\s*\(0\)\s*$/).first().waitFor({ timeout: 30_000 });
      log('    연결 대상 (0) 확인');
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
    });
    await test.step(`steps[7] 그룹 ${vars.group} 설명 수정`, async () => {
      await gotoRoute(page, GROUP_ROUTE);
      await row(page, vars.group!).locator(`span[role=button]:text-is("${vars.group}")`).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await logDetail(page, log, '그룹 상세');
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id} edited`, { log });
      await expectStep(page, resolveExpectation(scenario.steps[7]!.expect, vars), ctx(7));
    });
  });
});
