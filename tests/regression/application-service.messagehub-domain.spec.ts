// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/messagehub-domain.yaml. 공용 팩토리: src/console/simple-crud.ts
// 등록만 하고 도메인 인증(DNS 소유 확인)은 하지 않는다.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/application-service/messagehub-domain.yaml',
  route: '#/messagehub/domain',
  createButton: 'Domain 추가',
  fields: [{ label: 'Email 도메인', value: '{{name}}' }],
  submitButton: '완료',
  confirmText: /추가하시겠습니까/,
  createdStatus: /확인 필요|인증/,
  deleteButton: '삭제',
  tags: ['@light'],
});
