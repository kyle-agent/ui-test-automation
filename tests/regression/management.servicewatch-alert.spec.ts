// 직접 작성 (2026-09-29). 시나리오: scenarios/management/servicewatch-alert.yaml. 공용 팩토리: src/console/simple-crud.ts
// 지표는 "지표 선택" 모달의 첫 지표, 조건 > 999, 수신자 없음. 삭제는 행 끝 "삭제".
import { pickGroupOption } from '../../src/console/form-group';
import { pickFirstMetric } from '../../src/console/servicewatch';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { confirmModal, fillField } from '../../src/console/ui';

defineSimpleCrudSpec({
  scenario: 'scenarios/management/servicewatch-alert.yaml',
  route: '#/service-watch/alert/policy',
  createButton: '경보 정책 생성',
  fields: [{ label: '경보 정책명', value: '{{name}}' }],
  beforeSubmit: async (page) => {
    await page.getByRole('button', { name: '지표 선택', exact: true }).first().click();
    console.log(`  경보 지표: ${await pickFirstMetric(page)}`);
    await confirmModal(page, /지표 선택/, '확인');
    await page.getByText('조건 연산자').first().waitFor({ timeout: 15_000 });
    await pickGroupOption(page, '조건 연산자', '>');
    await fillField(page, '임계값', '999');
  },
  createdStatus: /Active/,
  deleteButton: '삭제',
  tags: ['@light'],
});
