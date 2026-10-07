// 직접 작성 (2026-09-29). 시나리오: scenarios/management/servicewatch-dashboard.yaml. 공용 팩토리: src/console/simple-crud.ts
// 이름은 생성 화면 제목 옆 입력란(.dashboard-sub-field), 위젯은 "개별 위젯 추가" 지표 트리에서 첫 지표 1개.
// 2026-10-07 6C: steps[2] 상세 "수정" → 편집 화면에서 위젯 영역 제목 변경 → 저장 (setdashboard, 실측 PUT …/dashboards/<id>).
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { pickFirstMetric } from '../../src/console/servicewatch';
import { expect } from '@playwright/test';
import { confirmModal, dismissModalIfAny, fillStable, visibleModal } from '../../src/console/ui';
import { openDetail } from '../../src/console/detail-edit';
import { settleConsole } from '../../src/console/overlays';

const ROUTE = '#/service-watch/dashboard';

defineSimpleCrudSpec({
  scenario: 'scenarios/management/servicewatch-dashboard.yaml',
  route: ROUTE,
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
  actions: [
    // steps[2] 대시보드 "수정"(…/dashboard/edit/<id>) → 위젯 영역 제목 "User Defined 1" → "qa-<run_id>" → 저장 (6C 2026-10-07, setdashboard)
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!, /\/service-watch\/dashboard\/[0-9a-f]{8}/);
      await page.getByRole('button', { name: '수정', exact: true }).click();
      await settleConsole(page, { appearGraceMs: 1_000 });
      await page.waitForURL(/\/dashboard\/edit\//, { timeout: 15_000 });
      const title = page.locator('input:visible');
      const idx = (await title.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).findIndex((v) => /^User Defined/.test(v));
      if (idx < 0) throw new Error('대시보드 수정 화면에 위젯 영역 제목(User Defined …) 입력칸이 없습니다');
      const label = `qa-${vars.run_id}`;
      await fillStable(page, title.nth(idx), label, '위젯 영역 제목');
      await page.getByRole('button', { name: '저장', exact: true }).click();
      await confirmModal(page, /하시겠습니까/, '확인').catch(() => undefined);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.waitForURL((u) => !u.hash.includes('/edit/'), { timeout: 30_000 });
      await settleConsole(page, { appearGraceMs: 1_000 });
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 1_000 });
      await expect(page.getByText(label, { exact: true }).first(), '저장한 위젯 영역 제목').toBeVisible({ timeout: 20_000 });
      log(`    위젯 영역 제목 ${label} 저장 확인`);
    },
  ],
  deleteButton: '삭제',
  tags: ['@light'],
});
