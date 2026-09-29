// 직접 작성 (2026-09-29). 시나리오: scenarios/container/repository.yaml.
// Registry → Repository → 역순 삭제. Registry 흐름은 container.container-registry.spec.ts 와 같다(상세 해지, Terminating 대기).
// Repository 목록은 제목 옆 레지스트리 드롭다운 + "조회" 로 레지스트리를 골라야 행이 보인다.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { allBodyText } from '../../src/console/frames';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  pickOption,
  row,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
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
  });
});
