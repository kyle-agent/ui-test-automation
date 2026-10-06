// 직접 작성 (2026-09-23). 시나리오: scenarios/compute/server-group.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-10-06 L3 동작 추가(steps[2]·[3]): 상세에 수정 항목이 없다(이름·정책 고정, 멤버는 서버 생성 때 지정) → 태그 탭 "태그 수정" 으로 태그 추가 → 삭제,
// "작업 이력" 탭에 생성 작업(Server-group Create End · 성공)이 남는지 확인.
import { expect } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { openDetail } from '../../src/console/detail-edit';
import { settleConsole } from '../../src/console/overlays';
import { addTag, removeTag } from '../../src/console/tags';
import { row } from '../../src/console/ui';

const ROUTE = '#/virtualserver/server-group/list';

defineSimpleCrudSpec({
  scenario: 'scenarios/compute/server-group.yaml',
  route: ROUTE,
  createButton: 'Server Group 생성',
  fields: [{ label: 'Server Group명', value: '{{name}}' }],
  dropdowns: [{ label: '정책', option: /Anti-Affinity/ }],
  actions: [
    // steps[2] 태그 추가 → 삭제
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!);
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
    // steps[3] 작업 이력
    async (page, vars, log) => {
      await page.getByText(/^\s*작업 이력\s*$/).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      const created = row(page, 'Create End').filter({ hasText: vars.name! });
      await expect(created, '작업 이력에 생성 작업이 있어야 합니다').toHaveCount(1, { timeout: 30_000 });
      await expect(created).toContainText('성공');
      log('    작업 이력: Server-group Create End 성공');
    },
  ],
  deleteButton: '삭제',
  tags: ['@light', '@action'],
});
