// 직접 작성 (2026-09-23). 시나리오: scenarios/storage/object-storage-bucket.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-10-06 L3 동작 추가(steps[2]~[4]):
//  - "폴더 리스트" 탭: "새폴더"(모달 폴더명 → "새폴더를 생성하시겠습니까?") + "파일 업로드"(드롭존 숨은 input[type=file] 에 작은 텍스트를 setInputFiles →
//    "업로드" → 성공하면 모달이 저절로 닫힘) → 목록 새로 고침에 둘 다 보임 → 행 선택 → "삭제"("항목을 삭제하시겠습니까?…전체 버전이 삭제") → 0건.
//    파일은 브라우저가 공용 엔드포인트로 직접 올린다(다운로드는 하지 않는다 — CDP Edge 가 죽는다).
//  - 상세 "버전 관리" 연필(라벨에 안내 i-info 와 연필 i-edit 가 같이 있다) → 사용 → 미사용(되돌림).
//  - 태그 탭 추가 → 삭제.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { detailValue, openDetail, openLabelEdit, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { settleConsole } from '../../src/console/overlays';
import { addTag, removeTag } from '../../src/console/tags';
import { confirmModal, dismissModalIfAny, fillStable, isChecked, refreshList, row, selectRow, topButton, visibleModal } from '../../src/console/ui';

const ROUTE = '#/objectstorage/objectstorage/list';
const FOLDER = 'qa-folder';
const FILE = 'qa-upload.txt';

async function openTab(page: Page, tab: RegExp): Promise<void> {
  await page.getByText(tab).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 폴더 리스트 탭: 새폴더 + 파일 업로드 → 목록 확인 → 둘 다 삭제 */
async function folderAndUpload(page: Page, runId: string, log: (line: string) => void): Promise<void> {
  await page.getByRole('button', { name: '새폴더', exact: true }).click();
  const folderModal = visibleModal(page);
  await folderModal.waitFor({ timeout: 10_000 });
  await fillStable(page, folderModal.locator('input[type=text]:visible').first(), FOLDER, '폴더명');
  await saveModal(page, log);
  await page.getByRole('button', { name: '파일 업로드', exact: true }).click();
  const upload = visibleModal(page);
  await upload.waitFor({ timeout: 10_000 });
  await page.locator('input[type=file].dz-hidden-input').setInputFiles({
    name: FILE,
    mimeType: 'text/plain',
    buffer: Buffer.from(`scp-console-tests ${runId}\n`),
  });
  await expect(upload.locator('.uploader-tooltip-name').filter({ hasText: FILE })).toHaveCount(1, { timeout: 10_000 });
  await upload.getByRole('button', { name: '업로드', exact: true }).click({ timeout: 10_000 });
  // 업로드가 모두 성공하면 팝업이 자동으로 닫힌다
  await upload.waitFor({ state: 'hidden', timeout: 60_000 });
  for (let i = 0; i < 10 && (await row(page, FILE).count()) === 0; i++) {
    await page.waitForTimeout(2_000);
    await refreshList(page);
  }
  await expect(row(page, FILE), '업로드한 파일').toHaveCount(1, { timeout: 5_000 });
  await expect(row(page, FOLDER), '만든 폴더').toHaveCount(1, { timeout: 5_000 });
  await expect(row(page, FILE)).toContainText(/\d+B/);
  log(`    폴더 ${FOLDER} · 파일 ${FILE} 확인`);
  await selectRow(page, FILE);
  await selectRow(page, FOLDER);
  await topButton(page, '삭제').click();
  await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  for (let i = 0; i < 10 && (await row(page, FILE).count()) + (await row(page, FOLDER).count()) > 0; i++) {
    await page.waitForTimeout(2_000);
    await refreshList(page);
  }
  await expect(row(page, FILE)).toHaveCount(0);
  await expect(row(page, FOLDER)).toHaveCount(0);
  log('    폴더·파일 삭제 확인 (0건)');
}

/** 폴더 리스트 탭의 모든 행을 지운다(실패 정리용) */
async function emptyFolderList(page: Page, log: (line: string) => void): Promise<void> {
  for (let i = 0; i < 2 && (await dismissModalIfAny(page, '취소')); i++) await page.waitForTimeout(300);
  await openTab(page, /^\s*폴더 리스트\s*$/);
  const rows = page.locator('tr.scp-body-row:visible').filter({ has: page.locator('i.table-select') });
  const n = await rows.count();
  if (!n) return;
  for (let i = 0; i < n; i++) await rows.nth(i).locator('i.table-select').first().click();
  await topButton(page, '삭제').click();
  await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true });
  log(`    (정리) 폴더 리스트 ${n}건 삭제 요청`);
}

async function setVersioning(page: Page, on: boolean, log: (line: string) => void): Promise<void> {
  const modal = await openLabelEdit(page, '버전 관리');
  const box = modal.locator('.scp-select:visible').first();
  if ((await isChecked(box)) !== on) await box.click();
  await expect.poll(() => isChecked(box), { timeout: 3_000 }).toBe(on);
  await saveModal(page, log);
  await waitDetailValue(page, '버전 관리', (v) => v === (on ? '사용' : '미사용'), { log, timeoutMs: 60_000 });
}

defineSimpleCrudSpec({
  scenario: 'scenarios/storage/object-storage-bucket.yaml',
  route: ROUTE,
  createButton: '서비스 생성',
  fields: [{ label: '버킷명', value: '{{name}}' }],
  actions: [
    // steps[2] 폴더 생성 + 파일 업로드 → 삭제
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!);
      await openTab(page, /^\s*폴더 리스트\s*$/);
      try {
        await folderAndUpload(page, vars.run_id!, log);
      } catch (err) {
        // 비어 있지 않은 버킷은 해지가 거절되어 남는다(2026-10-06 실측 2개) → 실패해도 올린 것을 비우고 오류를 그대로 올린다
        await emptyFolderList(page, log).catch(() => undefined);
        throw err;
      }
    },
    // steps[3] 버전 관리 사용 → 미사용
    async (page, _vars, log) => {
      await openTab(page, /^\s*상세 정보\s*$/);
      expect(await detailValue(page, '버전 관리')).toBe('미사용');
      await setVersioning(page, true, log);
      await setVersioning(page, false, log);
    },
    // steps[4] 태그 추가 → 삭제
    async (page, vars, log) => {
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
  ],
  deleteButton: '서비스 해지',
  deleteConfirmText: /해지/,
  tags: ['@light', '@action'],
  // 2026-09-23 실측: 계정에 Object Storage 인증키(IAM > My Info > 인증키, 영구)가 있어야 버킷명 조회·생성이 된다. 인증키는 계정 자격 증명이라 테스트가 만들지 않는다.
});
