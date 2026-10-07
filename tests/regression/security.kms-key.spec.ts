// 직접 작성 (2026-09-29). 시나리오: scenarios/security/kms-key.yaml. 공용 팩토리: src/console/simple-crud.ts
// 퍼블릭 접근 허용 IP 는 필수라 문서용 대역(192.0.2.10/32, RFC 5737)을 넣는다. 해지는 "즉시 해지"(기본) — 삭제 예정 기간 없이 바로 사라진다.
// 2026-10-06 L3 동작 추가(steps[2]~[5]): 상세 "키 회전"("키의 새로운 버전을 생성합니다…") → 현재 버전 1→2,
// "키 비활성화" → 상태 Stop(키 회전 비활성) → "키 활성화" → Active, 설명 연필 수정, 태그 추가 → 삭제.
// 2026-10-07 6C: steps[6] "자동 회전" 연필 → 모달(사용 체크 · 회전 주기 입력) 90→60→90일, "다음 회전일" 로 확인 (실측 PUT /console/api/kms/v1/kms/transit/<id>/rotate-info, 본문 auto_rotate·rotate_cycle; 화면은 "다음 회전일" 아래 "회전 주기 N일" 이 바뀐다).
// 실측 네트워크(6C): 키 회전 POST …/rotate, 활성/비활성 PUT …/state, 설명 PUT …/description, 태그 추가 PUT resourcemanager/v1/tags/<srn b64>/bulk, 태그 삭제(마지막 1개) DELETE …/tags/<srn b64>, 해지 DELETE …/transit/<id>?is_directly=True.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { setGroupCheckbox } from '../../src/console/form-group';
import { detailValue, editDetailText, logDetail, logModal, openDetail, openLabelEdit, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { settleConsole } from '../../src/console/overlays';
import { addTag, removeTag } from '../../src/console/tags';
import { confirmModal, dismissModalIfAny, fillField, fillStable } from '../../src/console/ui';

const ROUTE = '#/kms/kms/list';

/** 상세 상단 버튼 → "…하시겠습니까?" 확인 */
async function detailAction(page: Page, button: string, confirm: RegExp): Promise<void> {
  await page.getByRole('button', { name: button, exact: true }).click();
  await confirmModal(page, confirm, '확인');
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 상세 머리(이름 옆)의 상태 배지가 want 가 될 때까지 다시 읽는다 */
async function waitHeaderStatus(page: Page, want: RegExp, log: (line: string) => void): Promise<void> {
  const badge = page.getByText(want).first();
  for (let i = 0; i < 12 && !(await badge.isVisible().catch(() => false)); i++) {
    await page.waitForTimeout(5_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
  await expect(badge, `상태 ${want}`).toBeVisible({ timeout: 5_000 });
  log(`    상태 ${want.source} 확인`);
}

defineSimpleCrudSpec({
  scenario: 'scenarios/security/kms-key.yaml',
  route: ROUTE,
  createButton: '서비스 생성',
  fields: [{ label: '키명', value: '{{name}}' }],
  beforeSubmit: async (page) => {
    await setGroupCheckbox(page, '프라이빗 접근 제어', false);
    await fillField(page, '퍼블릭 접근 허용 IP', '192.0.2.10/32');
    await page.getByRole('button', { name: '추가', exact: true }).first().click();
    await page.getByText('192.0.2.10/32', { exact: true }).first().waitFor({ timeout: 5_000 });
  },
  createdStatus: /Active/,
  actions: [
    // steps[2] 키 회전
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!);
      expect(await detailValue(page, '현재 버전')).toBe('1');
      await detailAction(page, '키 회전', /회전하시겠습니까/);
      await waitDetailValue(page, '현재 버전', (v) => v === '2', { log, timeoutMs: 60_000 });
    },
    // steps[3] 키 비활성화 → 활성화
    async (page, _vars, log) => {
      await detailAction(page, '키 비활성화', /비활성화하시겠습니까/);
      await waitHeaderStatus(page, /^\s*Stop\s*$/, log);
      await expect(page.getByRole('button', { name: '키 활성화', exact: true })).toBeVisible();
      await detailAction(page, '키 활성화', /활성화하시겠습니까/);
      await waitHeaderStatus(page, /^\s*Active\s*$/, log);
      await expect(page.getByRole('button', { name: '키 비활성화', exact: true })).toBeVisible();
    },
    // steps[4] 설명 수정
    async (page, vars, log) => {
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id}`, { log });
    },
    // steps[5] 태그 추가 → 삭제
    async (page, vars, log) => {
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
    // steps[6] 자동 회전 주기 90일 → 60일 → 90일 (changerotateinfo, PUT …/kms/transit/<id>/rotate-info)
    async (page, _vars, log) => {
      await page.getByText(/^\s*상세 정보\s*$/).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      for (const days of ['60', '90']) {
        const modal = await openLabelEdit(page, '자동 회전');
        await fillStable(page, modal.locator('input[type=text]:visible').first(), days, '회전 주기');
        await logModal(page, log, '자동 회전 수정');
        await saveModal(page, log);
        // 화면: "다음 회전일" 아래 라벨 없는 줄 "회전 주기 N일"
        const cycle = page.getByText(new RegExp(`회전 주기\\s*${days}\\s*일`)).first();
        for (let i = 0; i < 12 && !(await cycle.isVisible().catch(() => false)); i++) {
          await page.waitForTimeout(5_000);
          await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
          await settleConsole(page, { appearGraceMs: 1_000 });
        }
        if (!(await cycle.isVisible().catch(() => false))) await logDetail(page, log, '자동 회전 저장 후');
        await expect(cycle, `회전 주기 ${days}일`).toBeVisible({ timeout: 5_000 });
        log(`    회전 주기 ${days}일 · 다음 회전일 ${await detailValue(page, '다음 회전일')}`);
      }
    },
  ],
  deleteButton: '서비스 해지',
  deleteConfirmText: /해지/,
  tags: ['@light', '@action'],
});
