// 직접 작성 (2026-09-29). 시나리오: scenarios/application-service/queue.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-10-06 L3 동작 추가(steps[2]·[3]): 상세 "메시지 설정" 연필 → 보존 기간 4→5일 → "Queue를 수정하시겠습니까?" → 상세 반영,
// "IP 접근 허용 목록" IP Address 추가(모달) → 행 확인 → 행 "삭제" → 0건. 콘솔에 메시지 보내기/받기·purge 화면은 없다(상세 버튼: 서비스 해지·삭제·IP Address 추가뿐).
import { expect } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { detailValue, openDetail, openLabelEdit, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { confirmModal, dismissModalIfAny, fillStable, row, visibleModal } from '../../src/console/ui';

const ROUTE = '#/queueservice/queueservices';
const IP = '192.0.2.10/32';

defineSimpleCrudSpec({
  scenario: 'scenarios/application-service/queue.yaml',
  route: ROUTE,
  createButton: '서비스 생성',
  fields: [{ label: 'Queue명', value: '{{name}}' }],
  actions: [
    // steps[2] 메시지 보존 기간 수정
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!);
      expect(await detailValue(page, '메시지 보존 기간')).toBe('4일');
      const modal = await openLabelEdit(page, '메시지 설정');
      // 모달 입력 순서: 메시지 크기(KB) · 보존 기간(일) · 전송 지연 · 표시 제한 · 수신 대기
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
  ],
  deleteButton: '서비스 해지',
  tags: ['@light', '@action'],
});
