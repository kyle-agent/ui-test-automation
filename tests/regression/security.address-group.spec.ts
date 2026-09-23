// 직접 작성 (2026-09-23). 시나리오: scenarios/security/address-group.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/security/address-group.yaml',
  route: '#/securitygroup/addressgroup/list',
  createButton: 'Address Group 생성',
  fields: [
    { label: 'Address Group명', value: '{{name}}' },
    { label: '대상 주소', value: '{{cidr}}', selector: 'textarea' },
  ],
  deleteButton: '삭제',
  tags: ['@light'],
});
