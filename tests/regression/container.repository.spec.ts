// 직접 작성 (2026-09-29). 시나리오: scenarios/container/repository.yaml.
// Registry → Repository → 역순 삭제. Registry 흐름은 container.container-registry.spec.ts 와 같다(상세 해지, Terminating 대기).
// 2026-10-06 L3 동작 추가(steps[3]~[5]): 상세 "이미지 태그 삭제" 정책(Untagged 90일 + 활성화) 켜기 → 끄기, "이미지 잠금 여부" Lock → Unlock,
// 설명 연필 수정 + 태그 추가 → 삭제. (이미지 push 는 docker 가 필요해 하지 않는다. 자동 스캔은 push 때 과금이라 건드리지 않는다)
// 2026-10-07 6차(에이전트 6D): steps[6] 이미지 pull 제한(스캔되지 않은 이미지) · 이미지 자동 스캔 켬 → 끔.
// Repository 목록은 제목 옆 레지스트리 드롭다운 + "조회" 로 레지스트리를 골라야 행이 보인다.
import { expect, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { detailValue, editDetailText, openLabelEdit, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { allBodyText } from '../../src/console/frames';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  isChecked,
  openCreateForm,
  pickOption,
  row,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { addTag, removeTag } from '../../src/console/tags';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/container/repository.yaml');
const vars = scenarioVars(scenario);
const REGISTRY_ROUTE = '#/scr/registry';
const REPO_ROUTE = '#/scr/repository';
const READY = /Running|Active|Ready|Available/i;
const EMPTY = /서비스를 생성하세요|데이터가 없습니다/;
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const rowText = async (page: Page, name: string) =>
  (
    await row(page, name)
      .first()
      .innerText()
      .catch(() => '')
  )
    .replace(/\s+/g, ' ')
    .slice(0, 120);

/** 표가 다 그려진 상태(행 또는 빈 목록 안내)에서 이름이 사라질 때까지 새로 고치며 기다린다 */
async function waitGone(page: Page, name: string, reopen: () => Promise<void>, timeoutMs = 600_000) {
  const start = Date.now();
  for (;;) {
    await reopen();
    await page
      .locator('tr.scp-body-row, :text("서비스를 생성하세요"), :text("데이터가 없습니다")')
      .first()
      .waitFor({ timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_000);
    const loaded =
      (await page.locator('tr.scp-body-row').count()) > 0 || (await page.getByText(EMPTY).count()) > 0;
    if (loaded && !(await allBodyText(page)).includes(name)) return;
    const elapsed = Math.round((Date.now() - start) / 1000);
    log(`  [${elapsed}s] ${name} 소멸 대기… ${loaded ? await rowText(page, name) : '(표 로딩 중)'}`);
    if (Date.now() - start > timeoutMs) throw new Error(`${name} 소멸 대기 ${timeoutMs / 1000}초 초과`);
    await page.waitForTimeout(15_000);
  }
}

async function reloadRegistryList(page: Page) {
  await gotoRoute(page, REGISTRY_ROUTE);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
}

/** Repository 목록을 열고 제목 옆 드롭다운에서 우리 레지스트리를 골라 조회한다 */
async function openRepoList(page: Page) {
  await gotoRoute(page, REPO_ROUTE);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  const dd = page
    .locator('.scp-dropdown:visible')
    .filter({ hasNotText: /한국 서부|개씩 보기/ })
    .first();
  if (!(await dd.count())) return;
  if (!(await dd.innerText()).includes(vars.registry!)) {
    await dd.click();
    const menu = page.locator('.scp-menu:visible').last();
    await menu.waitFor({ timeout: 10_000 });
    await menu.locator('.scp-menu-item').filter({ hasText: vars.registry! }).first().click();
    await page.waitForTimeout(500);
  }
  const query = page.getByRole('button', { name: '조회', exact: true }).first();
  if ((await query.count()) && (await query.isEnabled())) await query.click();
  await settleConsole(page, { appearGraceMs: 800 });
}

async function deleteRepository(page: Page) {
  await openRepoList(page);
  if ((await row(page, vars.name!).count()) === 0) return;
  // 목록에 선택 칸·행 버튼이 없다 → 이름 링크로 상세(#/scr/repository/detail/info) 에 들어가 상단 "Repository 삭제" (실측 2026-09-29)
  await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await topButton(page, 'Repository 삭제').click();
  await confirmModal(page, /삭제|해지/, '확인', { agree: true, resourceName: vars.name });
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await waitGone(page, vars.name!, () => openRepoList(page), 300_000);
}

async function deleteRegistry(page: Page) {
  await gotoRoute(page, REGISTRY_ROUTE);
  if ((await row(page, vars.registry!).count()) === 0) return;
  if (!/Terminating/i.test(await rowText(page, vars.registry!))) {
    await waitForRow(page, REGISTRY_ROUTE, vars.registry!, {
      status: READY,
      timeoutMs: 600_000,
      intervalMs: 15_000,
      log,
    });
    await row(page, vars.registry!).getByText(vars.registry!, { exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await topButton(page, '서비스 해지').click();
    await confirmModal(page, /해지|삭제/, '확인', { agree: true, resourceName: vars.registry });
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  }
  await waitGone(page, vars.registry!, () => reloadRegistryList(page));
}

/**
 * 상세 "이미지 태그 삭제" 연필 → "Untagged Image 자동 삭제"(기본 90일) + "삭제 정책 활성화" 체크 → 확인 → "수정한 정보를 저장하시겠습니까?".
 * 이미지가 없는 빈 Repository 라 실제로 지워질 것은 없다. on=false 로 되돌린다.
 */
async function setTagDeletePolicy(page: Page, on: boolean): Promise<void> {
  const modal = await openLabelEdit(page, '이미지 태그 삭제');
  const boxes = modal.locator('.scp-select:visible');
  const untagged = boxes.filter({ hasText: 'Untagged Image 자동 삭제' }).first();
  const enable = boxes.filter({ hasText: /^\s*사용\s*$/ }).last();
  for (const box of [untagged, enable]) if ((await isChecked(box)) !== on) await box.click();
  await expect.poll(async () => [await isChecked(untagged), await isChecked(enable)], { timeout: 3_000 }).toEqual([on, on]);
  await saveModal(page, log);
  await waitDetailValue(page, '삭제 정책 활성화', (v) => v === (on ? '사용' : '미사용'), { log, timeoutMs: 60_000 });
  await waitDetailValue(page, '삭제 정책', (v) => (on ? /Untagged Image 자동 삭제 - 90 Days/.test(v) : /Untagged Image 자동 삭제 - 미사용/.test(v)), {
    log,
    timeoutMs: 30_000,
  });
}

/** 상세 "이미지 잠금 여부" 연필 → "Lock" 체크 → 확인. 값 Unlock ↔ Lock */
async function setImageLock(page: Page, lock: boolean): Promise<void> {
  const modal = await openLabelEdit(page, '이미지 잠금 여부');
  const box = modal.locator('.scp-select:visible').filter({ hasText: 'Lock' }).first();
  if ((await isChecked(box)) !== lock) await box.click();
  await expect.poll(() => isChecked(box), { timeout: 3_000 }).toBe(lock);
  await saveModal(page, log);
  await waitDetailValue(page, '이미지 잠금 여부', (v) => v.startsWith(lock ? 'Lock' : 'Unlock'), { log, timeoutMs: 60_000 });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 30 * 60_000 });

  test.afterEach('정리 (역순: Repository → Registry)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    const errors: string[] = [];
    const attempt = async (what: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${what}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
        log(`  정리 실패 ${errors[errors.length - 1]}`);
      }
    };
    await attempt('Repository 삭제', () =>
      test.step(`teardown[0] ${vars.name} 삭제`, async () => {
        await deleteRepository(page);
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      }),
    );
    await attempt('Registry 해지', () =>
      test.step(`teardown[1] ${vars.registry} 해지`, async () => {
        await deleteRegistry(page);
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      }),
    );
    if (errors.length) throw new Error(`정리 중 실패 (남은 리소스를 확인하세요):\n${errors.join('\n')}`);
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, REGISTRY_ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] Registry ${vars.registry} 생성`, async () => {
      await openCreateForm(page, REGISTRY_ROUTE, '서비스 생성');
      await fillField(page, '레지스트리명', vars.registry!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, REGISTRY_ROUTE, vars.registry!, {
        status: READY,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Repository ${vars.name} 생성`, async () => {
      await openCreateForm(page, REPO_ROUTE, 'Repository 생성');
      await pickOption(page, '레지스트리', new RegExp(vars.registry!));
      await fillField(page, '리포지토리명', vars.name!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      const start = Date.now();
      for (;;) {
        await openRepoList(page);
        const text = await rowText(page, vars.name!);
        if (text && READY.test(text)) {
          log(`  Repository 행: ${text}`);
          break;
        }
        // 상태 열 값이 READY 가 아니어도 행이 있고 Creating 류가 아니면 받아들인다 (상태 이름 미확인, 첫 실행에서 기록)
        if (text && !/Creating|Pending|생성 중/i.test(text) && Date.now() - start > 60_000) {
          log(`  Repository 행(상태 확인 필요): ${text}`);
          break;
        }
        if (Date.now() - start > 300_000)
          throw new Error(`${vars.name} 등장 대기 300초 초과. 마지막: ${text || '(행 없음)'}`);
        log(`  [${Math.round((Date.now() - start) / 1000)}s] ${vars.name} 대기… ${text || '(행 없음)'}`);
        await page.waitForTimeout(10_000);
      }
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] ${scenario.steps[3]!.goal}`, async () => {
      await openRepoList(page);
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/#\/scr\/repository\/detail/, { timeout: 15_000 });
      expect(await detailValue(page, '삭제 정책 활성화')).toBe('미사용');
      await setTagDeletePolicy(page, true);
      await setTagDeletePolicy(page, false);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] ${scenario.steps[4]!.goal}`, async () => {
      await setImageLock(page, true);
      await setImageLock(page, false);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] ${scenario.steps[5]!.goal}`, async () => {
      await editDetailText(page, '설명', `scp-console-tests ${vars.run_id}`, { log });
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
    // 6차(2026-10-07, 에이전트 6D): 이미지 pull 제한 · 이미지 스캔 정책 켬 → 끔 (API updaterepositorypullpolicy · updaterepositoryscanpolicy).
    // 이미지가 없는 빈 Repository 라 스캔(Push 때 과금)은 일어나지 않는다.
    await test.step(`steps[6] ${scenario.steps[6]!.goal}`, async () => {
      await page.getByText('상세정보', { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      for (const on of [true, false]) {
        await setFirstCheck(page, '이미지 pull 제한', on, '스캔되지 않은 이미지 pull 제한');
        await setFirstCheck(page, '이미지 스캔', on, '자동 스캔');
      }
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
    });
  });
});

/** 수정 모달의 첫 "사용" 체크를 on/off 하고 저장 → 상세 하위 라벨 값(사용/미사용) 확인 */
async function setFirstCheck(page: Page, label: string, on: boolean, valueLabel: string): Promise<void> {
  const modal = await openLabelEdit(page, label);
  const box = modal.locator('.scp-select:visible').first();
  if ((await isChecked(box)) !== on) await box.click();
  await expect.poll(() => isChecked(box), { timeout: 3_000 }).toBe(on);
  await saveModal(page, log);
  await waitDetailValue(page, valueLabel, (v) => v.startsWith(on ? '사용' : '미사용'), { log, timeoutMs: 60_000 });
}
