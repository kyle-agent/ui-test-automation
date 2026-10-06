// 직접 작성 (2026-10-06, 에이전트 3B). 시나리오: scenarios/networking/cloud-wan-network.yaml. 공용 팩토리: src/console/simple-crud.ts
// Cloud WAN Network 는 계정당 1개(check-creatable: max_cloudwan_network_count 1) → 남은 것이 있으면 생성이 막힌다.
// 하위 Segment 는 만들지 않는다: 요금 확인에서 LiteG·약정 None 이어도 월 ₩356,240 (2026-10-06 프로브). Attachment·Site VPN 은 Segment 필요.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';

defineSimpleCrudSpec({
  scenario: 'scenarios/networking/cloud-wan-network.yaml',
  route: '#/cwan/network',
  createButton: '서비스 생성',
  fields: [{ label: 'Cloud WAN Network명', value: '{{name}}' }],
  createdStatus: /Active/,
  // 행 끝 버튼은 "서비스 해지" (목록 상단엔 삭제 버튼이 없다)
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
