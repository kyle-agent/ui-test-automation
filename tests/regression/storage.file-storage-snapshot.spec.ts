// 직접 작성 (2026-09-29, 에이전트 C). 시나리오: scenarios/storage/file-storage-snapshot.yaml. 공용 팩토리: src/console/simple-crud.ts
// 볼륨 생성(storage.file-storage 와 같은 폼) → 상세 "스냅샷 생성" → "스냅샷 목록" 탭 Available → 탭에서 삭제 → 볼륨 해지.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, dismissModalIfAny, refreshList, row, topButton } from '../../src/console/ui';

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
    await gotoRoute(page, ROUTE);
  },
  deleteButton: '서비스 해지',
  deleteConfirmText: /해지/,
  tags: ['@light', '@action'],
});
