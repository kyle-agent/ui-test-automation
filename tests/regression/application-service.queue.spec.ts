// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/queue.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-10-06 L3 동작 추가(steps[2]·[3]): 상세 "메시지 설정" 연필 → 보존 기간 4→5일 → "Queue를 수정하시겠습니까?" → 상세 반영,
// "IP 접근 허용 목록" IP Address 추가(모달) → 행 확인 → 행 "삭제" → 0건. 콘솔에 메시지 보내기/받기·purge 화면은 없다(상세 버튼: 서비스 해지·삭제·IP Address 추가뿐).
// 2026-10-07 6차(에이전트 6D): 유형을 FIFO 로 바꿨다(중복 제거 설정은 FIFO 에만 있다). FIFO Queue명은 ".fifo" 로 끝나야 한다(없으면 "입력 조건에 맞지 않습니다")
// → 실제 이름 "<name>.fifo". steps[4]: 설명 수정, "중복 제거 범위" 대기열 내 메시지 → 그룹 단위의 메시지 → 되돌림, "컨텐츠 기반 중복 제거" 미사용 → 사용 → 미사용.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { detailValue, editDetailText, openDetail, openLabelEdit, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { confirmModal, dismissModalIfAny, fillField, fillStable, isChecked, row, visibleModal } from '../../src/console/ui';

const ROUTE = '#/queueservice/queueservices';
const IP = '192.0.2.10/32';
/** FIFO Queue 의 실제 이름 (콘솔 규칙: ".fifo" 접미사) */
const fifo = (vars: Record<string, string>) => `${vars.name!}.fifo`;

/** "중복 제거 범위" 수정 모달: 선택지 2개(대기열 내 메시지 / 그룹 단위의 메시지) */
async function setDedupScope(page: Page, scope: '대기열 내 메시지' | '그룹 단위의 메시지', log: (l: string) => void) {
  const modal = await openLabelEdit(page, '중복 제거 범위');
  await modal.locator('.scp-select:visible').filter({ hasText: scope }).first().click();
  await saveModal(page, log);
  await waitDetailValue(page, '중복 제거 범위', (v) => v === scope, { log, timeoutMs: 60_000 });
}

/** "컨텐츠 기반 중복 제거" 수정 모달: "사용" 체크 하나 */
async function setContentDedup(page: Page, on: boolean, log: (l: string) => void) {
  const modal = await openLabelEdit(page, '컨텐츠 기반 중복 제거');
  const box = modal.locator('.scp-select:visible').filter({ hasText: /^\s*사용\s*$/ }).first();
  if ((await isChecked(box)) !== on) await box.click();
  await expect.poll(() => isChecked(box), { timeout: 3_000 }).toBe(on);
  await saveModal(page, log);
  await waitDetailValue(page, '컨텐츠 기반 중복 제거', (v) => v === (on ? '사용' : '미사용'), { log, timeoutMs: 60_000 });
}

defineSimpleCrudSpec({
  scenario: 'scenarios/application-service/queue.yaml',
  route: ROUTE,
  createButton: '서비스 생성',
  // 유형을 먼저 FIFO 로 고른 뒤 이름을 넣는다(이름을 먼저 넣고 유형을 바꾸면 다시 검사하며 "이미 등록된 Queue명" 오류가 남았다, 2026-10-07)
  dropdowns: [{ label: '유형', option: 'FIFO' }],
  beforeSubmit: async (page, vars) => {
    await fillField(page, 'Queue명', fifo(vars));
  },
  actions: [
    // steps[2] 메시지 보존 기간 수정
    async (page, vars, log) => {
      await openDetail(page, ROUTE, fifo(vars));
      expect(await detailValue(page, '유형')).toBe('FIFO');
      expect(await detailValue(page, '메시지 보존 기간')).toBe('4일');
      const modal = await openLabelEdit(page, '메시지 설정');
      // 모달 입력 순서: 메시지 크기(KB) · 보존 기간(일) · 표시 제한 · 수신 대기 (FIFO 에는 전송 지연이 없다)
      await fillStable(page, modal.locator('input[type=text]:visible').nth(1), '5', '메시지 보존 기간');
      await saveModal(page, log);
      await waitDetailValue(page, '메시지 보존 기간', (v) => v === '5일', { log, timeoutMs: 60_000 });
    },
    // steps[3] IP 접근 허용 목록 추가 → 삭제
    async (page, _vars, log) => {
      await page.getByRole('button', { name: 'IP Address 추가', exact: true }).click();
      const modal = visibleModal(page);
      await modal.waitFor({ timeout: 10_000 });
      // 모달 안 "추가" 는 입력 행을 하나 더 만든다(빈 행이 있으면 "확인" 비활성) → 첫 칸만 채우고 확인
      await fillStable(page, modal.locator('input[type=text]:visible').first(), IP, 'IP Address');
      await saveModal(page, log);
      await expect(row(page, IP), '추가한 IP 가 허용 목록에 보여야 합니다').toHaveCount(1, { timeout: 30_000 });
      await row(page, IP).getByRole('button', { name: '삭제', exact: true }).click();
      await confirmModal(page, /삭제하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await expect(row(page, IP), '삭제한 IP 가 허용 목록에서 사라져야 합니다').toHaveCount(0, { timeout: 30_000 });
      log(`    IP 접근 허용 목록 ${IP} 추가 → 삭제 확인`);
    },
    // steps[4] 설명 · 중복 제거 범위 · 컨텐츠 기반 중복 제거 (API: updatequeuedescription · updatequeuededuplicationscope · updatequeuededuplication)
    async (page, vars, log) => {
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id}`, { log });
      expect(await detailValue(page, '중복 제거 범위')).toBe('대기열 내 메시지');
      await setDedupScope(page, '그룹 단위의 메시지', log);
      await setDedupScope(page, '대기열 내 메시지', log);
      expect(await detailValue(page, '컨텐츠 기반 중복 제거')).toBe('미사용');
      await setContentDedup(page, true, log);
      await setContentDedup(page, false, log);
    },
  ],
  deleteButton: '서비스 해지',
  tags: ['@light', '@action'],
});
