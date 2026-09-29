/**
 * ServiceWatch 공통 조작 (2026-09-29 프로브).
 * 대시보드 "개별 위젯 추가" 와 경보 정책 "지표 선택" 은 같은 지표 트리 모달을 쓴다:
 *   네임스페이스 행(`tr.scp-body-row`, 펼치기 `i.i-tree-open`) → 차원 행("resource_id | 40") → 지표 표(행 선택 `i.table-select`).
 * 지표는 계정에 지표를 남긴 자원이 있어야 보인다(삭제된 자원의 지표도 한동안 남는다: Object Storage 버킷 spec 이 주기적으로 채운다).
 */
import type { Locator, Page } from '@playwright/test';
import { visibleModal } from './ui';

/** 지표를 찾아볼 네임스페이스 순서 (없으면 모달의 나머지 네임스페이스도 차례로 본다) */
const PREFERRED = ['Object Storage', 'File Storage', 'Virtual Server', 'Cloud Functions', 'Private DNS'];

/** 열린 지표 트리 모달에서 첫 지표 하나를 고른다. 고른 지표 행 텍스트를 돌려준다. */
export async function pickFirstMetric(page: Page): Promise<string> {
  const modal = visibleModal(page);
  const nsRows = modal.locator('tr.scp-body-row:has(i.i-tree-open)');
  await nsRows.first().waitFor({ timeout: 30_000 });
  const all = (await nsRows.allInnerTexts()).map((s) => s.split('\n')[0]!.replace(/서비스 대시보드/, '').trim());
  const order = [...PREFERRED.filter((n) => all.includes(n)), ...all.filter((n) => !PREFERRED.includes(n))];
  for (const ns of order) {
    const nsRow = modal.locator('tr.scp-body-row').filter({ hasText: ns }).first();
    const opener = nsRow.locator('i.i-tree-open');
    if (!(await opener.count())) continue;
    await opener.first().click();
    // 차원 행("resource_id | 40" 처럼 이름 뒤에 지표 수)이 나타나길 잠깐 기다린다
    const dim: Locator = modal
      .locator('tr.scp-body-row:has(i.i-tree-open)')
      .filter({ hasText: /\|?\s*\d+\s*$/ })
      .filter({ hasNotText: ns })
      .first();
    const hasDim = await dim
      .waitFor({ timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (hasDim) {
      await dim.locator('i.i-tree-open').first().click();
      const metric = modal.locator('tr.scp-body-row:not(:has(table)):has(i.table-select)').first();
      if (
        await metric
          .waitFor({ timeout: 15_000 })
          .then(() => true)
          .catch(() => false)
      ) {
        const text = (await metric.innerText()).replace(/\s+/g, ' ').trim();
        await metric.locator('i.table-select').first().click();
        return `${ns} | ${text}`;
      }
    }
    // 이 네임스페이스엔 지표가 없다 → 접고 다음
    const closer = nsRow.locator('i.i-tree-close');
    if (await closer.count()) await closer.first().click();
  }
  throw new Error(`지표 트리에서 고를 지표가 없습니다 (네임스페이스: ${order.join(', ')})`);
}
