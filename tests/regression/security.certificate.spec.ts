// 직접 작성 (2026-09-29). 시나리오: scenarios/security/certificate.yaml. 공용 팩토리: src/console/simple-crud.ts
// 자체 발급(Self-Signed) 인증서: 유형 버튼을 눌러야 Common Name 등이 나타나므로 beforeSubmit 에서 채운다.
// 2026-10-06 L3 동작 추가(steps[2]): 태그 탭 "태그 수정" 으로 태그 추가 → 삭제. 상세에 갱신(재발급)·인증서 수정 버튼은 없다(버튼은 "서비스 해지" 뿐,
// 연결된 자원 탭은 조회 전용). "만료 알림" 연필은 켜면 알림 수신자(실제 사용자·그룹)를 골라야 하고 만료 45/30/15/7/1일 전 메일이 나가므로 하지 않는다
// (40일 남은 인증서라 곧바로 대상이 될 수 있다).
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { openDetail } from '../../src/console/detail-edit';
import { addTag, removeTag } from '../../src/console/tags';
import { below, fillField } from '../../src/console/ui';

const ROUTE = '#/certificate-manager/certificate-manager/list';

defineSimpleCrudSpec({
  scenario: 'scenarios/security/certificate.yaml',
  route: ROUTE,
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
  actions: [
    // steps[2] 태그 추가 → 삭제
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!);
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
  ],
  deleteButton: '서비스 해지',
  tags: ['@light', '@action'],
});
