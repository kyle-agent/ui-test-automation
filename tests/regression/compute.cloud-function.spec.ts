// 직접 작성 (2026-09-29). 시나리오: scenarios/compute/cloud-function.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/compute/cloud-function.yaml',
  route: '#/scf/cloudfunctions',
  createButton: '서비스 생성',
  fields: [{ label: 'Function명', value: '{{name}}' }],
  createdStatus: /Ready/, // 실측 2026-09-29: 약 1분 뒤 Ready
  createTimeoutMs: 600_000,
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
