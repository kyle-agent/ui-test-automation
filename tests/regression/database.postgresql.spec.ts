// 직접 작성 (2026-09-28). 시나리오: scenarios/database/postgresql.yaml. 콘솔 사실은 yaml 머리 주석.
// 비밀번호는 run_id 로 실행 중 만들고 로그·기록 어디에도 남기지 않는다.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  dismissModalIfAny,
  fillField,
  isChecked,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  terminateVpc,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/database/postgresql.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const PG = ROUTES.pg;

/** 라벨 아래 커스텀 체크박스를 끈다 (없으면 무시) */
async function uncheck(page: Page, label: string) {
  const box = page.locator(`.scp-select:visible:below(:text(${JSON.stringify(label)}))`).first();
  if ((await box.count()) && (await isChecked(box))) await box.click();
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@heavy'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 120 * 60_000 });

  test.afterEach('정리 (역순: PostgreSQL → Subnet → VPC)', async ({ page }) => {
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
    await attempt('PostgreSQL 해지', async () => {
      await gotoRoute(page, PG);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] PostgreSQL ${vars.name} 해지`, async () => {
        await waitForRow(page, PG, vars.name!, {
          status: /Active|Running|In Service/i,
          timeoutMs: 1_800_000,
          intervalMs: 30_000,
          log,
        });
        // 목록엔 해지 버튼이 없다 → 상세
        await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, PG, vars.name!, { gone: true, timeoutMs: 1_800_000, intervalMs: 30_000, log });
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
      });
    });
    await attempt('Subnet·VPC 삭제', async () => {
      await test.step('teardown[1] Subnet · VPC 삭제', async () => {
        await gotoRoute(page, ROUTES.subnet);
        if (await row(page, vars.subnet!).count()) {
          await selectRow(page, vars.subnet!);
          await topButton(page, '삭제').click();
          await confirmModal(page, /삭제하시겠습니까/);
          await waitForRow(page, ROUTES.subnet, vars.subnet!, {
            gone: true,
            timeoutMs: 1_200_000,
            intervalMs: 20_000,
            log,
          });
        }
        await terminateVpc(page, ROUTES.vpc, vars.vpc!, log);
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
      await gotoRoute(page, ROUTES.vpc);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step('steps[1] VPC · Subnet 생성', async () => {
      await openCreateForm(page, ROUTES.vpc, '서비스 생성');
      await fillField(page, 'VPC명', vars.vpc!);
      await fillField(page, 'IP 대역', '10.250.0.0/20');
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpc, vars.vpc!, { status: /Active/, timeoutMs: 180_000, log });
      await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet 유형', 'Public');
      await pickOption(page, 'Subnet 구분', /primary/i);
      await fillField(page, 'Subnet명', vars.subnet!);
      await fillField(page, 'IP 대역', '10.250.0.0/24');
      const gateway = await below(page, 'Gateway IP', 'input');
      if (!(await gateway.inputValue())) await fillField(page, 'Gateway IP', '10.250.0.1');
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.subnet, vars.subnet!, {
        status: /Active/,
        timeoutMs: 900_000,
        intervalMs: 15_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] PostgreSQL ${vars.name} 생성`, async () => {
      await openCreateForm(page, PG, '서비스 생성');
      await page.getByText('Database 사용자명').first().waitFor({ timeout: 60_000 }); // 폼이 절 단위로 늦게 그려진다
      await page.waitForTimeout(1_500);
      await fillField(page, '서버명 prefix', vars.prefix!);
      await fillField(page, '클러스터명', vars.name!);
      await uncheck(page, '이중화 구성');
      // Block Storage 'DATA' 용량은 기본 0GB 라 필수 입력 (요약에 '추가(DATA) SSD | 0GB', 생성 비활성 — 2026-09-28 프로브)
      await fillField(page, 'DATA', '16');
      await pickOption(page, 'VPC명', new RegExp(vars.vpc!));
      await page.waitForTimeout(800);
      await pickOption(page, 'Subnet명', new RegExp(vars.subnet!));
      await fillField(page, 'Database명', 'qadb');
      await fillField(page, 'Database 사용자명', 'qauser');
      const password = `Qa!${vars.run_id_compact}x9`; // 8~30자, 영문·숫자·특수문자. 기록 금지
      const pw = page.locator('input[type=password]:visible');
      await pw.nth(0).fill(password);
      await pw.nth(0).press('Tab');
      await pw.nth(1).fill(password);
      await pw.nth(1).press('Tab');
      await fillField(page, 'Database Port번호', '5432');
      for (const label of ['백업', 'Audit Log 설정', 'ServiceWatch 로그 수집', '유지 관리 기간'])
        await uncheck(page, label);
      const fee = page.getByRole('button', { name: '요금 확인', exact: true }).first();
      if (await fee.count()) await fee.click();
      await page.waitForTimeout(1_500);
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, PG, vars.name!, {
        status: /Active|Running|In Service/i,
        timeoutMs: 2_400_000,
        intervalMs: 30_000,
        log,
      });
      log(
        `  PostgreSQL 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
  });
});
