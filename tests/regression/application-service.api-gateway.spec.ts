// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/api-gateway.yaml.
// API(Region) → 리소스 /items → GET 메서드(HTTP) → 새 스테이지로 배포(L3) → JWT 인증·접근 제어·사용량 정책+API Key 생성·삭제(L3, 2026-09-30)
// → API 해지(스테이지·리소스 함께 삭제).
import { expect, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { pickGroupOption } from '../../src/console/form-group';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  isChecked,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/application-service/api-gateway.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/apigateway/api';
const RESOURCE_ROUTE = '#/apigateway/resource';
const STAGE_ROUTE = '#/apigateway/stage';
const RESOURCE = 'items';
const ENDPOINT = 'https://example.com';
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 열린 모달의 (유일한) 텍스트 입력란에 값을 넣는다. 뒤 화면에 같은 라벨(리소스명 등)이 있어 below() 대신 모달 안에서 찾는다 */
async function modalFill(page: Page, value: string) {
  const input = visibleModal(page).locator('input[type=text]:visible').first();
  await input.fill(value);
  if ((await input.inputValue()) !== value) {
    await input.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(value, { delay: 20 });
  }
  await input.press('Tab');
  if ((await input.inputValue()) !== value) throw new Error(`모달 입력란 값이 ${value} 가 아닙니다`);
}

/** 리소스·스테이지 화면 제목 옆 API 드롭다운에서 우리 API 를 고르고 "조회" (API 가 하나면 이미 골라져 있다) */
async function selectApi(page: Page, route: string) {
  await gotoRoute(page, route);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  const query = page.getByRole('button', { name: '조회', exact: true }).first();
  const dd = page.locator('.scp-dropdown:visible:left-of(button:has-text("조회"))').first();
  await dd.click();
  const menu = page.locator('.scp-menu:visible').last();
  await menu.waitFor({ timeout: 10_000 });
  await menu.locator('.scp-menu-item').filter({ hasText: vars.name! }).first().click();
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  await query.click();
  await settleConsole(page, { appearGraceMs: 800 });
}

const AUTH_ROUTE = '#/apigateway/authentication';
const ACL_ROUTE = '#/apigateway/accessControl';
const PLAN_ROUTE = '#/apigateway/usagePlan';
const FN_ROUTE = '#/scf/cloudfunctions';
const ACL_IP = '192.0.2.0/24'; // 문서용 대역 (RFC 5737)

/** 모달의 "연결할 스테이지 — 사용" 을 켜고 우리 스테이지를 고른다 (JWT·접근 제어 공통) */
async function connectStage(page: Page) {
  const modal = visibleModal(page);
  const use = modal.locator('.scp-select:visible').filter({ hasText: /^\s*사용\s*$/ }).first();
  if (await use.count()) {
    if (!(await isChecked(use))) await use.click();
    await page.waitForTimeout(800);
  }
  const dd = modal.locator('.scp-dropdown:visible').last();
  if ((await dd.count()) && !/Days/.test(await dd.innerText())) {
    await dd.click();
    const menu = page.locator('.scp-menu:visible').last();
    await menu.waitFor({ timeout: 5_000 });
    await menu.locator('.scp-menu-item').filter({ hasText: vars.stage! }).first().click();
    // 여러 개를 고르는 드롭다운이라 고른 뒤에도 메뉴가 열려 있어 "확인" 클릭을 가로챈다 → 모달의 라벨을 눌러 닫는다
    if (!(await menu.waitFor({ state: 'hidden', timeout: 1_500 }).then(() => true, () => false)))
      await modal.getByText('연결할 스테이지', { exact: true }).first().click();
    await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  } else {
    const box = modal.locator('.scp-select:visible').filter({ hasText: vars.stage! }).first();
    if ((await box.count()) && !(await isChecked(box))) await box.click();
  }
}

/** 모달 확인 뒤 이어지는 "…하시겠습니까?" 확인과 결과 안내 모달을 닫는다. 안내 모달 본문(토큰 등)은 기록하지 않는다 */
async function afterModalSubmit(page: Page, what: string) {
  const confirm = visibleModal(page).filter({ hasText: /하시겠습니까/ });
  if (await confirm.waitFor({ timeout: 5_000 }).then(() => true, () => false)) await confirmModal(page, /하시겠습니까/);
  for (let i = 0; i < 3 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  log(`  ${what} 생성 요청 완료`);
}

/** API 를 고른 목록에서 행 등장을 기다린다 (목록은 API 선택 + 조회 뒤에만 채워진다) */
async function waitListRow(page: Page, route: string, name: string) {
  const start = Date.now();
  for (;;) {
    await selectApi(page, route);
    if (await row(page, name).count()) {
      log(`  행: ${(await row(page, name).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      return;
    }
    if (Date.now() - start > 120_000) throw new Error(`${route} 에 ${name} 행이 120초 안에 나타나지 않았습니다`);
    await page.waitForTimeout(5_000);
  }
}

async function deleteListRow(page: Page, route: string, name: string) {
  await selectRow(page, name);
  await topButton(page, '삭제').click();
  await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: name });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  const start = Date.now();
  for (;;) {
    await selectApi(page, route);
    if (!(await row(page, name).count())) return;
    if (Date.now() - start > 120_000) throw new Error(`${route} 의 ${name} 행이 120초 안에 사라지지 않았습니다`);
    await page.waitForTimeout(5_000);
  }
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 25 * 60_000 });

  test.afterEach('정리 (API 해지)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    // steps[8] 의 Cloud Function 을 먼저 해지한다 (트리거가 API 를 참조)
    await gotoRoute(page, FN_ROUTE);
    if (await row(page, vars.fn!).count())
      await test.step(`teardown Cloud Function ${vars.fn} 해지`, async () => {
        await selectRow(page, vars.fn!);
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지/, '확인', { agree: true, resourceName: vars.fn });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, FN_ROUTE, vars.fn!, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      });
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 해지`, async () => {
      // Creating 중에는 해지가 안 될 수 있다 → Active 까지 기다린다
      await waitForRow(page, ROUTE, vars.name!, { status: /Active|Error|Failed/i, timeoutMs: 600_000, intervalMs: 15_000, log });
      await row(page, vars.name!).getByRole('button', { name: '서비스 해지', exact: true }).click();
      await confirmModal(page, /해지하시겠습니까/, '확인', { agree: true, resourceName: vars.name });
      await waitForRow(page, ROUTE, vars.name!, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
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
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] API ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '서비스 생성');
      await fillField(page, 'API명', vars.name!);
      await pickGroupOption(page, 'API 엔드포인트 유형', 'Region');
      await submitForm(page, '생성');
      await confirmModal(page, /API를 생성하시겠습니까/, '확인');
      await waitForRow(page, ROUTE, vars.name!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 리소스 /${RESOURCE} 생성`, async () => {
      await selectApi(page, RESOURCE_ROUTE);
      await page.getByRole('button', { name: '리소스 생성', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('리소스명').first().waitFor({ timeout: 10_000 });
      await modalFill(page, RESOURCE);
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /리소스를 생성하시겠습니까/, '확인');
      await page.getByText(`/${RESOURCE}`, { exact: true }).first().waitFor({ timeout: 30_000 });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] /${RESOURCE} GET 메서드 생성`, async () => {
      await page.getByText(`/${RESOURCE}`, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByRole('button', { name: '메서드 생성', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('메서드 유형').first().waitFor({ timeout: 10_000 });
      await modal.locator('.scp-dropdown:visible').first().click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 10_000 });
      await menu.locator('.scp-menu-item').filter({ hasText: /^\s*GET\s*$/ }).first().click();
      await modal.locator('.scp-select').filter({ hasText: /^\s*HTTP\s*$/ }).first().click();
      await modal.getByText('엔드포인트 URL').first().waitFor({ timeout: 10_000 });
      await modalFill(page, ENDPOINT);
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /메서드를 생성하시겠습니까/, '확인');
      await page.waitForURL(/methodType=GET/, { timeout: 30_000 });
      await page.getByText(ENDPOINT, { exact: true }).first().waitFor({ timeout: 30_000 });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] 스테이지 ${vars.stage} 로 배포`, async () => {
      await page.getByRole('button', { name: 'API 배포', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('신규 스테이지명').first().waitFor({ timeout: 10_000 });
      await modalFill(page, vars.stage!);
      await modal.getByRole('button', { name: '배포', exact: true }).click();
      await confirmModal(page, /배포하시겠습니까/, '확인');
      await page.waitForTimeout(2_000);
      await selectApi(page, STAGE_ROUTE);
      await page.getByText(vars.stage!, { exact: true }).first().waitFor({ timeout: 30_000 });
      await page.getByText(vars.stage!, { exact: true }).first().click(); // 트리에서 스테이지 선택 → 배포 이력 표
      await settleConsole(page, { appearGraceMs: 800 });
      await page.locator('tr.scp-body-row').filter({ hasText: 'Active' }).first().waitFor({ timeout: 60_000 });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    // L3 (2026-09-30, 에이전트 A 2차): 인증(JWT) · 접근 제어 · 사용량 정책(+API Key). 각 화면은 제목 옆 API 드롭다운 + "조회" 로 우리 API 를 고른다.
    await test.step(`steps[5] JWT 인증 ${vars.jwt} 생성·삭제`, async () => {
      await selectApi(page, AUTH_ROUTE);
      await page.getByRole('button', { name: 'JSON Web Token 생성', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('JWT명').first().waitFor({ timeout: 10_000 });
      await modalFill(page, vars.jwt!);
      await connectStage(page);
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await afterModalSubmit(page, 'JWT');
      await waitListRow(page, AUTH_ROUTE, vars.jwt!);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
      await deleteListRow(page, AUTH_ROUTE, vars.jwt!);
    });
    await test.step(`steps[6] 접근 제어 ${vars.acl} 생성·삭제`, async () => {
      await selectApi(page, ACL_ROUTE);
      await page.getByRole('button', { name: '접근 제어 생성', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('접근 제어명').first().waitFor({ timeout: 10_000 });
      const inputs = modal.locator('input[type=text]:visible, textarea:visible');
      await fillStable(page, inputs.nth(0), vars.acl!, '접근 제어명');
      await fillStable(page, inputs.nth(1), ACL_IP, 'Public 접근 허용 IP');
      await connectStage(page);
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await afterModalSubmit(page, '접근 제어');
      await waitListRow(page, ACL_ROUTE, vars.acl!);
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
      await deleteListRow(page, ACL_ROUTE, vars.acl!);
    });
    await test.step(`steps[7] 사용량 정책 ${vars.plan} + API Key ${vars.key} 생성·삭제`, async () => {
      await selectApi(page, PLAN_ROUTE);
      await page.getByRole('button', { name: '사용량 정책 생성', exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 1_000 });
      await fillField(page, '사용량 정책명', vars.plan!);
      await fillField(page, '할당량', '100');
      await pickOption(page, '할당량', '매일');
      await submitForm(page, '완료');
      await afterModalSubmit(page, '사용량 정책');
      await waitListRow(page, PLAN_ROUTE, vars.plan!);
      // API Key: 사용량 정책 상세에서 만든다(API: POST usage-plans/{id}/api-keys)
      await row(page, vars.plan!).getByText(vars.plan!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 1_000 });
      await page.getByRole('button', { name: 'API Key 생성', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('API Key명').first().waitFor({ timeout: 10_000 });
      await fillStable(page, modal.locator('input[type=text]:visible').first(), vars.key!, 'API Key명');
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await afterModalSubmit(page, 'API Key'); // 키 값이 보이는 안내가 떠도 본문은 기록하지 않는다
      const keyRow = row(page, vars.key!);
      await expect(keyRow.first(), `연결된 API Key 에 ${vars.key}`).toBeVisible({ timeout: 60_000 });
      await expectStep(page, resolveExpectation(scenario.steps[7]!.expect, vars), ctx(7));
      // API Key 삭제: "연결된 API Key" 표에서 행 선택 → 표 위 "삭제"
      await selectRow(page, vars.key!);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.key });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await expect(keyRow, 'API Key 삭제 뒤 행 없음').toHaveCount(0, { timeout: 60_000 });
      // 사용량 정책 삭제: 상세 상단 "사용량 정책 삭제"
      await topButton(page, '사용량 정책 삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.plan });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      const start = Date.now();
      for (;;) {
        await selectApi(page, PLAN_ROUTE);
        if (!(await row(page, vars.plan!).count())) break;
        if (Date.now() - start > 120_000) throw new Error(`사용량 정책 ${vars.plan} 이 120초 안에 사라지지 않았습니다`);
        await page.waitForTimeout(5_000);
      }
    });
    // Cloud Functions API Gateway 트리거 (2026-09-30, 에이전트 A 2차): 위에서 배포한 API·스테이지를 트리거로 단다.
    // 트리거 모달: 트리거 종류(API Gateway | Cronjob) → API명 → 스테이지명(리소스·메서드가 있고 배포된 스테이지여야 정상 트리거)
    await test.step(`steps[8] Cloud Function ${vars.fn} 에 API Gateway 트리거 추가·삭제`, async () => {
      await openCreateForm(page, FN_ROUTE, '서비스 생성');
      await fillField(page, 'Function명', vars.fn!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, FN_ROUTE, vars.fn!, { status: /Ready/, timeoutMs: 600_000, intervalMs: 15_000, log });
      await row(page, vars.fn!).getByText(vars.fn!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByRole('button', { name: '트리거 추가', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('트리거 종류').first().waitFor({ timeout: 10_000 });
      const pick = async (nth: number, text: string | RegExp) => {
        await modal.locator('.scp-dropdown:visible').nth(nth).click();
        const menu = page.locator('.scp-menu:visible').last();
        await menu.waitFor({ timeout: 10_000 });
        await menu.locator('.scp-menu-item').filter({ hasText: text }).first().click();
        await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(800);
      };
      await pick(0, 'API Gateway');
      await modal.getByText('스테이지명').first().waitFor({ timeout: 10_000 });
      await pick(1, vars.name!);
      await pick(2, vars.stage!);
      const ok = modal.getByRole('button', { name: '확인', exact: true });
      await expect(ok, '트리거 모달 확인 활성').toBeEnabled({ timeout: 10_000 });
      try {
        await ok.click({ timeout: 10_000 });
      } catch {
        await ok.click({ force: true });
      }
      await confirmModal(page, /트리거를 추가하시겠습니까/);
      // 추가 뒤 안내 모달의 "확인" 은 API Gateway 리소스 화면으로 이동시킨다(2026-09-30 1차: API 에 리소스 /<함수명> + 메서드 7종이 자동 생성됨)
      // → 안내 문구만 남기고 "취소"(없으면 닫기) 로 닫은 뒤 함수 상세로 돌아온다
      // 확인 뒤 트리거 모달이 진행 표시(스피너)와 함께 수십 초 남는다(2026-09-30 2차) → 아무것도 누르지 말고 닫힐 때까지 기다린다
      await expect(modal.getByText('트리거 종류').first(), '트리거 모달이 닫혀야 한다').toBeHidden({ timeout: 180_000 });
      const notice = visibleModal(page);
      if (await notice.waitFor({ timeout: 3_000 }).then(() => true, () => false)) {
        log(`  트리거 추가 뒤 안내: ${(await notice.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
        const cancel = notice.getByRole('button', { name: '취소', exact: true });
        if (await cancel.count()) await cancel.click();
        else await dismissModalIfAny(page);
      }
      if (!page.url().includes('/scf/cloudfunctions/detail')) {
        log(`  트리거 추가 뒤 이동한 화면: ${page.url().split('#')[1]}`);
        await gotoRoute(page, FN_ROUTE);
        await row(page, vars.fn!).getByText(vars.fn!, { exact: true }).first().click();
      }
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByText(/^트리거 \(\d+\)$/).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      // 실측(2026-09-30): API Gateway 트리거 1개 추가 = API 에 리소스 /<함수명> + 메서드 7종(DELETE·GET·HEAD·OPTIONS·PATCH·POST·PUT)이 생기고
      // 함수 트리거 탭엔 메서드마다 한 행씩 "트리거 (7)" 이 된다
      await expect(page.getByText(/^트리거 \(7\)$/).first(), '트리거 탭 개수 7(메서드별)').toBeVisible({ timeout: 30_000 });
      const trows = page.locator('tr.scp-body-row:visible').filter({ hasText: vars.name! });
      await expect(trows, 'API 이름이 든 트리거 행 7개').toHaveCount(7, { timeout: 30_000 });
      log(`  트리거 행 예: ${(await trows.first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[8]!.expect, vars), ctx(8));
      for (let i = 0; i < 7; i++) await trows.nth(i).locator('i.table-select').first().click();
      await topButton(page, '삭제').click();
      await confirmModal(page, /트리거를 삭제하시겠습니까/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await expect(page.getByText(/^트리거 \(0\)$/).first(), '트리거 삭제 뒤 개수 0').toBeVisible({ timeout: 30_000 });
    });
  });
});
