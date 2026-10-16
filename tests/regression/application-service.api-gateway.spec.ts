// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/api-gateway.yaml.
// API(Region) → 리소스 /items → GET 메서드(HTTP) → 새 스테이지로 배포(L3) → JWT 인증·접근 제어·사용량 정책+API Key 생성·삭제(L3, 2026-09-30)
// → API 해지(스테이지·리소스 함께 삭제).
// 2026-10-07 6차(에이전트 6D): 사용량 정책 설명·할당량 수정(steps[7]), API 설명(steps[9]), 메서드 엔드포인트 수정(steps[10]),
// 스테이지 설명 수정 + 같은 스테이지 재배포 → 배포 변경(steps[11]), 메서드 → 스테이지 삭제(steps[12]).
// 2026-10-16 에이전트 B: 인증·접근 제어·API Key 행 끝 ⋮ 메뉴 "수정" 으로 setauth(steps[5]) · setaccesscontrol(steps[6]) · setapikeydescription(steps[7]),
// 리소스 정책 화면(#/apigateway/resourcePolicy) 기본 정책 삭제 → 기본 정책 템플릿으로 재생성(steps[13], deleteresourcepolicy · setresourcepolicy). 실측 경로는 docs/service-facts/application-service-api-gateway.md.
// deleteresource 는 여전히 불가: 메서드가 없는 새 리소스를 트리에서 골라도 트리 위 "삭제" 가 비활성(2026-10-16 재확인, 우클릭 메뉴·체크박스 없음).
import { expect, type Locator, type Page } from '@playwright/test';
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
import {
  detailValue,
  editDetailText,
  logModal,
  openLabelEdit,
  saveModal,
  waitDetailValue,
} from '../../src/console/detail-edit';

const scenario = loadScenario('scenarios/application-service/api-gateway.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/apigateway/api';
const RESOURCE_ROUTE = '#/apigateway/resource';
const STAGE_ROUTE = '#/apigateway/stage';
const RESOURCE = 'items';
const ENDPOINT = 'https://example.com';
const ENDPOINT_EDITED = 'https://example.org';
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
const POLICY_ROUTE = '#/apigateway/resourcePolicy';
const FN_ROUTE = '#/scf/cloudfunctions';
const ACL_IP = '192.0.2.0/24'; // 문서용 대역 (RFC 5737)

/** 모달의 "연결할 스테이지 — 사용" 을 켜고 우리 스테이지를 고른다 (JWT·접근 제어 공통) */
async function connectStage(page: Page) {
  const modal = visibleModal(page);
  const use = modal
    .locator('.scp-select:visible')
    .filter({ hasText: /^\s*사용\s*$/ })
    .first();
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
    if (
      !(await menu.waitFor({ state: 'hidden', timeout: 1_500 }).then(
        () => true,
        () => false,
      ))
    )
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
  if (
    await confirm.waitFor({ timeout: 5_000 }).then(
      () => true,
      () => false,
    )
  )
    await confirmModal(page, /하시겠습니까/);
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
    if (Date.now() - start > 120_000)
      throw new Error(`${route} 에 ${name} 행이 120초 안에 나타나지 않았습니다`);
    await page.waitForTimeout(5_000);
  }
}

/** 스테이지 화면에서 우리 API 를 고르고 트리의 스테이지를 누른다 */
async function openStage(page: Page) {
  await selectApi(page, STAGE_ROUTE);
  await page.getByText(vars.stage!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
}

/**
 * 목록 행 끝 ⋮(i.i-card-handle) → 메뉴("수정 | 삭제") → item → 열린 수정 모달을 돌려준다 (인증·접근 제어·연결된 API Key 표, 2026-10-16 실측).
 * 메뉴는 .scp-menu 로 떠서 pickOption 과 같은 구조다.
 */
async function openRowMenu(page: Page, r: Locator, item: string): Promise<Locator> {
  await r.locator('i.i-card-handle').first().click();
  const menu = page.locator('.scp-menu:visible').last();
  await menu.waitFor({ timeout: 5_000 });
  await menu
    .locator('.scp-menu-item')
    .filter({ hasText: new RegExp(`^\\s*${item}\\s*$`) })
    .first()
    .click();
  const modal = visibleModal(page);
  await modal.waitFor({ timeout: 10_000 });
  return modal;
}

/** 모달의 "연결할 스테이지 — 사용" 체크를 원하는 상태로 */
async function setStageUse(page: Page, modal: Locator, on: boolean) {
  const use = modal
    .locator('.scp-select:visible')
    .filter({ hasText: /^\s*사용\s*$/ })
    .first();
  await use.waitFor({ timeout: 5_000 });
  if ((await isChecked(use)) !== on) await use.click();
  await page.waitForTimeout(500);
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
    if (Date.now() - start > 120_000)
      throw new Error(`${route} 의 ${name} 행이 120초 안에 사라지지 않았습니다`);
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
        await waitForRow(page, FN_ROUTE, vars.fn!, {
          gone: true,
          timeoutMs: 300_000,
          intervalMs: 10_000,
          log,
        });
      });
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 해지`, async () => {
      // Creating 중에는 해지가 안 될 수 있다 → Active 까지 기다린다
      await waitForRow(page, ROUTE, vars.name!, {
        status: /Active|Error|Failed/i,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
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
      await waitForRow(page, ROUTE, vars.name!, {
        status: /Active/,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
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
      await menu
        .locator('.scp-menu-item')
        .filter({ hasText: /^\s*GET\s*$/ })
        .first()
        .click();
      await modal
        .locator('.scp-select')
        .filter({ hasText: /^\s*HTTP\s*$/ })
        .first()
        .click();
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
      await page
        .locator('tr.scp-body-row')
        .filter({ hasText: 'Active' })
        .first()
        .waitFor({ timeout: 60_000 });
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
      // setauth: 행 ⋮ → 수정 → "연결할 스테이지 사용" 끔 → 확인 → "JSON Web Token을 수정하시겠습니까?" → 행의 연결 스테이지 수 1 → 0 (PUT …/auths/{id})
      const edit = await openRowMenu(page, row(page, vars.jwt!).first(), '수정');
      await edit.getByText('JSON Web Token 수정').first().waitFor({ timeout: 10_000 });
      await setStageUse(page, edit, false);
      await saveModal(page, log);
      await selectApi(page, AUTH_ROUTE);
      const cells = (await row(page, vars.jwt!).first().locator('td').allInnerTexts()).map((s) => s.trim());
      log(`  JWT 행(수정 뒤): ${cells.filter(Boolean).join(' | ')}`);
      expect(cells, 'JWT 연결 스테이지 수가 0 이어야 합니다').toContain('0');
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
      // setaccesscontrol: 행 ⋮ → 수정 → 설명 입력 → 확인 → "접근 제어를 수정하시겠습니까?" (PUT …/access-controls/{id}). 목록에 설명 열이 없어 수정 모달을 다시 열어 값을 확인한다
      const desc = `qa ${vars.run_id}`;
      const edit = await openRowMenu(page, row(page, vars.acl!).first(), '수정');
      await edit.getByText('접근 제어 수정').first().waitFor({ timeout: 10_000 });
      await fillStable(page, edit.locator('textarea:visible').first(), desc, '접근 제어 설명');
      await saveModal(page, log);
      await selectApi(page, ACL_ROUTE);
      const again = await openRowMenu(page, row(page, vars.acl!).first(), '수정');
      await expect(again.locator('textarea:visible').first(), '수정한 설명이 남아 있어야 합니다').toHaveValue(
        desc,
        { timeout: 10_000 },
      );
      log(`  접근 제어 설명 = ${desc}`);
      await again.getByRole('button', { name: '취소', exact: true }).click();
      await again.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
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
      // 6차: 사용량 정책 설명 · 할당량 수정 (API setusageplandescription · setusageplanquota)
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id}`, { log });
      const quota = await openLabelEdit(page, '할당량');
      await fillStable(page, quota.locator('input[type=text]:visible').first(), '200', '할당량');
      await saveModal(page, log);
      await waitDetailValue(page, '할당량', (v) => v === '매일 200', { log, timeoutMs: 60_000 });
      // setapikeydescription(2026-10-16): "연결된 API Key" 행 ⋮ → 수정 → "연결된 API Key 수정"(설명) → 확인 → "API Key를 수정하시겠습니까?" → 행 "Key 설명" 열 (PUT …/api-keys/{id}/description)
      const keyEdit = await openRowMenu(page, keyRow.first(), '수정');
      await keyEdit.getByText('연결된 API Key 수정').first().waitFor({ timeout: 10_000 });
      await fillStable(
        page,
        keyEdit.locator('textarea:visible').first(),
        `qa ${vars.run_id}`,
        'API Key 설명',
      );
      await saveModal(page, log);
      await expect(keyRow.first(), 'API Key 행에 수정한 설명').toContainText(`qa ${vars.run_id}`, {
        timeout: 60_000,
      });
      log(`  API Key 행(수정 뒤): ${(await keyRow.first().innerText()).replace(/\s+/g, ' ').trim()}`);
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
        if (Date.now() - start > 120_000)
          throw new Error(`사용량 정책 ${vars.plan} 이 120초 안에 사라지지 않았습니다`);
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
      await waitForRow(page, FN_ROUTE, vars.fn!, {
        status: /Ready/,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
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
      await expect(modal.getByText('트리거 종류').first(), '트리거 모달이 닫혀야 한다').toBeHidden({
        timeout: 180_000,
      });
      const notice = visibleModal(page);
      if (
        await notice.waitFor({ timeout: 3_000 }).then(
          () => true,
          () => false,
        )
      ) {
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
      await page
        .getByText(/^트리거 \(\d+\)$/)
        .first()
        .click();
      await settleConsole(page, { appearGraceMs: 800 });
      // 실측(2026-09-30): API Gateway 트리거 1개 추가 = API 에 리소스 /<함수명> + 메서드 7종(DELETE·GET·HEAD·OPTIONS·PATCH·POST·PUT)이 생기고
      // 함수 트리거 탭엔 메서드마다 한 행씩 "트리거 (7)" 이 된다
      await expect(page.getByText(/^트리거 \(7\)$/).first(), '트리거 탭 개수 7(메서드별)').toBeVisible({
        timeout: 30_000,
      });
      const trows = page.locator('tr.scp-body-row:visible').filter({ hasText: vars.name! });
      await expect(trows, 'API 이름이 든 트리거 행 7개').toHaveCount(7, { timeout: 30_000 });
      log(`  트리거 행 예: ${(await trows.first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[8]!.expect, vars), ctx(8));
      for (let i = 0; i < 7; i++) await trows.nth(i).locator('i.table-select').first().click();
      await topButton(page, '삭제').click();
      await confirmModal(page, /트리거를 삭제하시겠습니까/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await expect(page.getByText(/^트리거 \(0\)$/).first(), '트리거 삭제 뒤 개수 0').toBeVisible({
        timeout: 30_000,
      });
    });
    // ── 6차(2026-10-07, 에이전트 6D): 수정·삭제 동작 ──
    await test.step(`steps[9] ${scenario.steps[9]!.goal}`, async () => {
      // API setapidescription: API 상세 "설명" 연필
      await gotoRoute(page, ROUTE);
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await editDetailText(page, '설명', `qa ${vars.run_id}`, { log });
      await expectStep(page, resolveExpectation(scenario.steps[9]!.expect, vars), ctx(9));
    });
    await test.step(`steps[10] ${scenario.steps[10]!.goal}`, async () => {
      // API setmethod: 메서드 상세 "수정"
      await selectApi(page, RESOURCE_ROUTE);
      await page.getByText(`/${RESOURCE}`, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      // 트리에는 steps[8] 트리거가 만든 /<함수명> 리소스의 GET(Cloud Function 통합)도 있다 → /items 리소스 상세 주소에서 메서드 상세 주소를 만든다
      await page.waitForURL(/resource\/detail\?/, { timeout: 15_000 });
      await page.goto(
        page.url().replace('/resource/detail?', '/resource/method/detail?') + '&methodType=GET',
      );
      await settleConsole(page, { appearGraceMs: 800 });
      await expect(
        page.getByText(ENDPOINT, { exact: true }).first(),
        '/items GET 메서드 상세(엔드포인트 URL)',
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: '수정', exact: true }).last().click();
      await settleConsole(page, { appearGraceMs: 800 });
      const modal = visibleModal(page);
      const inModal = await modal.waitFor({ timeout: 5_000 }).then(
        () => true,
        () => false,
      );
      const scope = inModal ? modal : page.locator('body');
      if (inModal) await logModal(page, log, '메서드 수정');
      else log(`  메서드 수정 화면: ${page.url().split('#')[1]}`);
      const inputs = scope.locator('input[type=text]:visible');
      let idx = -1;
      for (let i = 0; i < (await inputs.count()); i++)
        if ((await inputs.nth(i).inputValue()) === ENDPOINT) idx = i;
      if (idx < 0) throw new Error('메서드 수정에 엔드포인트 URL 입력칸이 없습니다');
      await fillStable(page, inputs.nth(idx), ENDPOINT_EDITED, '엔드포인트 URL');
      await saveModal(page, log);
      await waitDetailValue(page, '엔드포인트 URL', (v) => v === ENDPOINT_EDITED, { log, timeoutMs: 60_000 });
      await expectStep(page, resolveExpectation(scenario.steps[10]!.expect, vars), ctx(10));
    });
    await test.step(`steps[11] ${scenario.steps[11]!.goal}`, async () => {
      // API setstageconfiguration: 스테이지 "수정"
      await openStage(page);
      await page.getByRole('button', { name: '수정', exact: true }).last().click();
      const modal = visibleModal(page);
      await modal.waitFor({ timeout: 10_000 });
      await logModal(page, log, '스테이지 수정');
      const ta = modal.locator('textarea:visible').first();
      await fillStable(
        page,
        (await ta.count()) ? ta : modal.locator('input[type=text]:visible').last(),
        `qa ${vars.run_id}`,
        '스테이지 설명',
      );
      await saveModal(page, log);
      await waitDetailValue(page, '스테이지 설명', (v) => v.includes(`qa ${vars.run_id}`), {
        log,
        timeoutMs: 60_000,
      });
      // API setstageactivedeployment: 같은 스테이지로 다시 배포(배포 2개) → 이전 배포 선택 → "배포 변경"
      const firstDeployment = await detailValue(page, '배포 ID');
      await selectApi(page, RESOURCE_ROUTE);
      await page.getByRole('button', { name: 'API 배포', exact: true }).first().click();
      const dm = visibleModal(page);
      await dm.getByText('스테이지명').first().waitFor({ timeout: 10_000 });
      await dm.locator('.scp-dropdown:visible').first().click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 5_000 });
      await menu.locator('.scp-menu-item').filter({ hasText: vars.stage! }).first().click();
      await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
      await logModal(page, log, 'API 재배포');
      await dm.getByRole('button', { name: '배포', exact: true }).click();
      await confirmModal(page, /배포하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await openStage(page);
      await waitDetailValue(page, '배포 ID', (v) => v !== firstDeployment && v.length > 0, {
        log,
        timeoutMs: 60_000,
      });
      const old = page.locator('tr.scp-body-row:visible').filter({ hasText: firstDeployment }).first();
      await old.locator('i.table-select').first().click();
      await page.getByRole('button', { name: '배포 변경', exact: true }).click();
      if (
        await visibleModal(page)
          .waitFor({ timeout: 5_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await logModal(page, log, '배포 변경');
        await saveModal(page, log);
      }
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await openStage(page);
      await waitDetailValue(page, '배포 ID', (v) => v === firstDeployment, { log, timeoutMs: 60_000 });
      log('  배포 변경: 첫 배포가 다시 활성');
      await expectStep(page, resolveExpectation(scenario.steps[11]!.expect, vars), ctx(11));
    });
    await test.step(`steps[12] ${scenario.steps[12]!.goal}`, async () => {
      // API deletemethod: 리소스 상세 메서드 표 행 "삭제"
      await selectApi(page, RESOURCE_ROUTE);
      await page.getByText(`/${RESOURCE}`, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      const getRow = page.locator('tr.scp-body-row:visible').filter({ hasText: 'GET' }).first();
      await getRow.getByRole('button', { name: '삭제', exact: true }).click();
      await confirmModal(page, /삭제/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await expect(
        page.locator('tr.scp-body-row:visible').filter({ hasText: 'GET' }),
        'GET 메서드 행이 사라져야 합니다',
      ).toHaveCount(0, { timeout: 60_000 });
      log('  메서드 GET 삭제');
      // API deletestage: 스테이지 화면 상단 "삭제"
      await openStage(page);
      await page.getByRole('button', { name: '삭제', exact: true }).first().click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.stage });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await selectApi(page, STAGE_ROUTE);
      await expect(
        page.getByText(vars.stage!, { exact: true }),
        `스테이지 ${vars.stage} 가 사라져야 합니다`,
      ).toHaveCount(0, { timeout: 60_000 });
      log(`  스테이지 ${vars.stage} 삭제`);
      // deleteresource 는 하지 않는다: 메서드·스테이지를 모두 지운 뒤에도 리소스 상세의 "삭제" 버튼이 비활성이었다(2026-10-07). 리소스는 teardown 의 API 해지로 함께 지워진다.
      await expectStep(page, resolveExpectation(scenario.steps[12]!.expect, vars), ctx(12));
    });
    await test.step(`steps[13] ${scenario.steps[13]!.goal}`, async () => {
      // 리소스 정책(2026-10-16): API 생성 시 기본 정책(Sid DefaultStatement)이 이미 있다 → "삭제"(deleteresourcepolicy, DELETE …/resource-policies)
      // → "리소스 정책 생성" → 템플릿 "기본 정책" → "완료" → "리소스 정책을 생성하시겠습니까?" (setresourcepolicy, PUT …/resource-policies)
      await selectApi(page, POLICY_ROUTE);
      await expect(
        page.getByText('DefaultStatement').first(),
        '기본 리소스 정책이 있어야 합니다',
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: '삭제', exact: true }).first().click();
      await confirmModal(page, /리소스 정책을 삭제하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await selectApi(page, POLICY_ROUTE);
      const create = page.getByRole('button', { name: '리소스 정책 생성', exact: true }).first();
      await expect(create, '정책 삭제 뒤 "리소스 정책 생성" 버튼').toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByText('DefaultStatement'),
        '정책 삭제 뒤 본문에 정책이 없어야 합니다',
      ).toHaveCount(0);
      log('  리소스 정책 삭제 확인');
      await create.click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/resourcePolicy\/request/, { timeout: 15_000 });
      await pickOption(page, '정책 템플릿', '기본 정책');
      // JSON 편집기(Monaco)의 textarea 는 보이는 줄만 담아 뒤쪽 "Sid" 줄이 잘린다(1차 실행 실패) → 앞쪽 Action 문구로 확인
      await expect(page.locator('textarea:visible').first(), '기본 정책 템플릿 JSON').toHaveValue(
        /apigateway:InvokeApigatewayRegion/,
        { timeout: 10_000 },
      );
      await submitForm(page, '완료');
      await confirmModal(page, /리소스 정책을 생성하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.waitForURL((u) => !u.hash.includes('/request'), { timeout: 20_000 }).catch(() => undefined);
      await selectApi(page, POLICY_ROUTE);
      await expect(page.getByText('DefaultStatement').first(), '다시 생성한 기본 정책').toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByRole('button', { name: '수정', exact: true }).first()).toBeVisible();
      log('  리소스 정책 재생성 확인');
      await expectStep(page, resolveExpectation(scenario.steps[13]!.expect, vars), ctx(13));
    });
  });
});
