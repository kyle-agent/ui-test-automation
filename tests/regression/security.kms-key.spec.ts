// 직접 작성 (2026-09-29). 시나리오: scenarios/security/kms-key.yaml. 공용 팩토리: src/console/simple-crud.ts
// 퍼블릭 접근 허용 IP 는 필수라 문서용 대역(192.0.2.10/32, RFC 5737)을 넣는다. 해지는 "즉시 해지"(기본) — 삭제 예정 기간 없이 바로 사라진다.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { setGroupCheckbox } from '../../src/console/form-group';
import { fillField } from '../../src/console/ui';

defineSimpleCrudSpec({
  scenario: 'scenarios/security/kms-key.yaml',
  route: '#/kms/kms/list',
  createButton: '서비스 생성',
  fields: [{ label: '키명', value: '{{name}}' }],
  beforeSubmit: async (page) => {
    await setGroupCheckbox(page, '프라이빗 접근 제어', false);
    await fillField(page, '퍼블릭 접근 허용 IP', '192.0.2.10/32');
    await page.getByRole('button', { name: '추가', exact: true }).first().click();
    await page.getByText('192.0.2.10/32', { exact: true }).first().waitFor({ timeout: 5_000 });
  },
  createdStatus: /Active/,
  deleteButton: '서비스 해지',
  deleteConfirmText: /해지/,
  tags: ['@light'],
});
