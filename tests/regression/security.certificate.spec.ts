// 직접 작성 (2026-09-29). 시나리오: scenarios/security/certificate.yaml. 공용 팩토리: src/console/simple-crud.ts
// 자체 발급(Self-Signed) 인증서: 유형 버튼을 눌러야 Common Name 등이 나타나므로 beforeSubmit 에서 채운다.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { below, fillField } from '../../src/console/ui';

defineSimpleCrudSpec({
  scenario: 'scenarios/security/certificate.yaml',
  route: '#/certificate-manager/certificate-manager/list',
  createButton: '서비스 생성',
  fields: [{ label: '인증서명', value: '{{name}}' }],
  beforeSubmit: async (page, vars) => {
    await page.getByRole('button', { name: '자체 발급 인증서', exact: true }).click();
    await page.getByText('Common Name').first().waitFor({ timeout: 10_000 });
    await fillField(page, 'Common Name', `qa-${vars.run_id}.example.com`);
    await fillField(page, 'Organization Unit', 'QATeam');
    // 만료일: 입력란 타이핑은 반영되지 않는다 → 달력을 열고 다음 달 15일
    await (await below(page, '만료일', 'input')).click();
    const cal = page.locator('.scp-cal:visible').last();
    await cal.waitFor({ timeout: 5_000 });
    await cal.locator('i.i-page-right').click();
    await cal
      .locator('span.cal-cell:not(.cal-not-current):not(.cal-disabled)')
      .filter({ hasText: /^15$/ })
      .click();
  },
  createdStatus: /Active|Valid|Issued|Available|사용/i,
  createTimeoutMs: 300_000,
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
