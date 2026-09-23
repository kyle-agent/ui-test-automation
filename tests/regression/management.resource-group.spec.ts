// 직접 작성 (2026-09-23). 시나리오: scenarios/management/resource-group.yaml. 공용 팩토리: src/console/simple-crud.ts
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { below } from '../../src/console/ui';

defineSimpleCrudSpec({
  scenario: 'scenarios/management/resource-group.yaml',
  route: '#/resourcegroups/resource-group/list',
  createButton: 'Resource Group 생성',
  fields: [
    { label: 'Resource Group명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}}', selector: 'textarea' },
  ],
  // 그룹 정의 태그: key/value 두 입력 뒤 "태그 추가" 를 눌러야 목록에 들어간다 (생성 조건)
  beforeSubmit: async (page, vars) => {
    await (await below(page, '그룹 정의 태그', 'input', 0)).fill('qa');
    await (await below(page, '그룹 정의 태그', 'input', 1)).fill(vars.run_id!);
    await page.getByRole('button', { name: '태그 추가', exact: true }).first().click();
  },
  deleteButton: '삭제',
  tags: ['@light'],
});
