// 직접 작성 (2026-09-23). 시나리오: scenarios/security/address-group.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-09-28 L3 동작 추가: 상세 "대상 주소 (n)" 탭 → "대상 주소 추가" 모달(textarea) → 확인 → 행이 늘어난다. (행 삭제 버튼은 없다; 그룹 삭제로 정리)
import { expect } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { logWriteRequests } from '../../src/console/api-log';
import { editDescriptionRoundTrip, logDetail, openDetail, probeEdits } from '../../src/console/detail-edit';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, dismissModalIfAny, row, selectRow, topButton, visibleModal } from '../../src/console/ui';

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
  actions: [
    // steps[2] (2026-10-13 6E): 상세 정보 탭 설명 수정 → 되돌림(API setaddressgroup) → 대상 주소 탭에서 추가한 CIDR 행 삭제(API removeaddressgroupcidrs)
    async (page, vars, log) => {
      await logWriteRequests(page, log);
      await openDetail(page, '#/securitygroup/addressgroup/list', vars.name!);
      await logDetail(page, log, 'Address Group 상세');
      await probeEdits(page, log, 'Address Group');
      await editDescriptionRoundTrip(page, `scp-console-tests ${vars.run_id} edited`, log);
      const tab = page.getByText(/^대상 주소 \(\d+\)$/).first();
      await tab.click();
      await settleConsole(page, { appearGraceMs: 800 });
      await logDetail(page, log, '대상 주소 탭');
      const target = row(page, EXTRA_CIDR).first();
      await expect(target, '추가한 대상 주소 행').toBeVisible({ timeout: 15_000 });
      // 1차 실측(2026-10-13): 탭 버튼은 "Address Group 삭제" · "엑셀 다운로드" · (이름 없는 아이콘) · "대상 주소 추가" — 행 버튼 없음.
      // "Address Group 삭제" 는 그룹 자체를 지우므로 절대 누르지 않는다. 행 선택 → 행 끝 버튼 → 이름 없는 아이콘(더보기) 메뉴에서 "삭제" 를 찾는다.
      const inRow = target.getByRole('button', { name: /^(삭제|대상 주소 삭제)$/ });
      if (await inRow.count()) await inRow.first().click();
      else {
        await selectRow(page, EXTRA_CIDR);
        await page.waitForTimeout(500);
        const exact = page.locator('button:visible:not(tr button)').filter({ hasText: /^(삭제|대상 주소 삭제)$/ }).first();
        if (await exact.count()) await exact.click();
        else {
          const icons = page.locator('button:visible:not(tr button):not(header button)').filter({ hasNotText: /\S/ });
          const n = await icons.count();
          let found = false;
          for (let i = 0; i < n && !found; i++) {
            // 콘솔 상단 전역 아이콘은 뺀다: 탭 영역(표 위)의 아이콘만 — 표보다 위에 있고 "대상 주소 추가" 와 같은 줄
            const box = await icons.nth(i).boundingBox();
            const add = await page.getByRole('button', { name: '대상 주소 추가', exact: true }).first().boundingBox();
            if (!box || !add || Math.abs(box.y - add.y) > 40) continue;
            await icons.nth(i).click();
            const item = page.locator('.scp-menu:visible .scp-menu-item').filter({ hasText: /삭제/ }).first();
            if (await item.waitFor({ timeout: 3_000 }).then(() => true, () => false)) {
              log(`  대상 주소 삭제: 아이콘 메뉴 "${(await item.innerText()).trim()}"`);
              await item.click();
              found = true;
            } else {
              const menu = page.locator('.scp-menu:visible');
              log(`  아이콘 메뉴 항목: ${JSON.stringify(await menu.locator('.scp-menu-item').allInnerTexts().catch(() => []))}`);
              await page.keyboard.press('Escape').catch(() => undefined);
            }
          }
          if (!found) throw new Error('대상 주소 탭에 대상 주소 삭제 진입점이 없습니다 (행 버튼·상단 버튼·아이콘 메뉴 모두 없음) → removeaddressgroupcidrs 불가');
        }
      }
      await confirmModal(page, /삭제/, '확인', { agree: true });
      for (let i = 0; i < 3 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(400);
      await expect
        .poll(
          async () => {
            await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
            await settleConsole(page, { appearGraceMs: 800 });
            await page.getByText(/^대상 주소 \(\d+\)$/).first().click();
            await settleConsole(page, { appearGraceMs: 800 });
            return row(page, EXTRA_CIDR).count();
          },
          { message: '삭제한 대상 주소가 사라져야 합니다', timeout: 60_000, intervals: [3_000] },
        )
        .toBe(0);
      await expect(page.getByText(/^대상 주소 \(1\)$/).first()).toBeVisible({ timeout: 10_000 });
      log(`  대상 주소 ${EXTRA_CIDR} 삭제 확인 (2 → 1)`);
    },
  ],
  deleteButton: '삭제',
  tags: ['@light', '@action'],
});
