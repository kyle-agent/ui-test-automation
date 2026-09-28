// 직접 작성 (2026-09-23). 시나리오: scenarios/security/address-group.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-09-28 L3 동작 추가: 상세 "대상 주소 (n)" 탭 → "대상 주소 추가" 모달(textarea) → 확인 → 행이 늘어난다. (행 삭제 버튼은 없다; 그룹 삭제로 정리)
import { expect } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { dismissModalIfAny, row, visibleModal } from '../../src/console/ui';

const EXTRA_CIDR = '10.250.1.0/24';

defineSimpleCrudSpec({
  scenario: 'scenarios/security/address-group.yaml',
  route: '#/securitygroup/addressgroup/list',
  createButton: 'Address Group 생성',
  fields: [
    { label: 'Address Group명', value: '{{name}}' },
    { label: '대상 주소', value: '{{cidr}}', selector: 'textarea' },
  ],
  afterCreate: async (page, vars) => {
    await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page
      .getByText(/^대상 주소 \(\d+\)$/)
      .first()
      .click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page.getByRole('button', { name: '대상 주소 추가', exact: true }).click();
    const modal = visibleModal(page);
    await modal.waitFor({ timeout: 10_000 });
    await modal.locator('textarea:visible').first().fill(EXTRA_CIDR);
    await modal.locator('textarea:visible').first().press('Tab');
    const ok = modal.getByRole('button', { name: '확인', exact: true });
    try {
      await ok.click({ timeout: 10_000 });
    } catch {
      await ok.click({ force: true });
    }
    await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
    // "추가하시겠습니까?" 류의 후속 확인 모달이 이어질 수 있다
    for (let i = 0; i < 3 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(400);
    await settleConsole(page, { appearGraceMs: 800 });
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
    await page
      .getByText(/^대상 주소 \(\d+\)$/)
      .first()
      .click();
    await settleConsole(page, { appearGraceMs: 800 });
    await expect(
      page.locator('tr.scp-body-row').filter({ hasText: EXTRA_CIDR }).first(),
      '추가한 대상 주소가 표에 보여야 합니다',
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^대상 주소 \(2\)$/).first()).toBeVisible({ timeout: 10_000 });
    await gotoRoute(page, '#/securitygroup/addressgroup/list');
  },
  deleteButton: '삭제',
  tags: ['@light', '@action'],
});
