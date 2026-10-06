// 직접 작성 (2026-10-06, 에이전트 3B). 시나리오: scenarios/networking/cloud-fabric-connect.yaml. 공용 팩토리: src/console/simple-crud.ts
import type { Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { confirmModal, dismissModalIfAny, fillField, openCreateForm, pickOption, row, selectRow, submitForm, topButton, waitForRow } from '../../src/console/ui';

const POLICY = '#/cfc/policy';
const CONNECTION = '#/cfc/connection';

/** Fabric 하위 자원(Policy·Connection): 폼은 Fabric명(항목 "<Fabric명> (Gasan)") + 이름만. 행 끝 "삭제" → 확인 → 소멸 */
async function createAndDelete(page: Page, log: (l: string) => void, route: string, button: string, fabric: string, label: string, name: string): Promise<void> {
  await openCreateForm(page, route, button);
  await pickOption(page, 'Fabric명', new RegExp(`^${fabric} [(]`));
  await fillField(page, label, name);
  await submitForm(page, '생성');
  await confirmModal(page, /생성/, '확인', { agree: true });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  // 확인 직후 곧바로 목록으로 가면 생성 요청이 끊길 수 있다 → 콘솔이 폼을 떠날 때까지
  const formUrl = page.url();
  await page.waitForURL((u) => u.toString() !== formUrl, { timeout: 15_000 }).catch(() => undefined);
  await waitForRow(page, route, name, { status: /Active/, timeoutMs: 300_000, log });
  const r = row(page, name);
  log(`  ${name}: ${(await r.first().innerText()).replace(/\s+/g, ' ')}`);
  const inRow = r.getByRole('button', { name: '삭제', exact: true });
  if (await inRow.count()) await inRow.click();
  else {
    await selectRow(page, name);
    await topButton(page, '삭제').click();
  }
  await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: name });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await waitForRow(page, route, name, { gone: true, timeoutMs: 300_000, log });
}

defineSimpleCrudSpec({
  scenario: 'scenarios/networking/cloud-fabric-connect.yaml',
  route: '#/cfc/fabric',
  createButton: '서비스 생성',
  fields: [{ label: 'Fabric명', value: '{{name}}' }],
  createdStatus: /Active/,
  actions: [
    // steps[2] Policy 생성 → 목록 확인 → 삭제
    async (page, vars, log) => {
      await createAndDelete(page, log, POLICY, 'Policy 생성', vars.name!, 'Policy명', vars.policy!);
    },
    // steps[3] Connection(구성 방식 기본값) 생성 → 목록 확인 → 삭제
    async (page, vars, log) => {
      await createAndDelete(page, log, CONNECTION, 'Connection 생성', vars.name!, 'Connection명', vars.connection!);
    },
  ],
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
