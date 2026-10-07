// 직접 작성 (2026-10-06, 에이전트 3B). 시나리오: scenarios/networking/cloud-fabric-connect.yaml. 공용 팩토리: src/console/simple-crud.ts
import type { Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { editDetailText, logDetail, openDetail } from '../../src/console/detail-edit';
import { addTag, removeTag } from '../../src/console/tags';
import { confirmModal, dismissModalIfAny, fillField, openCreateForm, pickOption, row, selectRow, submitForm, topButton, waitForRow } from '../../src/console/ui';

const POLICY = '#/cfc/policy';
const CONNECTION = '#/cfc/connection';

/**
 * Fabric 하위 자원(Policy·Connection): 폼은 Fabric명(항목 "<Fabric명> (Gasan)") + 이름만. 행 끝 "삭제" → 확인 → 소멸.
 * onActive: Active 확인 뒤 삭제 전에 할 동작(상세 수정 등). 끝나면 목록으로 돌아온다.
 */
async function createAndDelete(
  page: Page,
  log: (l: string) => void,
  route: string,
  button: string,
  fabric: string,
  label: string,
  name: string,
  onActive?: () => Promise<void>,
): Promise<void> {
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
  log(`  ${name}: ${(await row(page, name).first().innerText()).replace(/\s+/g, ' ')}`);
  if (onActive) {
    await onActive();
    await gotoRoute(page, route);
  }
  const r = row(page, name);
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

/**
 * 상세(L3, 2026-10-07 5L 프로브): Fabric·Policy·Connection 모두 수정 가능한 항목은 "설명"(연필 → 50자 textarea → 확인) 하나뿐, 태그 탭 있음.
 * 상세 주소는 …/detail 이 아니라 #/cfc/fabric/<id>?name=… · #/cfc/policy/<id>/info · #/cfc/connection/<id>?connectionId=… 이다.
 * 설명 수정 → 반영 확인 → 태그 탭이 있으면 태그 추가·삭제.
 */
async function editDetail(page: Page, log: (l: string) => void, route: string, name: string, runId: string): Promise<void> {
  await openDetail(page, route, name, new RegExp(`${route.slice(1)}/[0-9a-f]{32}`));
  await logDetail(page, log);
  await editDetailText(page, '설명', `qa ${runId}`, { log });
  if (await page.getByText(/^\s*태그\s*\(\d+\)\s*$/).count()) {
    await addTag(page, 'qa-tag', runId, log);
    await removeTag(page, 'qa-tag', log);
  } else log('    태그 탭 없음');
}

defineSimpleCrudSpec({
  scenario: 'scenarios/networking/cloud-fabric-connect.yaml',
  route: '#/cfc/fabric',
  createButton: '서비스 생성',
  fields: [{ label: 'Fabric명', value: '{{name}}' }],
  createdStatus: /Active/,
  actions: [
    // steps[2] Policy 생성 → 목록 확인 → 상세 설명 수정·태그 → 삭제
    async (page, vars, log) => {
      await createAndDelete(page, log, POLICY, 'Policy 생성', vars.name!, 'Policy명', vars.policy!, () =>
        editDetail(page, log, POLICY, vars.policy!, vars.run_id!),
      );
    },
    // steps[3] Connection(구성 방식 기본값) 생성 → 목록 확인 → 상세 설명 수정·태그 → 삭제
    async (page, vars, log) => {
      await createAndDelete(page, log, CONNECTION, 'Connection 생성', vars.name!, 'Connection명', vars.connection!, () =>
        editDetail(page, log, CONNECTION, vars.connection!, vars.run_id!),
      );
    },
    // steps[4] Fabric 상세 설명 수정 (+태그)
    async (page, vars, log) => {
      await editDetail(page, log, '#/cfc/fabric', vars.name!, vars.run_id!);
    },
  ],
  deleteButton: '서비스 해지',
  tags: ['@light', '@action'],
});
