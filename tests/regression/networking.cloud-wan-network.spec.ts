// 직접 작성 (2026-10-06, 에이전트 3B). 시나리오: scenarios/networking/cloud-wan-network.yaml. 공용 팩토리: src/console/simple-crud.ts
// Cloud WAN Network 는 계정당 1개(check-creatable: max_cloudwan_network_count 1) → 남은 것이 있으면 생성이 막힌다.
// 하위 Segment 는 만들지 않는다: 요금 확인에서 LiteG·약정 None 이어도 월 ₩356,240 (2026-10-06 프로브). Attachment·Site VPN 은 Segment 필요.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { editDetailText, logDetail, openDetail } from '../../src/console/detail-edit';
import { addTag, removeTag } from '../../src/console/tags';

defineSimpleCrudSpec({
  scenario: 'scenarios/networking/cloud-wan-network.yaml',
  route: '#/cwan/network',
  createButton: '서비스 생성',
  fields: [{ label: 'Cloud WAN Network명', value: '{{name}}' }],
  createdStatus: /Active/,
  actions: [
    // steps[2] 상세 설명 수정 → 태그 추가·삭제 (2026-10-07 5L 프로브: 상세 주소는 …/detail 이 아니라 #/cwan/network/<id>,
    // 수정 가능 항목은 설명(50자)뿐, 태그 탭 있음. 10-06 의 "상세 진입 실패" 는 openDetail 이 /detail 주소를 기다린 탓)
    async (page, vars, log) => {
      await openDetail(page, '#/cwan/network', vars.name!, /#\/cwan\/network\/[0-9a-f]{32}/);
      await logDetail(page, log);
      await editDetailText(page, '설명', `qa ${vars.run_id}`, { log });
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
  ],
  // 행 끝 버튼은 "서비스 해지" (목록 상단엔 삭제 버튼이 없다)
  deleteButton: '서비스 해지',
  tags: ['@light', '@action'],
});
