// 직접 작성 (2026-10-06). 시나리오: scenarios/devops-tools/devops-service.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { logDetail, openDetail } from '../../src/console/detail-edit';
import { addTag, removeTag } from '../../src/console/tags';

defineSimpleCrudSpec({
  scenario: 'scenarios/devops-tools/devops-service.yaml',
  route: '#/devopsservice/devops-service',
  createButton: '서비스 생성',
  fields: [
    { label: 'Tenant명', value: '{{name}}' },
    { label: 'Tenant 코드', value: '{{code}}' },
  ],
  createdStatus: /Active/,
  actions: [
    // steps[2] 상세 태그 추가 → 삭제 (상세에 연필 아이콘 수정 항목 없음, 2026-10-06 4L 프로브)
    async (page, vars, log) => {
      await openDetail(page, '#/devopsservice/devops-service', vars.name!);
      await logDetail(page, log);
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
  ],
  deleteButton: '서비스 해지',
  deleteFrom: 'detail',
  deletableStatus: /Active/,
  tags: ['@light', '@action'],
});
