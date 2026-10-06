// 직접 작성 (2026-09-29). 시나리오: scenarios/management/notification-group.yaml. 공용 팩토리: src/console/simple-crud.ts
// 사용자·실제 외부 수신자는 넣지 않는다: 실제 알림 메일이 나가지 않게.
// 2026-10-06 L3 동작 추가(steps[2]·[3]): 상세 "수정"(별도 화면 …/modify) → 설명 + 외부 수신자(예약 도메인 example.com, RFC 2606 — 사람에게 가지 않음)
// → "저장" → "수정한 정보를 저장하시겠습니까?" → 상세에 반영, 다시 "수정" 으로 외부 수신자를 비워 0건으로 되돌린다.
// 사용자 추가 표는 "로그인 이력이 있는 사용자(이메일·휴대전화 등록)" 만 고를 수 있어 쓰지 않는다(실제 사람).
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { detailValue } from '../../src/console/detail-edit';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, dismissModalIfAny, fillStable, row, submitForm } from '../../src/console/ui';

const ROUTE = '#/notification/group';

/** 상세 "수정" → 설명·외부 수신자 textarea 채움 → 저장 → 확인 → 상세 */
async function modify(page: Page, values: { desc?: string; external: string }): Promise<void> {
  await page.getByRole('button', { name: '수정', exact: true }).click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.waitForURL(/\/modify/, { timeout: 15_000 });
  // 수정 화면 textarea 순서: 설명 · 외부 수신자
  const areas = page.locator('textarea:visible');
  await areas.nth(1).waitFor({ timeout: 15_000 });
  if (values.desc !== undefined) await fillStable(page, areas.nth(0), values.desc, '설명');
  await fillStable(page, areas.nth(1), values.external, '외부 수신자');
  await submitForm(page, '저장');
  await confirmModal(page, /저장하시겠습니까/, '확인');
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await page.waitForURL((u) => !u.hash.includes('/modify'), { timeout: 15_000 });
  await settleConsole(page, { appearGraceMs: 800 });
}

defineSimpleCrudSpec({
  scenario: 'scenarios/management/notification-group.yaml',
  route: ROUTE,
  createButton: '알림 그룹 생성',
  fields: [{ label: '알림 그룹명', value: '{{name}}' }],
  actions: [
    // steps[2] 설명 + 외부 수신자 추가
    async (page, vars, log) => {
      await gotoRoute(page, ROUTE);
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/#\/notification\/group\/RECEIVER-GROUP-/, { timeout: 15_000 });
      expect(await detailValue(page, '설명')).toBe('-');
      await modify(page, { desc: `scp-console-tests ${vars.run_id}`, external: `qa-${vars.run_id}@example.com` });
      expect(await detailValue(page, '설명')).toBe(`scp-console-tests ${vars.run_id}`);
      await expect(page.getByText(/^총 1$/).last(), '외부 수신자 1건').toBeVisible({ timeout: 15_000 });
      log(`    설명·외부 수신자 qa-${vars.run_id}@example.com 저장 확인`);
    },
    // steps[3] 외부 수신자 제거(되돌림)
    async (page, vars, log) => {
      await modify(page, { external: '' });
      await expect(page.getByText(`qa-${vars.run_id}@example.com`)).toHaveCount(0, { timeout: 15_000 });
      expect(await detailValue(page, '설명')).toBe(`scp-console-tests ${vars.run_id}`);
      log('    외부 수신자 제거 확인(0건)');
    },
  ],
  deleteButton: '삭제',
  tags: ['@light', '@action'],
});
