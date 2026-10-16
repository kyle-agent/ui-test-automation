// 직접 작성 (2026-10-16, agent C). 시나리오: scenarios/iam/user.yaml. 콘솔 사실: docs/service-facts/iam.md
// IAM 사용자는 삭제에 로그인 계정 비밀번호 확인이 필요해 spec 이 만들고 지울 수 없다 → 사람이 지정한 테스트 사용자(IAM_TEST_USER)에
// 설명 수정(updateiamuser) · 그룹 추가/제외(addgroupmember/removegroupmember) · 권한 추가/해제(adduserpolicybinding/removeuserpolicybinding)만 한다.
// 그룹은 spec 이 만들고 지운다. 비밀번호 재설정·인증키는 자격 증명이라 건드리지 않는다.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { logWriteRequests } from '../../src/console/api-log';
import { editDescriptionRoundTrip, logDetail, logModal } from '../../src/console/detail-edit';
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

const scenario = loadScenario('scenarios/iam/user.yaml');
const vars = scenarioVars(scenario);
const USER = process.env.IAM_TEST_USER?.trim() ?? '';
vars.user = USER;
const USER_ROUTE = '#/iam/user/list';
const GROUP_ROUTE = '#/iam/group/list';
const POLICY = 'CostNavigatorReadOnlyAccess';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 상세 탭 "사용자 (n)" / "권한 (n)" (숨은 왼쪽 메뉴의 같은 글자는 visible 로 뺀다) */
const tab = (page: Page, name: string, n?: number) =>
  page
    .getByText(new RegExp(`^\\s*${name}\\s*\\(${n === undefined ? '\\d+' : n}\\)\\s*$`))
    .locator('visible=true')
    .first();

async function openTab(page: Page, name: string): Promise<void> {
  await tab(page, name).click();
  await settleConsole(page, { appearGraceMs: 800 });
}

async function waitTabCount(page: Page, name: string, n: number): Promise<void> {
  // 저장 뒤 탭 개수는 상세를 다시 읽어야 바뀌는 경우가 있다
  for (let attempt = 0; attempt < 6; attempt++) {
    if (
      await tab(page, name, n)
        .isVisible()
        .catch(() => false)
    )
      return;
    await page.waitForTimeout(3_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 1_000 });
    await openTab(page, name).catch(() => undefined);
  }
  throw new Error(`탭 "${name} (${n})" 이 보이지 않습니다 (${page.url()})`);
}

/** 목록 → 이름 링크(span[role=button]) → 상세 */
async function openDetailByLink(page: Page, route: string, name: string, detailUrl: RegExp): Promise<void> {
  await gotoRoute(page, route);
  await row(page, name).first().waitFor({ timeout: 15_000 });
  await row(page, name).first().locator('span[role=button], a, [class*=link]').first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.waitForURL(detailUrl, { timeout: 15_000 });
}

/** "… 추가" 선택 화면(검색 → 행 선택 → 완료 → 확인 모달) */
async function pickAndFinish(page: Page, placeholder: string, name: string): Promise<void> {
  // 선택 화면의 검색칸: 그룹 "정확한 사용자 ID를 입력하세요." · 권한 "정책명을 입력하세요." (상단 전역 검색은 다른 문구)
  const input = page.locator(`input[placeholder*="${placeholder}"]:visible`).last();
  await input.fill(name);
  await input.press('Enter');
  await settleConsole(page, { appearGraceMs: 800 });
  await row(page, name).first().waitFor({ timeout: 15_000 });
  await selectRow(page, name);
  await submitForm(page, '완료');
  await visibleModal(page).waitFor({ timeout: 10_000 });
  await logModal(page, log, '완료 확인');
  await confirmModal(page, undefined, '확인');
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await settleConsole(page, { appearGraceMs: 800 });
}

async function deleteGroup(page: Page): Promise<void> {
  await gotoRoute(page, GROUP_ROUTE);
  if ((await row(page, vars.group!).count()) === 0) return;
  await selectRow(page, vars.group!);
  await topButton(page, '삭제').click();
  await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true, resourceName: vars.group });
  await waitForRow(page, GROUP_ROUTE, vars.group!, {
    gone: true,
    timeoutMs: 120_000,
    intervalMs: 5_000,
    log,
  });
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light', '@action'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });
  if (!USER)
    test.skip(
      true,
      'IAM_TEST_USER(지정 테스트 사용자 ID)가 없다 — 사용자 삭제는 로그인 계정 비밀번호 확인이 필요해 spec 이 사용자를 만들 수 없다',
    );

  test.afterEach('정리 (그룹)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await test.step(`teardown[0] ${vars.group} 삭제`, async () => {
      await deleteGroup(page);
      await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
    });
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );
    await logWriteRequests(page, log);

    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, USER_ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
      if ((await row(page, USER).count()) === 0)
        throw new Error(`지정 테스트 사용자 ${USER} 가 사용자 목록에 없습니다 (IAM_TEST_USER 확인)`);
    });

    await test.step(`steps[1] 사용자 ${USER} 설명 수정 → 되돌림`, async () => {
      await openDetailByLink(page, USER_ROUTE, USER, /#\/iam\/user\/detail\/[0-9a-f]+/);
      await logDetail(page, log, '사용자 상세');
      await editDescriptionRoundTrip(page, `scp-console-tests ${vars.run_id}`, log);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });

    await test.step(`steps[2] 그룹 ${vars.group} 생성`, async () => {
      await openCreateForm(page, GROUP_ROUTE, '사용자 그룹 생성');
      await fillField(page, '사용자 그룹명', vars.group!);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, GROUP_ROUTE, vars.group!, { timeoutMs: 120_000, intervalMs: 5_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });

    await test.step(`steps[3] 그룹 ${vars.group} 에 사용자 ${USER} 추가`, async () => {
      await openDetailByLink(page, GROUP_ROUTE, vars.group!, /#\/iam\/group\/detail\/[0-9a-f]+/);
      await openTab(page, '사용자');
      await topButton(page, '사용자 추가').click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/\/users\/update/, { timeout: 15_000 });
      await pickAndFinish(page, '사용자 ID', USER);
      await page.waitForURL(/#\/iam\/group\/detail\//, { timeout: 15_000 });
      await waitTabCount(page, '사용자', 1);
      await row(page, USER).first().waitFor({ timeout: 15_000 });
      log(`    그룹 사용자 탭에 ${USER} 추가 확인`);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });

    await test.step(`steps[4] 그룹 ${vars.group} 에서 사용자 ${USER} 제외`, async () => {
      await selectRow(page, USER);
      await topButton(page, '제외').click();
      await visibleModal(page).waitFor({ timeout: 10_000 });
      await logModal(page, log, '제외 확인');
      await confirmModal(page, undefined, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 1_000 });
      await openTab(page, '사용자');
      await waitTabCount(page, '사용자', 0);
      log(`    그룹 사용자 탭에서 ${USER} 제외 확인`);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });

    await test.step(`steps[5] 사용자 ${USER} 권한 탭에 정책 ${POLICY} 추가`, async () => {
      await openDetailByLink(page, USER_ROUTE, USER, /#\/iam\/user\/detail\/[0-9a-f]+/);
      await openTab(page, '권한');
      await topButton(page, '권한 추가').click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/\/policy\/update/, { timeout: 15_000 });
      // 권한 추가 화면은 라디오 "사용자 그룹에 추가"(기본) · "권한 복사" · "정책 직접 연결" — 정책 표는 세 번째를 골라야 나온다 (프로브 10-16)
      await page
        .getByText(/^\s*정책 직접 연결\s*$/)
        .locator('visible=true')
        .first()
        .click();
      await settleConsole(page, { appearGraceMs: 1_000 });
      await logDetail(page, log, '권한 추가 화면(정책 직접 연결)');
      await pickAndFinish(page, '정책명', POLICY);
      await page.waitForURL(/#\/iam\/user\/detail\//, { timeout: 15_000 });
      await waitTabCount(page, '권한', 1);
      await row(page, POLICY).first().waitFor({ timeout: 15_000 });
      log(`    권한 탭에 ${POLICY} 추가 확인`);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });

    await test.step(`steps[6] 사용자 ${USER} 의 정책 ${POLICY} 연결 해제`, async () => {
      await selectRow(page, POLICY);
      await topButton(page, '연결 해제').click();
      await visibleModal(page).waitFor({ timeout: 10_000 });
      await logModal(page, log, '연결 해제 확인');
      await confirmModal(page, undefined, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 1_000 });
      await openTab(page, '권한');
      await waitTabCount(page, '권한', 0);
      log(`    권한 탭에서 ${POLICY} 해제 확인`);
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
    });
  });
});
