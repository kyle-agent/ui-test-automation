// 직접 작성 (2026-09-29). 시나리오: scenarios/management/notification-group.yaml. 공용 팩토리: src/console/simple-crud.ts
// 사용자·외부 수신자(이메일)는 넣지 않는다: 실제 알림 메일이 나가지 않게.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/management/notification-group.yaml',
  route: '#/notification/group',
  createButton: '알림 그룹 생성',
  fields: [{ label: '알림 그룹명', value: '{{name}}' }],
  deleteButton: '삭제',
  tags: ['@light'],
});
