// 직접 작성 (2026-09-29). 시나리오: scenarios/iam/role.yaml. 공용 팩토리: src/console/simple-crud.ts
// 수행 주체는 "현재 Account" 한 행만 (Value 는 콘솔이 계정 ID 로 채운다). 정책은 붙이지 않는다.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/iam/role.yaml',
  route: '#/iam/role',
  createButton: '역할 생성',
  fields: [
    { label: '역할명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}}', selector: 'textarea' },
  ],
  dropdowns: [{ label: '수행 주체', option: '현재 Account' }],
  deleteButton: '삭제',
  tags: ['@light'],
});
