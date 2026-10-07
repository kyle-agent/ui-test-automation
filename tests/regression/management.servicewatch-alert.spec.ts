// 직접 작성 (2026-09-29). 시나리오: scenarios/management/servicewatch-alert.yaml. 공용 팩토리: src/console/simple-crud.ts
// 지표는 "지표 선택" 모달의 첫 지표, 조건 > 999, 수신자 없음. 삭제는 행 끝 "삭제".
// 2026-10-07 6C 동작 추가: 상세(#/service-watch/alert/policy/<id>/info) 설명 연필(setalertdescription),
// 상단 "비활성화" → "활성화"(setalertactivated), "수정"(경보 정책 수정 화면) 임계값 999 → 998(setalert).
import { expect, type Page } from '@playwright/test';
import { pickGroupOption } from '../../src/console/form-group';
import { pickFirstMetric } from '../../src/console/servicewatch';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { detailValue, editDetailText, logModal, openDetail } from '../../src/console/detail-edit';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, dismissModalIfAny, fillField, fillStable, visibleModal } from '../../src/console/ui';

const ROUTE = '#/service-watch/alert/policy';
const DETAIL = /\/service-watch\/alert\/policy\/[0-9a-f]+/;

async function detailAction(page: Page, button: string, confirm: RegExp): Promise<void> {
  await page.getByRole('button', { name: button, exact: true }).click();
  await confirmModal(page, confirm, '확인');
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 상단 버튼 name 이 활성(누를 수 있음)이 될 때까지 다시 읽는다 */
async function waitEnabled(page: Page, name: string): Promise<void> {
  const b = page.getByRole('button', { name, exact: true }).first();
  for (let i = 0; i < 12 && !(await b.isEnabled().catch(() => false)); i++) {
    await page.waitForTimeout(5_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
  await expect(b, `"${name}" 버튼 활성`).toBeEnabled({ timeout: 5_000 });
}

defineSimpleCrudSpec({
  scenario: 'scenarios/management/servicewatch-alert.yaml',
  route: ROUTE,
  createButton: '경보 정책 생성',
  fields: [{ label: '경보 정책명', value: '{{name}}' }],
  beforeSubmit: async (page) => {
    await page.getByRole('button', { name: '지표 선택', exact: true }).first().click();
    console.log(`  경보 지표: ${await pickFirstMetric(page)}`);
    await confirmModal(page, /지표 선택/, '확인');
    await page.getByText('조건 연산자').first().waitFor({ timeout: 15_000 });
    await pickGroupOption(page, '조건 연산자', '>');
    await fillField(page, '임계값', '999');
  },
  createdStatus: /Active/,
  actions: [
    // steps[2] 설명 수정
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!, DETAIL);
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id}`, { log });
    },
    // steps[3] 비활성화 → 활성화
    async (page, _vars, log) => {
      await detailAction(page, '비활성화', /비활성화/);
      await waitEnabled(page, '활성화');
      log('    비활성화 확인 ("활성화" 버튼 활성)');
      await detailAction(page, '활성화', /활성화/);
      await waitEnabled(page, '비활성화');
      log('    활성화 확인 ("비활성화" 버튼 활성)');
    },
    // steps[4] 경보 정책 수정: 임계값 999 → 998
    async (page, _vars, log) => {
      await page.getByRole('button', { name: '수정', exact: true }).click();
      await settleConsole(page, { appearGraceMs: 1_000 });
      // "수정" 은 큰 모달(지표 및 조건 설정 · 조건 설정)을 연다. 임계값 칸 = 현재 값 999 인 입력칸, 저장 버튼은 모달의 "확인"
      const modal = visibleModal(page);
      await modal.getByText('조건 설정').first().waitFor({ timeout: 15_000 });
      const inputs = modal.locator('input[type=text]:visible');
      const values = await inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
      const idx = values.indexOf('999');
      if (idx < 0) {
        await logModal(page, log, '경보 정책 수정');
        throw new Error(`수정 모달에서 임계값(999) 칸을 찾지 못했습니다: ${JSON.stringify(values)}`);
      }
      await fillStable(page, inputs.nth(idx), '998', '임계값');
      await modal.getByRole('button', { name: '확인', exact: true }).last().click();
      await confirmModal(page, /하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.waitForURL(/\/info/, { timeout: 30_000 }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 1_000 });
      let cond = await detailValue(page, '조건');
      for (let i = 0; i < 12 && !cond.includes('998'); i++) {
        await page.waitForTimeout(5_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
        cond = await detailValue(page, '조건');
      }
      expect(cond, '조건에 임계값 998').toContain('998');
      log(`    조건 = ${cond}`);
    },
  ],
  deleteButton: '삭제',
  tags: ['@light', '@action'],
});
