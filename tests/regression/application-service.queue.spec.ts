// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/queue.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/application-service/queue.yaml',
  route: '#/queueservice/queueservices',
  createButton: '서비스 생성',
  fields: [{ label: 'Queue명', value: '{{name}}' }],
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
