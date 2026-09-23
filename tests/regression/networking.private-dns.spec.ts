// 직접 작성 (2026-09-23). 시나리오: scenarios/networking/private-dns.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/networking/private-dns.yaml',
  route: '#/dns/private-dns/list',
  createButton: '서비스 생성',
  fields: [
    { label: 'Private DNS명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}}', selector: 'textarea' },
  ],
  confirmText: /생성|신청/,
  createdStatus: /Active/i,
  createTimeoutMs: 900_000, // 실측(2026-09-23): Creating 이 3분을 넘긴다
  deleteButton: '서비스 해지',
  deleteFrom: 'detail', // 목록에는 삭제 버튼이 없다
  deletableStatus: /Active/i, // Creating 동안 해지 버튼이 비활성
  deleteConfirmText: /해지/,
  tags: ['@light'],
});
