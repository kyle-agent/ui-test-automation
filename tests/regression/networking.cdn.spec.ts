// 직접 작성 (2026-09-30). 시나리오: scenarios/networking/cdn.yaml. 콘솔 사실은 yaml 머리 주석.
// 2026-10-06 L3 동작 추가(steps[2]): 첫 배포(설정 버전 1 Active) 뒤 상세 "수정"(#/cdn/cdn/edit) 에서 Cache 만료시간 86400 → 3600초 → "완료"
// → "Global CDN을 수정하시겠습니까?…" → 설정 버전 2 Pending → 2 Active, 상세 3600초. ("Purge 적용" 은 약 4시간 걸린다는 안내가 있어 정리를 막을 수 있어 하지 않는다)
import { expect, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { detailValue } from '../../src/console/detail-edit';
import { deleteCdn } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  openCreateForm,
  row,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const ROUTE = '#/cdn/cdn/list';
const scenario = loadScenario('scenarios/networking/cdn.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

const rowText = async (page: Page) =>
  (
    await row(page, vars.name!)
      .first()
      .innerText({ timeout: 5_000 })
      .catch(() => '')
  )
    .replace(/\s+/g, ' ')
    .trim();

/** 상세의 "CDN 설정 버전" 값("1 Pending" / "1 Active")이 want 가 될 때까지 다시 읽는다 */
async function waitCdnVersion(page: Page, want: RegExp, timeoutMs = 1_800_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const v = await detailValue(page, 'CDN 설정 버전');
    if (want.test(v)) {
      log(`  CDN 설정 버전 ${v} (${Math.round((Date.now() - start) / 1000)}초)`);
      return;
    }
    if (Date.now() - start > timeoutMs) throw new Error(`CDN 설정 버전 ${want} 대기 ${timeoutMs / 1000}초 초과. 마지막: ${v}`);
    log(`  [${Math.round((Date.now() - start) / 1000)}s] CDN 설정 버전 ${v || '?'}`);
    await page.waitForTimeout(30_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 1_000 });
  }
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud'] }, () => {
  // 배포(설정 버전 Pending) 대기가 길 수 있다
  test.describe.configure({ mode: 'serial', timeout: 90 * 60_000 });

  test.afterEach('정리', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] CDN ${vars.name} 해지`, async () => {
      // 배포("CDN 설정 버전 n Pending") 중엔 상세 버튼이 모두 비활성 → 끝날 때까지 기다린 뒤 (중지 →) 서비스 해지
      await deleteCdn(page, vars.name!, log);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
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
    await test.step(`steps[1] CDN ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '서비스 생성');
      await fillField(page, 'CDN명', vars.name!);
      await fillField(page, 'CDN 도메인', vars.name!);
      // 원본 도메인 칸은 라벨 연결이 없다(formlabel 없음, formid=cdn_origin_hostname)
      await fillStable(page, page.locator('input[formid=cdn_origin_hostname]:visible'), 'example.com', '원본 위치');
      await page.getByRole('button', { name: 'HTTP', exact: true }).first().click();
      await fillField(page, 'Port 번호', '80');
      await fillField(page, 'Cache 만료시간', '86400');
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, vars.name!, { timeoutMs: 300_000, intervalMs: 10_000, log });
      log(`  CDN 행: ${await rowText(page)}`);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] ${scenario.steps[2]!.goal}`, async () => {
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      // 첫 배포(설정 버전 1 Pending ≈6~10분)가 끝나야 "수정" 이 활성화된다
      await waitCdnVersion(page, /^1 Active$/);
      expect(await detailValue(page, 'Cache 만료시간')).toBe('86400초');
      await topButton(page, '수정').click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForURL(/#\/cdn\/cdn\/edit/, { timeout: 15_000 });
      // 숫자 칸은 천 단위 쉼표로 다시 그린다(3600 → "3,600") — fillStable 의 값 비교 대신 직접 확인
      const ttl = page.locator('input[formid=cacheExpiredTime]:visible');
      await ttl.fill('3600');
      await ttl.press('Tab');
      await expect(ttl).toHaveValue('3,600');
      await submitForm(page, '완료');
      await confirmModal(page, /수정하시겠습니까/, '확인');
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await settleConsole(page, { appearGraceMs: 800 });
      // 상세에 새 값과 설정 버전 2(Pending → Active) 가 나타난다. 실측 ≈6분(2026-10-06 프로브)
      await waitCdnVersion(page, /^2 Active$/);
      expect(await detailValue(page, 'Cache 만료시간')).toBe('3600초');
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
  });
});
