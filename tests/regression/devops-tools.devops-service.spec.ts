// 직접 작성 (2026-10-06). 시나리오: scenarios/devops-tools/devops-service.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/devops-tools/devops-service.yaml',
  route: '#/devopsservice/devops-service',
  createButton: '서비스 생성',
  fields: [
    { label: 'Tenant명', value: '{{name}}' },
    { label: 'Tenant 코드', value: '{{code}}' },
  ],
  createdStatus: /Active/,
  deleteButton: '서비스 해지',
  deleteFrom: 'detail',
  deletableStatus: /Active/,
  tags: ['@light'],
});
