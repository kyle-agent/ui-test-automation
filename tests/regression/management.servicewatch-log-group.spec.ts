// 직접 작성 (2026-09-29). 시나리오: scenarios/management/servicewatch-log-group.yaml. 공용 팩토리: src/console/simple-crud.ts
// 생성 후 상세 "로그 스트림" 탭에서 스트림을 만들고 지운다(afterCreate). 로그 그룹 삭제는 목록 행 선택 → "삭제".
// 2026-10-07 6C: steps[2] 상세 "로그 보관 정책" 연필 → 드롭다운 3일 → 저장 (setloggroup).
import { expect } from '@playwright/test';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { confirmModal, fillField, row, visibleModal } from '../../src/console/ui';
import { openDetail, openLabelEdit, saveModal, waitDetailValue, logModal } from '../../src/console/detail-edit';

const ROUTE = '#/service-watch/log/group';

defineSimpleCrudSpec({
  scenario: 'scenarios/management/servicewatch-log-group.yaml',
  route: ROUTE,
  createButton: '로그 그룹 생성',
  fields: [{ label: '로그 그룹명', value: '{{name}}' }],
  dropdowns: [{ label: '로그 보관 정책', option: '1일' }],
  createdStatus: /Active/,
  afterCreate: async (page, vars) => {
    await row(page, vars.name!).locator(`:text-is("${vars.name}")`).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page.waitForURL(/\/service-watch\/log\/group\/[0-9a-f]+\//, { timeout: 30_000 });
    await page.getByText(/^\s*로그 스트림(\s*\(\d+\))?\s*$/).first().click(); // 상세 탭 (개수가 붙을 수 있다)
    await settleConsole(page, { appearGraceMs: 800 });
    await page.getByRole('button', { name: '로그 스트림 생성', exact: true }).click();
    await visibleModal(page).getByText('로그 스트림명').first().waitFor({ timeout: 10_000 });
    await fillField(page, '로그 스트림명', vars.stream!);
    await visibleModal(page).getByRole('button', { name: '생성', exact: true }).click();
    const streamRow = row(page, vars.stream!);
    await expect(streamRow, `로그 스트림 ${vars.stream} 행`).toHaveCount(1, { timeout: 30_000 });
    console.log(`  로그 스트림 생성: ${vars.stream}`);
    await streamRow.getByRole('button', { name: '삭제', exact: true }).click();
    await confirmModal(page, /로그 스트림을 삭제하시겠습니까/, '확인');
    await expect(streamRow, `로그 스트림 ${vars.stream} 삭제`).toHaveCount(0, { timeout: 30_000 });
    await gotoRoute(page, ROUTE);
  },
  actions: [
    // steps[2] 로그 보관 정책 1일 → 3일 (setloggroup, 6C 2026-10-07)
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!, /\/service-watch\/log\/group\/[0-9a-f]+/);
      const modal = await openLabelEdit(page, '로그 보관 정책');
      await logModal(page, log, '로그 보관 정책 수정');
      await modal.locator('.scp-dropdown:visible').first().click();
      await page.locator('.scp-menu:visible .scp-menu-item').filter({ hasText: /^\s*3일\s*$/ }).first().click();
      await saveModal(page, log);
      await waitDetailValue(page, '로그 보관 정책', (v) => v.startsWith('3일'), { log, timeoutMs: 60_000 });
    },
  ],
  deleteButton: '삭제',
  tags: ['@light'],
});
