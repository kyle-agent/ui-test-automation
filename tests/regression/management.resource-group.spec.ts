// 직접 작성 (2026-09-23). 시나리오: scenarios/management/resource-group.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-10-06 L3 동작 추가(steps[2]~[4]): 그룹 자원 탭 "그룹 자원 수정"(…/update/<id>) 에서 그룹 정의 태그 조건 추가 → 저장 → 탭에 칩 표시,
// 같은 화면에서 칩의 삭제 아이콘으로 조건 제거, 태그 탭 "태그 수정" 으로 그룹 자체 태그 추가 → 삭제(src/console/tags.ts).
// (조건에 맞는 실제 자원을 그룹에 넣는 것은 다른 자원에 태그를 달아야 해서 하지 않는다. 그룹 자체에 조건 태그를 달아도 그룹 자원은 0 — 실측)
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { openDetail } from '../../src/console/detail-edit';
import { settleConsole } from '../../src/console/overlays';
import { addTag, removeTag } from '../../src/console/tags';
import { gotoRoute } from '../../src/console/expect';
import {
  below,
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  openCreateForm,
  selectRow,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';

const ROUTE = '#/resourcegroups/resource-group/list';
const TAG_INPUT = 'input[placeholder^="한글, 영문, 숫자, 공백과"]:visible';

async function openGroupResources(page: Page): Promise<void> {
  await page
    .getByText(/^\s*그룹 자원 \(\d+\)\s*$/)
    .first()
    .click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.getByRole('button', { name: '그룹 자원 수정', exact: true }).waitFor({ timeout: 15_000 });
}

/** 그룹 자원 탭 → "그룹 자원 수정" → edit(page) → 저장 → "Resource Group을 수정하시겠습니까?" → 상세 → 그룹 자원 탭 */
async function editGroupDefinition(page: Page, edit: () => Promise<void>): Promise<void> {
  await openGroupResources(page);
  await page.getByRole('button', { name: '그룹 자원 수정', exact: true }).click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.waitForURL(/\/resource-group\/update\//, { timeout: 15_000 });
  await page.locator(TAG_INPUT).first().waitFor({ timeout: 15_000 });
  await edit();
  await submitForm(page, '저장');
  await confirmModal(page, /수정하시겠습니까/, '확인');
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await page.waitForURL(/\/resource-group\/detail\//, { timeout: 20_000 });
  await settleConsole(page, { appearGraceMs: 800 });
  await openGroupResources(page);
}

const chip = (page: Page, text: string) => page.locator('.scp-chip:visible').filter({ hasText: text });

defineSimpleCrudSpec({
  scenario: 'scenarios/management/resource-group.yaml',
  route: ROUTE,
  createButton: 'Resource Group 생성',
  fields: [
    { label: 'Resource Group명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}}', selector: 'textarea' },
  ],
  // 그룹 정의 태그: key/value 두 입력 뒤 "태그 추가" 를 눌러야 목록에 들어간다 (생성 조건)
  beforeSubmit: async (page, vars) => {
    await (await below(page, '그룹 정의 태그', 'input', 0)).fill('qa');
    await (await below(page, '그룹 정의 태그', 'input', 1)).fill(vars.run_id!);
    await page.getByRole('button', { name: '태그 추가', exact: true }).first().click();
  },
  actions: [
    // steps[2] 그룹 정의 태그 조건 추가
    async (page, vars, log) => {
      await openDetail(page, ROUTE, vars.name!);
      const cond = `qa2:${vars.run_id}`;
      await editGroupDefinition(page, async () => {
        const inputs = page.locator(TAG_INPUT);
        await fillStable(page, inputs.nth(0), 'qa2', '그룹 정의 태그 Key');
        await fillStable(page, inputs.nth(1), vars.run_id!, '그룹 정의 태그 Value');
        await page.getByRole('button', { name: '태그 추가', exact: true }).click();
        await expect(chip(page, cond)).toHaveCount(1, { timeout: 5_000 });
      });
      await expect(chip(page, `qa:${vars.run_id}`), '기존 조건').toHaveCount(1, { timeout: 15_000 });
      await expect(chip(page, cond), '추가한 조건').toHaveCount(1, { timeout: 15_000 });
      await expect(page.getByText(/^\s*그룹 정의 태그2\s*$/).first()).toBeVisible();
      log(`    그룹 정의 태그 조건 ${cond} 추가 확인 (조건 2개)`);
    },
    // steps[3] 그룹 정의 태그 조건 제거
    async (page, vars, log) => {
      const cond = `qa2:${vars.run_id}`;
      await editGroupDefinition(page, async () => {
        await chip(page, cond).locator('i.remove-button').click();
        await expect(chip(page, cond)).toHaveCount(0, { timeout: 5_000 });
      });
      await expect(chip(page, cond), '제거한 조건').toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByText(/^\s*그룹 정의 태그1\s*$/).first()).toBeVisible();
      log(`    그룹 정의 태그 조건 ${cond} 제거 확인 (조건 1개)`);
    },
    // steps[4] 그룹 자체 태그 추가 → 삭제
    async (page, vars, log) => {
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
    },
    // steps[5] 태그 2개 → 한 태그 값만 수정 → 2개 중 1개 삭제 → 나머지 삭제 (6C: 단건·일괄 태그 API 중 어느 것을 부르는지 관찰)
    async (page, vars, log) => {
      await addTag(page, 'qa-a', vars.run_id!, log);
      await addTag(page, 'qa-b', vars.run_id!, log);
      await page.getByRole('button', { name: '태그 수정', exact: true }).click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/\/tag\/edit/, { timeout: 15_000 });
      const inputs = page.locator(TAG_INPUT);
      await expect(inputs).toHaveCount(4, { timeout: 15_000 });
      const values = await inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
      const idx = values.findIndex((v, i) => i % 2 === 0 && v === 'qa-a');
      if (idx < 0) throw new Error(`태그 수정 화면에 qa-a 가 없습니다: ${JSON.stringify(values)}`);
      await fillStable(page, inputs.nth(idx + 1), `${vars.run_id}-v2`, '태그 Value 수정');
      await submitForm(page, '저장');
      await confirmModal(page, /하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.waitForURL((u) => !u.hash.includes('/tag/edit'), { timeout: 20_000 });
      await settleConsole(page, { appearGraceMs: 800 });
      await expect(
        page
          .locator('tr.scp-body-row:visible')
          .filter({ hasText: 'qa-a' })
          .filter({ hasText: `${vars.run_id}-v2` }),
      ).toHaveCount(1, {
        timeout: 20_000,
      });
      log(`    태그 qa-a 값 → ${vars.run_id}-v2 확인`);
      await removeTag(page, 'qa-a', log);
      await removeTag(page, 'qa-b', log);
    },
    // steps[6] (agent C 10-16) 그룹 2개 더 생성 → 목록에서 둘을 함께 선택 → "삭제" (여러 건 삭제가 DELETE /v1/resource-groups 일괄 API 인지 관찰)
    async (page, vars, log) => {
      const create = async (name: string) => {
        await openCreateForm(page, ROUTE, 'Resource Group 생성');
        await fillField(page, 'Resource Group명', name);
        await (await below(page, '그룹 정의 태그', 'input', 0)).fill('qa');
        await (await below(page, '그룹 정의 태그', 'input', 1)).fill(vars.run_id!);
        await page.getByRole('button', { name: '태그 추가', exact: true }).first().click();
        await submitForm(page, '생성');
        await confirmModal(page, /생성/, '확인', { agree: true });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTE, name, { timeoutMs: 120_000, intervalMs: 5_000, log });
      };
      await create(vars.name_b!);
      await create(vars.name_c!);
      await gotoRoute(page, ROUTE);
      await selectRow(page, vars.name_b!);
      await selectRow(page, vars.name_c!);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, vars.name_b!, { gone: true, timeoutMs: 120_000, intervalMs: 5_000, log });
      await waitForRow(page, ROUTE, vars.name_c!, { gone: true, timeoutMs: 60_000, intervalMs: 5_000, log });
      log(`    ${vars.name_b}·${vars.name_c} 동시 삭제 확인`);
    },
  ],
  deleteButton: '삭제',
  tags: ['@light', '@action'],
});
