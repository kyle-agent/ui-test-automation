// 직접 작성 (2026-09-30). 시나리오: scenarios/networking/gslb.yaml. 공용 팩토리: src/console/simple-crud.ts
import { expect } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { editDetailText } from '../../src/console/detail-edit';
import { settleConsole } from '../../src/console/overlays';
import { below, confirmModal, dismissModalIfAny, fillField, fillStable, pickOption, row, selectRow, submitForm, topButton, waitForRow } from '../../src/console/ui';

const TARGET = '192.0.2.10'; // 문서용 대역 (RFC 5737)
const RRC = '#/gslb/rrc/list';

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
  actions: [
    // steps[2] Regional Routing Controller(에이전트 3B, 2026-10-06): 이 GSLB 의 KR-WEST-1 위치 행이 "사용" 으로 생긴다.
    // 행 선택 → 상단 아이콘(더보기) 메뉴 "중지" → 확인 → "중지" 반영 → 다시 선택 → 상단 "사용"(사용 중엔 비활성) → 확인 → "사용" 복귀.
    // API 의 setgslbregionalroutingcontrol(PUT …/routing-control {region, status}) 에 해당.
    async (page, vars, log) => {
      const toggle = async (to: '중지' | '사용') => {
        await gotoRoute(page, RRC);
        await waitForRow(page, RRC, vars.name!, { timeoutMs: 120_000, log });
        await selectRow(page, vars.name!);
        if (to === '중지') {
          await page.locator('button.scp-button-icon:visible:not(tr button)').first().click();
          await page.locator('.scp-menu:visible .scp-menu-item').filter({ hasText: /^중지$/ }).first().click();
        } else await topButton(page, '사용').click();
        await confirmModal(page, /중지|사용|변경/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        // 행 끝 "사용 여부" 열 (중지 직후 Editing 등 중간 상태가 있을 수 있다)
        await waitForRow(page, RRC, vars.name!, {
          status: to === '중지' ? /(중지|미사용)\s*$/ : /(^|[^미])사용\s*$/,
          timeoutMs: 300_000,
          log,
        });
        log(`  RRC ${vars.name} → ${to}: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ')}`);
      };
      await toggle('중지');
      await toggle('사용');
    },
    // steps[3] (에이전트 3C, 2026-10-06): 상세 "연결 대상 (1)" 탭 → "연결 대상 수정"(#/gslb/gslb/connection-target/request) → 표의 Weight 1 → 5
    // → "완료" → "연결 대상을 수정하시겠습니까?" → 탭 표에 5 (저장 직후 한 번은 옛 값이라 다시 읽는다) → 설명 연필 수정.
    async (page, vars, log) => {
      await gotoRoute(page, '#/gslb/gslb/list');
      await row(page, vars.name!).getByText(new RegExp(`^${vars.name}`)).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      const openTargets = async () => {
        await page.getByText(/^\s*연결 대상 \(\d+\)\s*$/).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
      };
      /** 연결 대상 표에서 머리 "Weight" 열의 값 */
      const weightCell = async () =>
        row(page, TARGET)
          .first()
          // 열 순서: IP · Resource ID · 위치 · 설명 · 사용 여부 · Weight · 연결 상태 (머리는 다른 table 이라 본문 칸으로 센다: 사용 여부 다음 칸)
          .evaluate((tr) => {
            const cells = [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim()).filter(Boolean);
            const i = cells.findIndex((c) => c === '사용' || c === '중지' || c === '미사용');
            return i >= 0 && cells[i + 1] !== undefined ? cells[i + 1]! : `?(${cells.join('|')})`;
          })
          .catch(() => '');
      await openTargets();
      log(`  연결 대상 Weight(수정 전) = ${await weightCell()}`);
      await topButton(page, '연결 대상 수정').click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/connection-target\/request/, { timeout: 15_000 });
      const weight = row(page, TARGET).locator('input:visible').first();
      await fillStable(page, weight, '5', '연결 대상 Weight');
      await submitForm(page, '완료');
      await confirmModal(page, /수정하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await settleConsole(page, { appearGraceMs: 800 });
      await expect
        .poll(
          async () => {
            await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
            await settleConsole(page, { appearGraceMs: 800 });
            if (!/detail\/target/.test(page.url())) await openTargets();
            return weightCell();
          },
          { message: '연결 대상 Weight 5', timeout: 120_000, intervals: [5_000] },
        )
        .toBe('5');
      log(`  연결 대상 ${TARGET} Weight 1 → 5 확인`);
      await page.getByText(/^\s*상세 정보\s*$/).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id}`, { log });
    },
  ],
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
