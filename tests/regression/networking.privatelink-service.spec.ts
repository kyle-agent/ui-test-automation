// 직접 작성 (2026-09-30, 에이전트 B). 시나리오: scenarios/networking/privatelink-service.yaml. 콘솔 사실은 yaml 머리 주석.
// VPC → Subnet → PrivateLink Service(IP 연결, 수동 승인) → 같은 계정 Endpoint 연결 요청 → Service 에서 승인(L3) → Endpoint 삭제 → Service 삭제 → Subnet → VPC.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { confirmUntil, openDetailTab, pickLate } from '../../src/console/networking';
import { settleConsole } from '../../src/console/overlays';
import { createNetwork, deleteNetwork } from '../../src/console/shared';
import { confirmModal, fillField, openCreateForm, row, submitForm, waitForRow } from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/privatelink-service.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 목록 행 끝 "삭제" 로 Endpoint·Service 를 지운다 (없으면 건너뜀, Creating 이면 끝날 때까지 기다린다). */
async function deleteFromList(page: Page, route: string, name: string, text: RegExp): Promise<void> {
  await gotoRoute(page, route);
  if ((await row(page, name).count()) === 0) return;
  const now = (await row(page, name).first().innerText()).replace(/\s+/g, ' ');
  if (/Creating/i.test(now))
    await waitForRow(page, route, name, { status: /Active|Requesting/, timeoutMs: 600_000, intervalMs: 15_000, log });
  await row(page, name).getByRole('button', { name: '삭제', exact: true }).click();
  await confirmModal(page, text, '확인', { agree: true, resourceName: name });
  await waitForRow(page, route, name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 50 * 60_000 });

  test.afterEach('정리 (역순: Endpoint → Service → Subnet → VPC)', async ({ page }) => {
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
    await attempt('Endpoint · Service 삭제', async () => {
      await test.step(`teardown[0] Endpoint ${vars.ple} · Service ${vars.pls} 삭제`, async () => {
        // 본 단계가 중간에 실패했을 때만 남아 있다
        await deleteFromList(page, ROUTES.ple, vars.ple!, /PrivateLink Endpoint를 삭제하시겠습니까/);
        await deleteFromList(page, ROUTES.pls, vars.pls!, /PrivateLink Service를 삭제하시겠습니까/);
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('Subnet·VPC 삭제', async () => {
      await test.step(`teardown[1] Subnet ${vars.subnet} · VPC ${vars.vpc} 삭제`, async () => {
        await deleteNetwork(page, vars.vpc!, vars.subnet!, log);
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
    let serviceId = '';
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, ROUTES.pls);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] VPC ${vars.vpc} · Subnet ${vars.subnet} 생성`, async () => {
      await createNetwork(page, vars.vpc!, vars.subnet!, log);
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] PrivateLink Service ${vars.pls} 생성`, async () => {
      await openCreateForm(page, ROUTES.pls, 'PrivateLink Service 생성');
      await fillField(page, 'PrivateLink Service명', vars.pls!);
      await pickLate(page, 'VPC명', new RegExp(escapeRe(vars.vpc!)), log); // 항목 "vpc-… (10.250.0.0/20)"
      await pickLate(page, 'Subnet명', new RegExp(escapeRe(vars.subnet!)), log);
      await fillField(page, 'PrivateLink Service IP', vars.pls_ip!);
      await page.getByRole('button', { name: 'IP', exact: true }).first().click(); // 연결 자원: IP (기본 Load Balancer)
      await fillField(page, '자원 IP', vars.target_ip!);
      await fillField(page, '설명', `scp-console-tests ${vars.run_id}`, { selector: 'textarea' });
      await submitForm(page, '생성');
      await confirmUntil(page, /PrivateLink Service를 생성하시겠습니까/, log);
      await waitForRow(page, ROUTES.pls, vars.pls!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      // 상세의 PrivateLink Service ID (Endpoint 가 이 값으로 연결을 요청한다)
      await row(page, vars.pls!).getByText(vars.pls!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 1_000 });
      serviceId = new URL(page.url().replace('#', '')).searchParams.get('privatelinkServiceId') ?? '';
      if (!/^[0-9a-f]{32}$/.test(serviceId)) {
        const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
        serviceId = body.match(/PrivateLink Service ID ([0-9a-f]{32})/)?.[1] ?? '';
      }
      if (!serviceId) throw new Error('PrivateLink Service ID 를 상세에서 읽지 못했습니다');
      log(`  Service ID: ${serviceId}`);
      await gotoRoute(page, ROUTES.pls);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] PrivateLink Endpoint ${vars.ple} 생성 (연결 요청)`, async () => {
      await openCreateForm(page, ROUTES.ple, 'PrivateLink Endpoint 생성');
      await fillField(page, 'PrivateLink Endpoint명', vars.ple!);
      await pickLate(page, 'VPC명', new RegExp(escapeRe(vars.vpc!)), log);
      await pickLate(page, 'Subnet명', new RegExp(escapeRe(vars.subnet!)), log);
      await fillField(page, 'PrivateLink Endpoint IP', vars.ple_ip!);
      await page.getByRole('button', { name: '기타 PrivateLink 서비스', exact: true }).first().click();
      await fillField(page, 'PrivateLink Service ID', serviceId);
      await submitForm(page, '생성');
      await confirmUntil(page, /PrivateLink Endpoint를 생성하시겠습니까/, log);
      await waitForRow(page, ROUTES.ple, vars.ple!, { status: /Requesting|Active/, timeoutMs: 300_000, intervalMs: 10_000, log });
      log(`  Endpoint 행: ${(await row(page, vars.ple!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step('steps[4] 연결 요청 승인 → Endpoint Active', async () => {
      const tab = await openDetailTab(page, ROUTES.pls, vars.pls!, /^연결 관리/);
      await waitForRow(page, tab, 'Requesting', { timeoutMs: 180_000, intervalMs: 10_000, log });
      await row(page, 'Requesting').first().getByRole('button', { name: '승인', exact: true }).click();
      await confirmModal(page, /연결 요청을 승인하시겠습니까/);
      await waitForRow(page, ROUTES.ple, vars.ple!, { status: /Active/, timeoutMs: 600_000, intervalMs: 15_000, log });
      log(`  Endpoint 행: ${(await row(page, vars.ple!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] PrivateLink Endpoint ${vars.ple} 삭제`, async () => {
      await deleteFromList(page, ROUTES.ple, vars.ple!, /PrivateLink Endpoint를 삭제하시겠습니까/);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
    await test.step(`steps[6] PrivateLink Service ${vars.pls} 삭제`, async () => {
      await deleteFromList(page, ROUTES.pls, vars.pls!, /PrivateLink Service를 삭제하시겠습니까/);
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
    });
  });
});
