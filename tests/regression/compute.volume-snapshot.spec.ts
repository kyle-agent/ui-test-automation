// 직접 작성 (2026-09-29, 에이전트 C). 시나리오: scenarios/compute/volume-snapshot.yaml. 공용 팩토리: src/console/simple-crud.ts
// 볼륨(서버 없이) → 상세 "스냅샷 생성" → "스냅샷 복구"(Reverting → Available, L3) → 스냅샷 삭제 → 볼륨 삭제.
// 2026-10-07 6B(6차): 볼륨 SSD_Provisioned · 스냅샷 설명 수정(행 메뉴 "수정") · steps[2] 볼륨명 변경→되돌림 · [3] Max IOPS/Throughput 수정 · [4] 용량 증설.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { editDetailText, logDetail, logModal, openLabelEdit, probeEdits, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { logWriteRequests } from '../../src/console/api-log';
import { fillStable } from '../../src/console/ui';
import {
  confirmModal,
  dismissModalIfAny,
  refreshList,
  row,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';

const ROUTE = '#/virtualserver/block-storage/list';
const log = (line: string) => console.log(line);
const SNAP_TAB = /^스냅샷 목록 \(\d+\)$/;

async function openSnapshotTab(page: Page) {
  await page.getByText(SNAP_TAB).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
}

async function snapshotRowText(page: Page, snapshot: string): Promise<string> {
  const r = page.locator('tr.scp-body-row').filter({ hasText: snapshot });
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

async function waitSnapshot(page: Page, snapshot: string, what: string, ok: (t: string) => boolean) {
  const start = Date.now();
  for (;;) {
    const t = await snapshotRowText(page, snapshot);
    if (ok(t)) return t;
    if (Date.now() - start > 600_000)
      throw new Error(`스냅샷 ${what} 대기 600초 초과. 마지막: ${t || '(행 없음)'}`);
    log(`  [${Math.round((Date.now() - start) / 1000)}s] 스냅샷 ${what} 대기… ${t || '(행 없음)'}`);
    await page.waitForTimeout(10_000);
    await refreshList(page);
    if (!(await page.getByText('스냅샷 ID', { exact: true }).count())) await openSnapshotTab(page);
  }
}

/** 목록의 볼륨 ID 셀(둘째 칸)을 눌러 상세로. 볼륨명 셀은 링크가 아니다 */
async function openVolumeDetail(page: Page, name: string) {
  if (!page.url().includes('block-storage/detail')) {
    await gotoRoute(page, ROUTE);
    await row(page, name).locator('td').nth(1).click();
    await settleConsole(page, { appearGraceMs: 800 });
  }
  await expect(page).toHaveURL(/block-storage\/detail/, { timeout: 30_000 });
}

async function deleteSnapshot(page: Page, name: string, snapshot: string) {
  await openVolumeDetail(page, name);
  await openSnapshotTab(page);
  if (!(await snapshotRowText(page, snapshot))) return;
  await page
    .locator('tr.scp-body-row')
    .filter({ hasText: snapshot })
    .first()
    .locator('i.table-select')
    .first()
    .click();
  await topButton(page, '삭제').click();
  await confirmModal(page, /스냅샷 1개를 삭제하시겠습니까/, '확인', { agree: true, resourceName: snapshot });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await waitSnapshot(page, snapshot, '소멸', (t) => t === '');
}

/**
 * 볼륨 이전(createvolumetransfer → deletevolumetransfer, 2026-09-30 에이전트 C 프로브):
 * 상세 "볼륨 이전" → "볼륨 이전을 신청하시겠습니까? … 다른 Account에서 '볼륨 이전 받기' 완료 후 기존 Account에서 볼륨이 제거됩니다" → 확인
 * → 모달 "볼륨 이전 ID / 승인 Key" (값은 비밀이라 읽지도 기록하지도 않는다. 모달 "확인" 은 탭을 닫히게 해 누르지 않는다) → 목록 상태 Awaiting Transfer.
 * 상세 "볼륨 이전 취소" → "볼륨 이전을 취소하시겠습니까?" → 확인 → Available. 받기(accept)는 다른 Account 가 필요해 하지 않는다.
 */
async function volumeTransferRoundTrip(page: Page, name: string) {
  await openVolumeDetail(page, name);
  try {
    await page.getByRole('button', { name: '볼륨 이전', exact: true }).click();
    await confirmModal(page, /볼륨 이전을 신청하시겠습니까/);
    // 승인 Key 모달: 내용은 읽지 않는다. 모달의 "확인" 을 누르면 몇 초 뒤 테스트 탭이 닫혔다(2026-09-30 2회 연속, "Target page … closed" —
    // 키 파일 다운로드로 추정, Keypair .pem 과 같은 증상) → 누르지 않고 페이지를 다시 읽어 모달을 없앤다(프로브에서 안전 확인).
    const keyModal = visibleModal(page).filter({ hasText: '승인 Key' });
    await keyModal.waitFor({ timeout: 30_000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settleConsole(page, { appearGraceMs: 800 });
    await waitForRow(page, ROUTE, name, { status: /Awaiting Transfer/, timeoutMs: 120_000, intervalMs: 5_000, log });
  } finally {
    // 실패해도 이전 요청은 취소해 둔다 (Awaiting Transfer 볼륨은 스냅샷 생성·연결이 막힌다)
    await gotoRoute(page, ROUTE);
    if (/Awaiting Transfer/.test(await row(page, name).first().innerText().catch(() => ''))) {
      await openVolumeDetail(page, name);
      await page.getByRole('button', { name: '볼륨 이전 취소', exact: true }).click();
      await confirmModal(page, /볼륨 이전을 취소하시겠습니까/);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    }
  }
  await waitForRow(page, ROUTE, name, { status: /Available/, timeoutMs: 180_000, intervalMs: 5_000, log });
  log('  볼륨 이전 신청 → Awaiting Transfer → 이전 취소 → Available');
}

/** 스냅샷 탭 행 끝 메뉴 → "수정" → 설명 입력 → 저장 → 행에 설명이 보인다 */
async function updateSnapshotDescription(page: Page, snapshot: string, desc: string) {
  const r = page.locator('tr.scp-body-row').filter({ hasText: snapshot }).first();
  await r.locator('i.menu-icon').first().click();
  const items = page.locator('.scp-menu:visible .scp-menu-item, [role=menuitem]:visible');
  await items.first().waitFor({ timeout: 10_000 });
  log(`  스냅샷 행 메뉴: ${JSON.stringify((await items.allInnerTexts()).map((t) => t.trim()))}`);
  await items.filter({ hasText: /수정/ }).first().click();
  const modal = visibleModal(page);
  await modal.waitFor({ timeout: 10_000 });
  await logModal(page, log, '스냅샷 수정');
  const inputs = modal.locator('input[type=text]:visible, textarea:visible');
  await fillStable(page, inputs.nth((await inputs.count()) > 1 ? 1 : 0), desc, '스냅샷 설명');
  await saveModal(page, log);
  await expect(page.locator('tr.scp-body-row').filter({ hasText: snapshot }).first(), '스냅샷 행에 바뀐 설명').toContainText(desc, {
    timeout: 60_000,
  });
  log(`  스냅샷 설명 수정 반영: ${desc}`);
}

/** 볼륨 상세의 "Max IOPS" · "Max Throughput" 라벨 연필 → 모달 입력칸 하나 → 저장 → 상세 반영. 입력칸은 천 단위 쉼표로 다시 그린다(6000 → "6,000") */
async function setQos(page: Page, log: (l: string) => void, iops: string, throughput: string) {
  for (const [name, value] of [['Max IOPS', iops], ['Max Throughput', throughput]] as const) {
    const modal = await openLabelEdit(page, name);
    await logModal(page, log, `${name} 수정`);
    const input = modal.locator('input[type=text]:visible').first();
    await input.fill(value);
    await input.press('Tab');
    await expect.poll(async () => (await input.inputValue()).replace(/,/g, ''), { message: `${name} 입력값` }).toBe(value);
    await saveModal(page, log);
    await waitDetailValue(page, name, (v) => v.replace(/,/g, '').includes(value), { log, timeoutMs: 300_000 });
  }
}

defineSimpleCrudSpec({
  scenario: 'scenarios/compute/volume-snapshot.yaml',
  route: ROUTE,
  createButton: 'Block Storage 생성',
  fields: [
    { label: '볼륨명', value: '{{name}}' },
    { label: '용량', value: '1' }, // Units(8GB 단위)
  ],
  // 2026-10-07 6B: SSD → SSD_Provisioned (setvolumeqos 를 하려고). Max IOPS 5000~20000 · Max Throughput 250~1000 MB/s 는 최솟값(5,000·250)이 미리 채워져 있다
  dropdowns: [{ label: '디스크 유형', option: /^\s*SSD_Provisioned\s*$/ }],
  confirmText: /생성/,
  createdStatus: /Available/,
  afterCreate: async (page, vars) => {
    const name = vars.name!;
    const snapshot = vars.snapshot!;
    await openVolumeDetail(page, name);
    await logDetail(page, log, '볼륨 상세');
    await probeEdits(page, log, '볼륨 상세');
    await logWriteRequests(page, log);
    try {
      // 1) 스냅샷 생성
      await page.getByRole('button', { name: '스냅샷 생성', exact: true }).click();
      const modal = visibleModal(page);
      await modal.waitFor({ timeout: 10_000 });
      const input = modal.locator('input[type=text]:visible').first(); // 스냅샷명 (둘째 칸은 설명)
      await input.click();
      await page.keyboard.type(snapshot, { delay: 20 });
      await page.keyboard.press('Tab');
      await expect(input).toHaveValue(snapshot);
      const ok = modal.getByRole('button', { name: '확인', exact: true });
      try {
        await ok.click({ timeout: 10_000 });
      } catch {
        await ok.click({ force: true });
      }
      await confirmModal(page, /스냅샷을 생성하시겠습니까/);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await openSnapshotTab(page);
      log(`  스냅샷: ${await waitSnapshot(page, snapshot, 'Available', (t) => /Available/.test(t))}`);
      // 1-1) 스냅샷 설명 수정 (updatesnapshot, 2026-10-07 6B): 행 끝 메뉴 아이콘(i.menu-icon) → 메뉴 "수정" → 모달(스냅샷명·설명)
      await updateSnapshotDescription(page, snapshot, `qa-desc-${vars.run_id}`);

      // 2) 스냅샷 복구(최신 스냅샷으로 되돌림): Reverting → Available
      await page.getByRole('button', { name: '스냅샷 복구', exact: true }).click();
      await confirmModal(page, /스냅샷을 복구하시겠습니까/);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      // 상태는 목록 상태 열로 본다: 요청이 받아들여졌는지 Reverting(실측: 3초 뒤) → Available(≈70초)
      await waitForRow(page, ROUTE, name, { status: /Reverting/, timeoutMs: 90_000, intervalMs: 5_000, log });
      await waitForRow(page, ROUTE, name, {
        status: /Available/,
        timeoutMs: 900_000,
        intervalMs: 15_000,
        log,
      });

      log('  스냅샷 복구 완료 (Available)');
    } finally {
      // 3) 스냅샷 삭제 — 실패해도 볼륨 삭제 전에 스냅샷을 치운다
      await deleteSnapshot(page, name, snapshot);
    }
    await volumeTransferRoundTrip(page, name);
    await gotoRoute(page, ROUTE);
  },
  actions: [
    // steps[2] 볼륨명 변경 → 되돌림 (updatevolume)
    async (page, vars, log) => {
      await openVolumeDetail(page, vars.name!);
      await editDetailText(page, '볼륨명', `${vars.name}-r`, { log, expectShown: (v) => v === `${vars.name}-r` });
      await editDetailText(page, '볼륨명', vars.name!, { log, expectShown: (v) => v === vars.name });
    },
    // steps[3] Max IOPS·Throughput 변경 (setvolumeqos): 5000/250 → 6000/300
    async (page, vars, log) => {
      await openVolumeDetail(page, vars.name!);
      await setQos(page, log, '6000', '300');
    },
    // steps[4] 용량 증설 1 → 2 Units (extendvolume): 8GB → 16GB. 증설 뒤엔 예전 스냅샷 복구가 막히므로 스냅샷 단계 뒤에 한다
    async (page, vars, log) => {
      await openVolumeDetail(page, vars.name!);
      await editDetailText(page, '용량', '2', { log, expectShown: (v) => /16\s*GB/.test(v) });
      await waitForRow(page, ROUTE, vars.name!, { status: /Available/, timeoutMs: 300_000, intervalMs: 10_000, log });
      await expect(row(page, vars.name!).first()).toContainText('16GB');
    },
  ],
  deleteButton: '삭제',
  deleteConfirmText: /삭제/,
  tags: ['@light', '@action'],
});
