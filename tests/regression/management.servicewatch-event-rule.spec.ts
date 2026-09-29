// 직접 작성 (2026-09-29). 시나리오: scenarios/management/servicewatch-event-rule.yaml. 공용 팩토리: src/console/simple-crud.ts
// 이벤트 소스 KMS / 유형 Key, 수신자 없음. 생성 후 상세 "비활성화" → 목록 Inactive (L3).
import { gotoRoute } from '../../src/console/expect';
import { pickGroupOption } from '../../src/console/form-group';
import { settleConsole } from '../../src/console/overlays';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { confirmModal, row, topButton, waitForRow } from '../../src/console/ui';

const ROUTE = '#/service-watch/event/rule';

defineSimpleCrudSpec({
  scenario: 'scenarios/management/servicewatch-event-rule.yaml',
  route: ROUTE,
  createButton: '이벤트 규칙 생성',
  fields: [{ label: '이벤트 규칙명', value: '{{name}}' }],
  beforeSubmit: async (page) => {
    await pickGroupOption(page, '이벤트 소스', 'Key Management Service');
    await pickGroupOption(page, '이벤트 유형', 'Key');
    await page.getByText('"Key Management Service"').first().waitFor({ timeout: 10_000 }); // 이벤트 패턴 설정 현황
  },
  createdStatus: /Active/,
  afterCreate: async (page, vars) => {
    await row(page, vars.name!).locator(`:text-is("${vars.name}")`).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await topButton(page, '비활성화').click();
    await confirmModal(page, /비활성화/, '확인');
    await topButton(page, '활성화').waitFor({ timeout: 30_000 });
    await gotoRoute(page, ROUTE);
    await waitForRow(page, ROUTE, vars.name!, { status: /Inactive/, timeoutMs: 120_000, intervalMs: 5_000 });
  },
  deleteButton: '삭제',
  tags: ['@light'],
});
