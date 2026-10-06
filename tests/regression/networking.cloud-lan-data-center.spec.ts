// 직접 작성 (2026-10-06, 에이전트 3B). 시나리오: scenarios/networking/cloud-lan-data-center.yaml. 공용 팩토리: src/console/simple-crud.ts
// Network → vDevice 2개(vSwitch·vRouter, 각 ≈1분 Creating) → vCable(Static, A↔B) → 역순 삭제 → Network 해지. PASS 8분 (2026-10-06)
// 1차 실행에서 vRouter 가 Failed 로 끝났다(재실행에선 Active) → 실패하면 만든 vDevice 를 지우고 오류를 올린다(Network 는 afterEach 가 해지).
// Interface 는 만들지 않는다: 유형 1G-T/1G-F 물리 인터페이스, 약정 None/1년/3년 + 요금 확인(조회실패) → 장비·회선 과금 상품.
import type { Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { confirmModal, dismissModalIfAny, fillField, openCreateForm, pickOption, refreshList, row, selectRow, submitForm, topButton, waitForRow } from '../../src/console/ui';

const DEVICE = '#/clandc/device';
const CABLE = '#/clandc/cable';

async function submitAndWait(page: Page, route: string, name: string, log: (l: string) => void): Promise<void> {
  await submitForm(page, '생성');
  await confirmModal(page, /생성/, '확인', { agree: true });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  // 확인 직후 곧바로 목록으로 가면 생성 요청이 끊길 수 있다 → 콘솔이 폼을 떠날 때까지
  const formUrl = page.url();
  await page.waitForURL((u) => u.toString() !== formUrl, { timeout: 15_000 }).catch(() => undefined);
  await waitForRow(page, route, name, { status: /Active|Failed/, timeoutMs: 300_000, log });
  const text = (await row(page, name).first().innerText()).replace(/\s+/g, ' ');
  log(`  ${name}: ${text}`);
  if (/Failed/.test(text)) throw new Error(`${name} 생성 Failed: ${text}`);
}

/**
 * 행 끝 "삭제" → 확인 → 소멸. vDevice 삭제가 가끔 Failed 로 끝난다(2026-10-06 vSwitch, Deleting → Failed).
 * Failed 행은 "삭제" 를 다시 누르면 ≈45초 만에 지워졌다 → Failed 가 보이면 최대 3회 다시 지운다.
 */
async function deleteRow(page: Page, route: string, name: string, log: (l: string) => void): Promise<void> {
  await waitForRow(page, route, name, { timeoutMs: 60_000, log });
  for (let attempt = 1; ; attempt++) {
    const r = row(page, name);
    const inRow = r.getByRole('button', { name: '삭제', exact: true });
    if (await inRow.count()) await inRow.click();
    else {
      await selectRow(page, name);
      await topButton(page, '삭제').click();
    }
    await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: name });
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    // 소멸 또는 Failed 를 기다린다
    let state = '';
    for (const start = Date.now(); Date.now() - start < 300_000; ) {
      await page.waitForTimeout(10_000);
      await refreshList(page);
      const r2 = row(page, name);
      if ((await r2.count()) === 0) {
        state = 'gone';
        break;
      }
      const t = (await r2.first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (/Failed/.test(t)) {
        state = 'failed';
        break;
      }
      log(`  [${Math.round((Date.now() - start) / 1000)}s] ${name} 삭제 대기… ${t.slice(0, 100)}`);
    }
    if (state === 'gone') break;
    if (state === '') throw new Error(`${name} 삭제 대기 300초 초과`);
    if (attempt >= 3) throw new Error(`${name} 삭제가 ${attempt}회 Failed`);
    log(`  ${name} 삭제 → Failed, 다시 삭제 (${attempt}/3)`);
  }
  await waitForRow(page, route, name, { gone: true, timeoutMs: 120_000, log });
}

/** vDevice 생성. 가끔 Failed 로 끝난다(2026-10-06 vRouter 1회) → Failed 면 지우고 한 번 다시 만든다. */
async function createDevice(page: Page, network: string, type: string, name: string, log: (l: string) => void): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    await openCreateForm(page, DEVICE, 'vDevice 생성');
    await pickOption(page, 'Cloud LAN Network명', network);
    await pickOption(page, 'vDevice Type', type);
    await fillField(page, `${type}명`, name);
    try {
      await submitAndWait(page, DEVICE, name, log);
      return;
    } catch (e) {
      const text = (await row(page, name).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (attempt >= 2 || !/Failed/.test(text)) throw e;
      log(`  ${name} 생성 Failed → 지우고 다시 만든다`);
      await deleteRow(page, DEVICE, name, log);
    }
  }
}

defineSimpleCrudSpec({
  scenario: 'scenarios/networking/cloud-lan-data-center.yaml',
  route: '#/clandc/network',
  createButton: '서비스 생성',
  fields: [{ label: 'Cloud LAN Network명', value: '{{name}}' }],
  // 위치 항목은 SA-EAST-1 하나뿐 (2026-10-06)
  dropdowns: [{ label: 'Cloud LAN Network 위치', option: 'SA-EAST-1' }],
  createdStatus: /Active/,
  actions: [
    // steps[2] vDevice 2개
    async (page, vars, log) => {
      try {
        await createDevice(page, vars.name!, 'vSwitch', vars.switch!, log);
        await createDevice(page, vars.name!, 'vRouter', vars.router!, log);
      } catch (e) {
        for (const n of [vars.switch!, vars.router!]) {
          await page.goto('about:blank').catch(() => undefined);
          await deleteRow(page, DEVICE, n, log).catch((err) => log('  정리 실패/없음 ' + n + ' ' + (err as Error).message.slice(0, 120)));
        }
        throw e;
      }
    },
    // steps[3] vCable Static A(vRouter) ↔ B(vSwitch) 생성 → 삭제
    async (page, vars, log) => {
      await openCreateForm(page, CABLE, 'vCable 생성');
      await pickOption(page, 'Cloud LAN Network명', vars.name!);
      await pickOption(page, 'vCable Type', 'Static');
      await fillField(page, 'vCable명', vars.cable!);
      await pickOption(page, 'vDevice A', new RegExp(vars.router!));
      await pickOption(page, 'vDevice B', new RegExp(vars.switch!));
      await submitAndWait(page, CABLE, vars.cable!, log);
      await deleteRow(page, CABLE, vars.cable!, log);
    },
    // steps[4] vDevice 2개 삭제
    async (page, vars, log) => {
      await deleteRow(page, DEVICE, vars.switch!, log);
      await deleteRow(page, DEVICE, vars.router!, log);
    },
  ],
  deleteButton: '서비스 해지',
  tags: ['@light'],
});
