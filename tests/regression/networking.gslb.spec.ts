// 직접 작성 (2026-09-30). 시나리오: scenarios/networking/gslb.yaml. 공용 팩토리: src/console/simple-crud.ts
import { expect } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { below, fillField, fillStable, pickOption, row } from '../../src/console/ui';

const TARGET = '192.0.2.10'; // 문서용 대역 (RFC 5737)

defineSimpleCrudSpec({
  scenario: 'scenarios/networking/gslb.yaml',
  route: '#/gslb/gslb/list',
  createButton: '서비스 생성',
  fields: [{ label: '도메인명', value: '{{name}}' }],
  beforeSubmit: async (page) => {
    // 연결 대상: "연결 대상 추가" 절의 첫 입력칸이 IP. 넣고 "추가" → 연결 대상 목록 1/8
    await fillStable(page, await below(page, '연결 대상 추가', 'input'), TARGET, '연결 대상 IP');
    await page.getByRole('button', { name: '추가', exact: true }).first().click();
    await expect(page.getByText(TARGET).nth(1), '연결 대상 목록에 IP').toBeVisible({ timeout: 10_000 });
    await fillField(page, 'Interval', '5');
    await fillField(page, 'Timeout', '10');
    await fillField(page, 'Probe Timeout', '5');
    await pickOption(page, '알고리즘', 'Round Robin');
    // 연결 대상 표의 "Weight *" 는 Round Robin 에서도 필수(비우면 "생성" 비활성, 2026-09-30 1차)
    await fillStable(page, await below(page, 'Weight', 'input'), '1', '연결 대상 Weight');
  },
  // 목록엔 상태 열이 없다. 만든 직후(CREATING) 행 "서비스 해지" 를 누르면 확인 모달이 안 뜬다(2026-09-30 2차)
  // → 상세에서 Active 를 확인한 뒤 목록으로 돌아간다 (API: CREATING → ACTIVE 10초 안)
  afterCreate: async (page, vars) => {
    await row(page, vars.name!).getByText(new RegExp(`^${vars.name}`)).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await expect
      .poll(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
          await settleConsole(page, { appearGraceMs: 800 });
          const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
          return body.match(/\b(Active|Creating|Editing|Error)\b/i)?.[1] ?? '?';
        },
        { message: 'GSLB 상세 상태 Active', timeout: 300_000, intervals: [10_000] },
      )
      .toMatch(/Active/i);
    await gotoRoute(page, '#/gslb/gslb/list');
  },
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
