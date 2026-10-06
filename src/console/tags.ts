/**
 * 상세 화면 "태그 (n)" 탭의 태그 추가·삭제(L3) 공통 (2026-10-06, 에이전트 3C).
 * 실측(Resource Group): 탭 "태그 (n)" → "태그 수정" → 별도 화면 …/tag/edit?srn=… (Key·Value 입력란 쌍, 행 끝 `i.i-del` 삭제 버튼, "태그 추가" 는 빈 행 추가)
 * → "저장" → "태그를 수정하시겠습니까?" → 상세 태그 탭으로 돌아온다. 입력란 placeholder 는 "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)…".
 */
import { expect, type Page } from '@playwright/test';
import { settleConsole } from './overlays';
import { confirmModal, dismissModalIfAny, fillStable, submitForm } from './ui';

const TAG_INPUT = 'input[placeholder^="한글, 영문, 숫자, 공백과"]:visible';

/** "태그 (n)" 탭을 연다. n 을 돌려준다 */
export async function openTagTab(page: Page): Promise<number> {
  // "태그 (0)"(Resource Group·Server Group) 와 "태그(0)"(IAM 역할) 둘 다 있다
  const tab = page.getByText(/^\s*태그\s*\(\d+\)\s*$/).first();
  await tab.waitFor({ timeout: 15_000 });
  await tab.click();
  await settleConsole(page, { appearGraceMs: 800 });
  return Number((await tab.innerText()).match(/\d+/)?.[0] ?? 0);
}

async function openTagEdit(page: Page): Promise<void> {
  await page.getByRole('button', { name: '태그 수정', exact: true }).click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.waitForURL(/\/tag\/edit/, { timeout: 15_000 });
  // 입력 행은 화면보다 늦게 그려진다: 태그가 0개여도 빈 Key·Value 쌍 하나가 생긴다 → 그 전에 세면 "태그 추가" 를 한 번 더 눌러 빈 행이 둘이 된다
  await page.getByRole('button', { name: '태그 추가', exact: true }).waitFor({ timeout: 15_000 });
  await page
    .locator(TAG_INPUT)
    .first()
    .waitFor({ timeout: 10_000 })
    .catch(() => undefined);
  await page.waitForTimeout(800);
}

async function saveTags(page: Page): Promise<void> {
  await submitForm(page, '저장');
  // "태그를 수정하시겠습니까?"(Resource Group) / "수정한 정보를 저장하시겠습니까?"(KMS) — 서비스마다 다르다
  await confirmModal(page, /하시겠습니까/, '확인');
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await page.waitForURL((u) => !u.hash.includes('/tag/edit'), { timeout: 20_000 });
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 상세 화면에서: 태그 탭 → 태그 수정 → key=value 추가 → 저장 → 탭 개수가 1 늘고 표에 key 가 보이는지 확인 */
export async function addTag(page: Page, key: string, value: string, log?: (line: string) => void): Promise<void> {
  const before = await openTagTab(page);
  await openTagEdit(page);
  const inputs = page.locator(TAG_INPUT);
  // 빈 쌍이 없으면(이미 태그가 있으면) "태그 추가" 로 행을 만든다
  const n = await inputs.count();
  const lastKey = n ? await inputs.nth(n - 2).inputValue() : 'x';
  if (!n || lastKey) {
    await page.getByRole('button', { name: '태그 추가', exact: true }).click();
    await expect(inputs).toHaveCount(n + 2, { timeout: 5_000 });
  }
  const m = await inputs.count();
  await fillStable(page, inputs.nth(m - 2), key, '태그 Key');
  await fillStable(page, inputs.nth(m - 1), value, '태그 Value');
  await saveTags(page);
  await expect(page.getByText(new RegExp(`^\\s*태그\\s*\\(${before + 1}\\)\\s*$`)).first(), `태그 수가 ${before + 1} 이어야 합니다`).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('tr.scp-body-row:visible').filter({ hasText: key }).filter({ hasText: value })).toHaveCount(1, {
    timeout: 10_000,
  });
  log?.(`    태그 ${key}=${value} 추가 확인 (태그 ${before} → ${before + 1})`);
}

/** 상세 화면에서: 태그 탭 → 태그 수정 → key 행 삭제 → 저장 → 개수가 1 줄고 key 가 사라졌는지 확인 */
export async function removeTag(page: Page, key: string, log?: (line: string) => void): Promise<void> {
  const before = await openTagTab(page);
  await openTagEdit(page);
  const inputs = page.locator(TAG_INPUT);
  await inputs.first().waitFor({ timeout: 10_000 });
  const values = await inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  const pair = values.findIndex((v, i) => i % 2 === 0 && v === key) / 2;
  if (pair < 0) throw new Error(`태그 수정 화면에 Key "${key}" 가 없습니다: ${JSON.stringify(values)}`);
  await page.locator('button:visible:has(i.i-del)').nth(pair).click();
  await expect(inputs).toHaveCount(values.length - 2, { timeout: 5_000 });
  await saveTags(page);
  await expect(page.getByText(new RegExp(`^\\s*태그\\s*\\(${before - 1}\\)\\s*$`)).first(), `태그 수가 ${before - 1} 이어야 합니다`).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('tr.scp-body-row:visible').filter({ hasText: key })).toHaveCount(0, { timeout: 10_000 });
  log?.(`    태그 ${key} 삭제 확인 (태그 ${before} → ${before - 1})`);
}
