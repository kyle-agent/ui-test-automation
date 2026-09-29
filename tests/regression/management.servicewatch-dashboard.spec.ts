// 직접 작성 (2026-09-29). 시나리오: scenarios/management/servicewatch-dashboard.yaml. 공용 팩토리: src/console/simple-crud.ts
// 이름은 생성 화면 제목 옆 입력란(.dashboard-sub-field), 위젯은 "개별 위젯 추가" 지표 트리에서 첫 지표 1개.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { pickFirstMetric } from '../../src/console/servicewatch';
import { visibleModal } from '../../src/console/ui';

defineSimpleCrudSpec({
  scenario: 'scenarios/management/servicewatch-dashboard.yaml',
  route: '#/service-watch/dashboard',
  createButton: '대시보드 생성',
  beforeSubmit: async (page, vars) => {
    const name = page.locator('.dashboard-sub-field input:visible').first();
    await name.fill(vars.name!);
    if ((await name.inputValue()) !== vars.name) {
      await name.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(vars.name!, { delay: 20 });
    }
    await name.press('Tab');
    await page.getByText('개별 위젯 추가', { exact: true }).first().click();
    console.log(`  위젯 지표: ${await pickFirstMetric(page)}`);
    await visibleModal(page).getByRole('button', { name: '완료', exact: true }).click();
    await visibleModal(page)
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => undefined);
  },
  deleteButton: '삭제',
  tags: ['@light'],
});
