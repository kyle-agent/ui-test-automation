// 직접 작성 (2026-09-23). 시나리오: scenarios/iam/user-group.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/iam/user-group.yaml',
  route: '#/iam/group/list',
  createButton: '사용자 그룹 생성',
  fields: [
    { label: '사용자 그룹명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}}', selector: 'textarea' },
  ],
  deleteButton: '삭제',
  tags: ['@light'],
});
