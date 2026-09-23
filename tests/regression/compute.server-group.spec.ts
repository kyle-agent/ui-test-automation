// 직접 작성 (2026-09-23). 시나리오: scenarios/compute/server-group.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/compute/server-group.yaml',
  route: '#/virtualserver/server-group/list',
  createButton: 'Server Group 생성',
  fields: [{ label: 'Server Group명', value: '{{name}}' }],
  dropdowns: [{ label: '정책', option: /Anti-Affinity/ }],
  deleteButton: '삭제',
  tags: ['@light'],
});
