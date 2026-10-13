// 직접 작성 (2026-09-23). 시나리오: scenarios/networking/dns-hosted-zone.yaml.
// Private DNS(Active) → Hosted Zone(Private, .com) 생성 → 레코드 A 추가·삭제(L3) → 행 삭제 → Private DNS 상세 서비스 해지. 콘솔 사실은 yaml 머리 주석.
import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { logWriteRequests } from '../../src/console/api-log';
import { editDescriptionRoundTrip, logDetail, openDetail, probeEdits } from '../../src/console/detail-edit';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { clearHostedZoneRecords, ROUTES } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/dns-hosted-zone.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const RECORD = 'www';
const RECORD_IP = '192.0.2.10'; // 문서용 대역 (RFC 5737)
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  // Private DNS Creating 3~5분(최대 15분 대기) + Hosted Zone 은 즉시.
  test.describe.configure({ mode: 'serial', timeout: 40 * 60_000 });

  test.afterEach('정리 (역순: Hosted Zone → Private DNS)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    const errors: string[] = [];
    const attempt = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
        log(`  정리 실패 ${name}: ${errors[errors.length - 1]}`);
      }
    };
    await attempt('Hosted Zone 삭제', async () => {
      await gotoRoute(page, ROUTES.hz);
      if ((await row(page, vars.zone!).count()) === 0) return;
      await test.step(`teardown[0] Hosted Zone ${vars.zone} 삭제`, async () => {
        // 본 단계가 레코드를 남긴 채 실패했으면 먼저 지운다(레코드가 있으면 Hosted Zone 삭제가 조용히 무시된다, 2026-10-13 6E 실측)
        await clearHostedZoneRecords(page, vars.zone!, log);
        await gotoRoute(page, ROUTES.hz);
        await row(page, vars.zone!).getByRole('button', { name: '삭제', exact: true }).click();
        await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true, resourceName: vars.zone });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTES.hz, vars.zone!, {
          gone: true,
          timeoutMs: 300_000,
          intervalMs: 10_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('Private DNS 해지', async () => {
      await gotoRoute(page, ROUTES.pdns);
      if ((await row(page, vars.pdns!).count()) === 0) return;
      await test.step(`teardown[1] Private DNS ${vars.pdns} 해지`, async () => {
        await waitForRow(page, ROUTES.pdns, vars.pdns!, {
          status: /Active/i,
          timeoutMs: 900_000,
          intervalMs: 20_000,
          log,
        });
        await row(page, vars.pdns!).getByText(vars.pdns!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지/, '확인', { agree: true, resourceName: vars.pdns });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, ROUTES.pdns, vars.pdns!, {
          gone: true,
          timeoutMs: 300_000,
          intervalMs: 15_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), ctx(1));
      });
    });
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
      await gotoRoute(page, ROUTES.pdns);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] Private DNS ${vars.pdns} 생성`, async () => {
      await openCreateForm(page, ROUTES.pdns, '서비스 생성');
      await fillField(page, 'Private DNS명', vars.pdns!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.pdns, vars.pdns!, {
        status: /Active/i,
        timeoutMs: 900_000,
        intervalMs: 20_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] Hosted Zone ${vars.zone} 생성`, async () => {
      await openCreateForm(page, ROUTES.hz, 'Hosted Zone 생성');
      const priv = page.getByRole('button', { name: 'Private', exact: true }).first();
      if (await priv.count()) await priv.click();
      await page.waitForTimeout(500);
      await pickOption(page, '등록할 Private DNS명', new RegExp(vars.pdns!));
      await fillField(page, '등록할 Hosted Zone명', vars.name!);
      await page.getByRole('button', { name: '사용 가능 여부 조회', exact: true }).click();
      await page.waitForTimeout(1500);
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.hz, vars.zone!, {
        status: /Active/i,
        timeoutMs: 180_000,
        intervalMs: 10_000,
        log,
      });
      log(
        `  Hosted Zone 행: ${(await row(page, vars.zone!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    // L3 (2026-09-30, 에이전트 A): 상세 "레코드 (n)" 탭 → "레코드 추가" 모달(유형 A 기본 · 이름 · 값 + "추가" · TTL) → 확인 → 행 확인 → 행 선택 "삭제"
    await test.step(`steps[3] 레코드 ${RECORD}.${vars.zone} A ${RECORD_IP} 추가`, async () => {
      await gotoRoute(page, ROUTES.hz);
      await row(page, vars.zone!).getByText(vars.zone!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByText(/^레코드 \(\d+\)$/).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByRole('button', { name: '레코드 추가', exact: true }).first().click();
      const modal = visibleModal(page);
      await modal.getByText('레코드 타입은').first().waitFor({ timeout: 10_000 });
      const inputs = modal.locator('input:visible:not([formid=ttlInput])');
      await fillStable(page, inputs.nth(0), RECORD, '레코드 이름');
      await fillStable(page, inputs.nth(1), RECORD_IP, '레코드 값');
      await modal.getByRole('button', { name: '추가', exact: true }).click();
      await expect(modal, '값 목록 1개').toContainText(/1\s*\/\s*8/, { timeout: 10_000 });
      await fillStable(page, modal.locator('input[formid=ttlInput]:visible'), '300', 'TTL');
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      // 이어지는 "…추가하시겠습니까?" 확인 모달이 있으면 누른다
      if (await visibleModal(page).getByText(/하시겠습니까/).first().waitFor({ timeout: 5_000 }).then(() => true, () => false))
        await confirmModal(page, /하시겠습니까/);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      const recordRoute = '#' + page.url().split('#')[1]!;
      await waitForRow(page, recordRoute, RECORD_IP, { timeoutMs: 180_000, intervalMs: 10_000, log });
      log(`  레코드 행: ${(await row(page, RECORD_IP).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    // 2026-10-13 6E 실측: 레코드 탭 버튼(행 선택 후) "Hosted Zone 삭제 · 삭제 · 상세 검색 · 레코드 추가", 행 버튼 없음 → 레코드 수정(sethostedzonerecord) 진입점 없음
    await test.step(`steps[4] 레코드 ${RECORD} 삭제`, async () => {
      await logWriteRequests(page, log);
      const recordRoute = '#' + page.url().split('#')[1]!;
      await selectRow(page, RECORD_IP);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, recordRoute, RECORD_IP, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    // 동작(L3, 2026-10-13 6E, API sethostedzone · setprivatedns): 상세 설명 수정 → 반영 → 되돌림. 상세 버튼(activateprivatedns 진입점 확인용)은 로그로.
    await test.step(`steps[5] Hosted Zone ${vars.zone} · Private DNS ${vars.pdns} 설명 수정 → 반영 → 되돌림 (L3)`, async () => {
      // 상세 주소 형식을 모른다 → 목록이 아닌 hosted-zone/private-dns 경로면 상세로 본다
      await openDetail(page, ROUTES.hz, vars.zone!, /\/detail|\/hosted-zone\/(?!list)/);
      await logDetail(page, log, 'Hosted Zone 상세');
      await probeEdits(page, log, 'Hosted Zone');
      await editDescriptionRoundTrip(page, `scp-console-tests ${vars.run_id} edited`, log);
      await openDetail(page, ROUTES.pdns, vars.pdns!, /\/detail|\/private-dns\/(?!list)/);
      await logDetail(page, log, 'Private DNS 상세');
      await probeEdits(page, log, 'Private DNS');
      await editDescriptionRoundTrip(page, `scp-console-tests ${vars.run_id} edited`, log);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
  });
});
