// 직접 작성 (2026-09-29). 시나리오: scenarios/container/container-registry.yaml.
// simple-crud 팩토리 대신 흐름을 직접 쓴다: 해지 뒤 Terminating 이 수 분 이어지는데(실측 2026-09-29 약 3~5분),
// 팩토리의 소멸 대기는 목록을 다시 읽는 순간(행 0개)을 소멸로 보고 넘어가 not_text 검사(2분)에서 실패했다.
// 2026-10-06 L3 동작 추가(steps[2]·[3]): 상세 "엔드포인트" 프라이빗 → 프라이빗&퍼블릭(Editing → Running) → 프라이빗(되돌림), 태그 추가 → 삭제.
// 여기서는 표가 다 그려진 뒤(행, 또는 빈 목록 안내 "서비스를 생성하세요." / "데이터가 없습니다")에 이름이 없을 때만 소멸로 본다.
import { expect, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { detailValue, openLabelEdit, saveModal } from '../../src/console/detail-edit';
import { allBodyText } from '../../src/console/frames';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  row,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { addTag, removeTag } from '../../src/console/tags';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/container/container-registry.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/scr/registry';
const READY = /Running|Active|Ready|Available/i;
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 표가 다 그려진 상태에서 이름이 사라질 때까지 새로 고치며 기다린다 */
async function waitGone(page: Page, name: string, timeoutMs = 600_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
    await page
      .locator('tr.scp-body-row, :text("서비스를 생성하세요"), :text("데이터가 없습니다")')
      .first()
      .waitFor({ timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_000);
    const loaded =
      (await page.locator('tr.scp-body-row').count()) > 0 ||
      (await page.getByText(/서비스를 생성하세요|데이터가 없습니다/).count()) > 0;
    const text = await allBodyText(page);
    const elapsed = Math.round((Date.now() - start) / 1000);
    if (loaded && !text.includes(name)) return;
    log(
      `  [${elapsed}s] ${name} 소멸 대기… ${
        loaded
          ? (
              await row(page, name)
                .first()
                .innerText()
                .catch(() => '')
            )
              .replace(/\s+/g, ' ')
              .slice(0, 100)
          : '(표 로딩 중)'
      }`,
    );
    if (Date.now() - start > timeoutMs) throw new Error(`${name} 소멸 대기 ${timeoutMs / 1000}초 초과`);
    await page.waitForTimeout(15_000);
  }
}

/**
 * 상세 "엔드포인트" 연필 → 모달 버튼(프라이빗 / 프라이빗&퍼블릭) → 확인. 저장하면 목록 상태가 Editing(≈1~2분) → Running 으로 돌아오고
 * 상세 값이 바뀐다(2026-10-06 실측). 퍼블릭을 켜도 퍼블릭 엔드포인트 접근 제어가 "사용"·허용 IP 0개라 외부에서 접근할 수 없다.
 */
async function setEndpoint(page: Page, name: string, mode: '프라이빗' | '프라이빗&퍼블릭'): Promise<void> {
  const modal = await openLabelEdit(page, '엔드포인트');
  await modal.getByRole('button', { name: mode, exact: true }).click();
  await saveModal(page, log);
  const detail = page.url();
  await waitForRow(page, ROUTE, name, { status: READY, timeoutMs: 600_000, intervalMs: 15_000, log });
  await page.goto(detail);
  await settleConsole(page, { appearGraceMs: 800 });
  const start = Date.now();
  for (;;) {
    const v = await detailValue(page, '엔드포인트');
    if (v === mode) break;
    if (Date.now() - start > 120_000) throw new Error(`엔드포인트가 ${mode} 로 바뀌지 않았습니다. 마지막: ${v}`);
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
  log(`    엔드포인트 = ${mode}`);
}

const publicEndpointLabel = (page: Page) =>
  page.locator('.scp-form-group-label:visible').filter({ hasText: /^\s*퍼블릭 엔드포인트\s*$/ });

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

  test.afterEach('정리', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 해지`, async () => {
      if (!/Terminating/i.test(await row(page, vars.name!).first().innerText())) {
        await waitForRow(page, ROUTE, vars.name!, {
          status: READY,
          timeoutMs: 600_000,
          intervalMs: 15_000,
          log,
        });
        // 목록에는 해지 버튼이 없다 → 이름 링크로 상세에 들어가 상단 "서비스 해지"
        await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지|삭제/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await gotoRoute(page, ROUTE);
      }
      await waitGone(page, vars.name!);
      await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
    });
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '서비스 생성');
      await fillField(page, '레지스트리명', vars.name!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, vars.name!, {
        status: READY,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      log(
        `  Registry 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] ${scenario.steps[2]!.goal}`, async () => {
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      expect(await detailValue(page, '엔드포인트')).toBe('프라이빗');
      await setEndpoint(page, vars.name!, '프라이빗&퍼블릭');
      await expect(publicEndpointLabel(page), '퍼블릭 엔드포인트 주소가 보여야 합니다').toHaveCount(1);
      await setEndpoint(page, vars.name!, '프라이빗');
      await expect(publicEndpointLabel(page)).toHaveCount(0);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] ${scenario.steps[3]!.goal}`, async () => {
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
  });
});
