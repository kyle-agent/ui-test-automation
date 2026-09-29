/**
 * 라벨과 컨트롤이 가로로 놓인 폼 그룹(KMS "프라이빗 접근 제어 [사용]" 처럼 체크박스가 라벨 오른쪽)에서 컨트롤을 잡는다.
 * `below()` 는 라벨 "아래" 만 보므로 이런 칸에서는 다음 그룹의 컨트롤을 잡는다(2026-09-29 KMS 폼 실측).
 * 라벨(`.scp-form-group-label`)을 품은 가장 가까운 그룹 요소 안에서 selector 를 찾는다.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { isChecked } from './ui';

export function groupControl(page: Page, label: string, selector: string): Locator {
  const lab = page.locator('.scp-form-group-label:visible').filter({ hasText: label }).first();
  // 라벨의 부모(그룹) 안의 컨트롤. 라벨 바로 옆 형제에 들어 있다.
  return lab.locator('xpath=..').locator(selector).first();
}

/** 라벨 옆 체크박스를 원하는 상태로 맞춘다 */
export async function setGroupCheckbox(page: Page, label: string, checked: boolean): Promise<void> {
  const box = groupControl(page, label, '.scp-select');
  await box.scrollIntoViewIfNeeded().catch(() => undefined);
  if ((await isChecked(box)) === checked) return;
  await box.click();
  await expect
    .poll(() => isChecked(box), { message: `"${label}" 체크박스가 ${checked ? '켜져' : '꺼져'} 있어야 합니다`, timeout: 3_000 })
    .toBe(checked);
}

/** 라벨 옆(같은 그룹 안) 드롭다운을 열고 항목을 고른다. option 이 문자열이면 항목 텍스트 정확 일치 */
export async function pickGroupOption(page: Page, label: string, option: string | RegExp): Promise<void> {
  const dd = groupControl(page, label, '.scp-dropdown');
  await dd.scrollIntoViewIfNeeded().catch(() => undefined);
  await dd.click();
  const menu = page.locator('.scp-menu:visible').last();
  await menu.waitFor({ timeout: 10_000 });
  const items = menu.locator('.scp-menu-item');
  const item =
    typeof option === 'string'
      ? items.filter({ has: page.locator(`span.item-text:text-is(${JSON.stringify(option)})`) })
      : items.filter({ hasText: option });
  if ((await item.count()) === 0) {
    const seen = (await items.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    await page.keyboard.press('Escape').catch(() => undefined);
    throw new Error(`"${label}" 드롭다운에 ${String(option)} 항목이 없습니다. 보이는 항목: ${JSON.stringify(seen.slice(0, 30))}`);
  }
  await item.first().click();
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
}
