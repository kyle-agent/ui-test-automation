// 직접 작성 (2026-09-29). 시나리오: scenarios/iam/role.yaml. 공용 팩토리: src/console/simple-crud.ts
// 수행 주체는 "현재 Account" 한 행만 (Value 는 콘솔이 계정 ID 로 채운다). 정책은 붙이지 않는다.
// 2026-10-06 L3 동작 추가(steps[2]~[5]): 상세(#/iam/role/<id>/info) 탭 "정책(n)" → "정책 연결"(…/policy/attach, 기본 정책 CostNavigatorReadOnlyAccess) → 완료
// → "연결 해제", "수행 주체(n)" → "수행 주체 수정"(…/principal/edit) → "추가" → 구분 "서비스" · cloudscope.samsungsdscloud.com → 완료 → 행 삭제 아이콘으로 되돌림,
// 기본 정보 "최대 세션 지속 시간" 연필 → 1시간 → 2시간, 태그 탭 "태그(n)" 추가 → 삭제.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { detailValue, openLabelEdit, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { addTag, removeTag } from '../../src/console/tags';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';

const ROUTE = '#/iam/role';
const POLICY = 'CostNavigatorReadOnlyAccess';
const SERVICE_PRINCIPAL = 'cloudscope.samsungsdscloud.com';

async function openTab(page: Page, name: string): Promise<void> {
  await page
    .getByText(new RegExp(`^\\s*${name}\\s*\\(\\d+\\)\\s*$`))
    .first()
    .click();
  await settleConsole(page, { appearGraceMs: 800 });
}

const tabCount = (page: Page, name: string, n: number) =>
  expect(page.getByText(new RegExp(`^\\s*${name}\\s*\\(${n}\\)\\s*$`)).first(), `${name}(${n})`).toBeVisible({
    timeout: 20_000,
  });

async function finish(page: Page, button: string, confirm: RegExp): Promise<void> {
  await submitForm(page, button);
  await confirmModal(page, confirm, '확인');
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 수행 주체 수정 화면의 "구분" 드롭다운들 (상단 Global 리전 드롭다운 제외) */
const principalDropdowns = (page: Page) =>
  page.locator('.scp-dropdown:visible').filter({ hasNotText: /^(Global|한국.*)$/ });

defineSimpleCrudSpec({
  scenario: 'scenarios/iam/role.yaml',
  route: ROUTE,
  createButton: '역할 생성',
  fields: [
    { label: '역할명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}}', selector: 'textarea' },
  ],
  dropdowns: [{ label: '수행 주체', option: '현재 Account' }],
  actions: [
    // steps[2] 정책 연결 → 연결 해제
    async (page, vars, log) => {
      await gotoRoute(page, ROUTE);
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/#\/iam\/role\/[0-9a-f]+\/info/, { timeout: 15_000 });
      await openTab(page, '정책');
      await topButton(page, '정책 연결').click();
      await settleConsole(page, { appearGraceMs: 800 });
      const search = page.locator('input[placeholder="정책명을 입력하세요."]:visible').first();
      await search.fill(POLICY);
      await search.press('Enter');
      await settleConsole(page, { appearGraceMs: 800 });
      await row(page, POLICY).first().waitFor({ timeout: 15_000 });
      await selectRow(page, POLICY);
      await finish(page, '완료', /연결하시겠습니까/);
      await tabCount(page, '정책', 1);
      await expect(row(page, POLICY)).toHaveCount(1, { timeout: 20_000 });
      log(`    정책 ${POLICY} 연결 확인`);
      await selectRow(page, POLICY);
      await topButton(page, '연결 해제').click();
      await confirmModal(page, /연결 해제하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
      await tabCount(page, '정책', 0);
      log(`    정책 ${POLICY} 연결 해제 확인`);
    },
    // steps[3] 수행 주체 추가(서비스) → 제거
    async (page, _vars, log) => {
      await openTab(page, '수행 주체');
      await topButton(page, '수행 주체 수정').click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/\/principal\/edit/, { timeout: 15_000 });
      await expect(principalDropdowns(page)).toHaveCount(1, { timeout: 10_000 });
      await page.getByRole('button', { name: '추가', exact: true }).click();
      await expect(principalDropdowns(page)).toHaveCount(2, { timeout: 5_000 });
      await principalDropdowns(page).nth(1).click();
      await page
        .locator('.scp-menu:visible .scp-menu-item')
        .filter({ hasText: /^\s*서비스\s*$/ })
        .first()
        .click();
      // 구분 "서비스" 를 고르면 Value 가 서비스 드롭다운으로 바뀐다 (드롭다운 3개: 현재 Account · 서비스 · Value)
      await expect(principalDropdowns(page)).toHaveCount(3, { timeout: 5_000 });
      await principalDropdowns(page).nth(2).click();
      await page
        .locator('.scp-menu:visible .scp-menu-item')
        .filter({ hasText: SERVICE_PRINCIPAL })
        .first()
        .click();
      await finish(page, '완료', /수정하시겠습니까/);
      await tabCount(page, '수행 주체', 2);
      await expect(row(page, SERVICE_PRINCIPAL)).toHaveCount(1, { timeout: 15_000 });
      log(`    수행 주체 서비스 ${SERVICE_PRINCIPAL} 추가 확인`);
      await topButton(page, '수행 주체 수정').click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/\/principal\/edit/, { timeout: 15_000 });
      await expect(principalDropdowns(page).filter({ hasText: SERVICE_PRINCIPAL })).toHaveCount(1, {
        timeout: 10_000,
      });
      // 행 순서는 저장 뒤 서비스가 먼저 — 서비스 Value 드롭다운이 있는 행의 삭제 아이콘을 찾는다
      const order = await principalDropdowns(page).allInnerTexts();
      const kinds = order.filter(
        (t) => !t.includes('.samsungsdscloud.com') && !/^[0-9a-f]{32}$/.test(t.trim()),
      );
      const idx = kinds.findIndex((t) => t.trim() === '서비스');
      if (idx < 0) throw new Error(`수행 주체 수정 화면에 "서비스" 행이 없습니다: ${JSON.stringify(order)}`);
      await page.locator('i.i-btn-del:visible').nth(idx).click();
      await expect(principalDropdowns(page).filter({ hasText: SERVICE_PRINCIPAL })).toHaveCount(0, {
        timeout: 5_000,
      });
      await finish(page, '완료', /수정하시겠습니까/);
      await tabCount(page, '수행 주체', 1);
      await expect(row(page, SERVICE_PRINCIPAL)).toHaveCount(0, { timeout: 15_000 });
      log('    수행 주체 제거 확인 (현재 Account 1행)');
    },
    // steps[4] 최대 세션 지속 시간 1시간 → 2시간
    async (page, _vars, log) => {
      await openTab(page, '태그'); // 기본 정보 탭은 개수 표기가 없어 다른 탭을 거쳐 돌아간다
      await page
        .getByText(/^\s*기본 정보\s*$/)
        .first()
        .click();
      await settleConsole(page, { appearGraceMs: 800 });
      expect(await detailValue(page, '최대 세션 지속 시간')).toBe('1시간');
      const modal = await openLabelEdit(page, '최대 세션 지속 시간');
      await modal.locator('.scp-dropdown:visible').first().click();
      await page
        .locator('.scp-menu:visible .scp-menu-item')
        .filter({ hasText: /^\s*2시간\s*$/ })
        .first()
        .click();
      await saveModal(page, log);
      await waitDetailValue(page, '최대 세션 지속 시간', (v) => v === '2시간', { log, timeoutMs: 60_000 });
    },
    // steps[5] 태그 추가 → 삭제
    async (page, vars, log) => {
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
    // steps[6] (agent C 10-16) 두 번째 역할 생성 → 상세 상단 "역할 삭제" (단건 DELETE /roles/{id} 관찰; 목록 삭제는 /roles/bulk)
    async (page, vars, log) => {
      const name2 = vars.name2!;
      await openCreateForm(page, ROUTE, '역할 생성');
      await fillField(page, '역할명', name2);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await pickOption(page, '수행 주체', '현재 Account');
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, name2, { timeoutMs: 120_000, intervalMs: 5_000, log });
      await row(page, name2).getByText(name2, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/#\/iam\/role\/[0-9a-f]+\/info/, { timeout: 15_000 });
      await topButton(page, '역할 삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: name2 });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, name2, { gone: true, timeoutMs: 120_000, intervalMs: 5_000, log });
      log(`    역할 ${name2} 상세 "역할 삭제" 로 삭제 확인`);
    },
  ],
  deleteButton: '삭제',
  tags: ['@light', '@action'],
});
