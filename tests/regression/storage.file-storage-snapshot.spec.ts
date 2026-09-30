// 직접 작성 (2026-09-29, 에이전트 C). 시나리오: scenarios/storage/file-storage-snapshot.yaml. 공용 팩토리: src/console/simple-crud.ts
// 볼륨 생성(storage.file-storage 와 같은 폼) → 상세 "스냅샷 생성" → "스냅샷 목록" 탭 Available → 탭에서 삭제
// → 스냅샷 스케줄 켜기(매일 23:00, 보관 5)·끄기(2026-09-30, 에이전트 A) → 볼륨 해지.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, dismissModalIfAny, fillStable, isChecked, refreshList, row, topButton, visibleModal } from '../../src/console/ui';

const ROUTE = '#/filestorage/filestorage/list';
const SNAP = '__snapshot.'; // 자동 스냅샷명 "<볼륨명>__snapshot.YYYY-MM-DD_HHMMSS"
const log = (line: string) => console.log(line);

async function snapshotRowText(page: Page): Promise<string> {
  const r = page.locator('tr.scp-body-row').filter({ hasText: SNAP });
  if (!(await r.count())) return '';
  return (
    await r
      .first()
      .innerText({ timeout: 5_000 })
      .catch(() => '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** 스냅샷 목록 탭을 새로 고치며 조건을 기다린다 */
async function waitSnapshot(page: Page, what: string, ok: (text: string) => boolean, timeoutMs = 600_000) {
  const start = Date.now();
  for (;;) {
    const text = await snapshotRowText(page);
    if (ok(text)) return text;
    if (Date.now() - start > timeoutMs)
      throw new Error(`스냅샷 ${what} 대기 ${timeoutMs / 1000}초 초과. 마지막: ${text || '(행 없음)'}`);
    log(`  [${Math.round((Date.now() - start) / 1000)}s] 스냅샷 ${what} 대기… ${text || '(행 없음)'}`);
    await page.waitForTimeout(10_000);
    await refreshList(page); // 탭 표의 i.i-refresh (없으면 페이지 새로 고침 → 탭을 다시 연다)
    if (!(await page.getByText('스냅샷명', { exact: true }).count())) await openSnapshotTab(page);
  }
}

async function openSnapshotTab(page: Page) {
  await page.getByText('스냅샷 목록', { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 상세 정보 "스냅샷" 옆 연필 아이콘 → "스냅샷 설정 수정" 모달의 텍스트 */
function snapshotValue(page: Page) {
  return page.locator('div:has(> div > span:text-is("스냅샷"))').first();
}

/**
 * 스냅샷 스케줄 켜기·끄기 (2026-09-30, 에이전트 A 2차. API: createsnapshotschedule / deletesnapshotschedule).
 * 모달: "사용" 체크 → 스케줄(매일|매주) + 시각(00:00~23:00) + 보관 개수(미입력 시 10) → 확인. 끄면 상세 값이 "미사용" 으로 돌아온다.
 */
async function setSnapshotSchedule(page: Page, on: boolean) {
  await page.getByText('상세 정보', { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await snapshotValue(page).locator('i.i-edit').first().click();
  const modal = visibleModal(page);
  await modal.getByText('스냅샷 설정 수정').first().waitFor({ timeout: 10_000 });
  const use = modal.locator('.scp-select:visible').filter({ hasText: /사용/ }).first();
  if ((await isChecked(use)) !== on) await use.click();
  if (on) {
    await modal.getByText('스케줄', { exact: true }).first().waitFor({ timeout: 5_000 });
    const dds = modal.locator('.scp-dropdown:visible');
    await dds.nth(1).click(); // 시각
    const menu = page.locator('.scp-menu:visible').last();
    await menu.waitFor({ timeout: 5_000 });
    await menu.locator('.scp-menu-item').filter({ hasText: /^\s*23:00\s*$/ }).first().click();
    await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
    await fillStable(page, modal.locator('input[formid=retentionCount]'), '5', '보관 개수');
  }
  await modal.getByRole('button', { name: '확인', exact: true }).click();
  if (await visibleModal(page).getByText(/하시겠습니까/).first().waitFor({ timeout: 5_000 }).then(() => true, () => false))
    await confirmModal(page, /하시겠습니까/);
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  // 상세 값이 바뀔 때까지 새로 읽는다
  const want = on ? /23:00/ : /미사용/;
  const start = Date.now();
  for (;;) {
    const text = (await snapshotValue(page).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (want.test(text)) {
      log(`  스냅샷 스케줄 ${on ? '켬' : '끔'}: ${text}`);
      return;
    }
    if (Date.now() - start > 120_000) throw new Error(`스냅샷 설정이 ${want} 가 되지 않았습니다: ${text}`);
    await page.waitForTimeout(5_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
}

defineSimpleCrudSpec({
  scenario: 'scenarios/storage/file-storage-snapshot.yaml',
  route: ROUTE,
  createButton: '서비스 생성',
  fields: [{ label: '볼륨명', value: '{{name}}' }],
  // 프로토콜은 NFS/CIFS 토글 버튼. CIFS 는 비밀번호 설정이 필요하므로 NFS 를 명시적으로 고른다.
  beforeSubmit: async (page) => {
    const nfs = page.getByRole('button', { name: 'NFS', exact: true }).first();
    if (await nfs.count()) await nfs.click();
  },
  createdStatus: /Available/,
  afterCreate: async (page, vars) => {
    // 볼륨명 셀은 실제 이름("<입력값>_xxxxxx")이라 접두어로 링크를 찾는다
    await row(page, vars.name!)
      .getByText(new RegExp(`^${vars.name}`))
      .first()
      .click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page.getByRole('button', { name: '스냅샷 생성', exact: true }).click();
    await confirmModal(page, /스냅샷을 즉시 생성/);
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    await openSnapshotTab(page);
    const created = await waitSnapshot(page, 'Available', (t) => /Available/i.test(t));
    log(`  스냅샷: ${created}`);
    expect(created, '스냅샷명은 볼륨명으로 시작한다').toContain(vars.name!);

    const snapRow = page.locator('tr.scp-body-row').filter({ hasText: SNAP }).first();
    await snapRow.locator('i.table-select').first().click();
    await topButton(page, '삭제').click();
    await confirmModal(page, /스냅샷을 삭제하시겠습니까/, '확인', { agree: true });
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    await waitSnapshot(page, '소멸', (t) => t === '', 600_000);
    await setSnapshotSchedule(page, true);
    await setSnapshotSchedule(page, false);
    await gotoRoute(page, ROUTE);
  },
  deleteButton: '서비스 해지',
  deleteConfirmText: /해지/,
  tags: ['@light', '@action'],
});
