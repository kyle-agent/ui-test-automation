/**
 * DBaaS(PostgreSQL·MySQL·MariaDB·…) "네트워크 → 단일 서버 생성 → 상세 해지 → 네트워크" 스택 spec 팩토리.
 * 공유 네트워크(SHARED_VPC/SHARED_SUBNET)가 오면 채택하고, 아니면 자기 VPC/Subnet 을 만든다(src/console/shared.ts).
 * 폼 차이는 config 로 흡수한다: 이름 라벨, 추가 입력, 끌 체크박스, 상태 정규식. 비밀번호는 run_id 로 실행 중 만들고 기록하지 않는다.
 */
import type { Page } from '@playwright/test';
import { test } from '../fixtures/test';
import { expectStep, gotoRoute } from './expect';
import { settleConsole } from './overlays';
import { ROUTES } from './inventory';
import { deleteNetwork, ensureNetwork, type SharedNetwork } from './shared';
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
} from './ui';
import { loadScenario, resolveExpectation, scenarioVars, type Scenario } from '../scenario/schema';

export interface DbaasConfig {
  /** scenarios/database/<id>.yaml: steps[0] 목록 진입, steps[1] 네트워크, steps[2] DB 생성; teardown[0] DB 해지, teardown[1] 네트워크. vars: vpc, subnet, name(클러스터명), prefix(서버명) */
  scenario: string;
  /** 목록 라우트 (예: #/mysql/mysql/list) */
  route: string;
  createButton?: string;
  /** 폼이 절 단위로 늦게 그려지므로 이 라벨이 보일 때까지 기다린 뒤 채운다 */
  readyLabel: string;
  /** 라벨 → 값 ({{name}}, {{prefix}}, {{run_id}}, {{run_id_compact}} 치환). 순서대로 채운다 */
  fields: { label: string; value: string; selector?: string }[];
  /** 라벨 → 항목. VPC명/Subnet명은 팩토리가 채운다 */
  dropdowns?: { label: string; option: string | RegExp }[];
  /** 끌 체크박스 라벨 (기본: 이중화 구성, 백업, Audit Log 설정, ServiceWatch 로그 수집, 유지 관리 기간) */
  uncheck?: string[];
  /** 폼 맨 위 이미지 종류 드롭다운에서 고를 항목 (예: Search Engine 의 OpenSearch). 기본은 첫 값 유지 */
  imageOption?: RegExp;
  /** 켤 체크박스 라벨 (예: EPAS 'License' 확인) */
  check?: string[];
  /** 비밀번호 입력란 수 (기본 2: 비밀번호 + 확인) */
  passwordInputs?: number;
  /** 생성 후 기다릴 상태 (기본 /Active|Running|In Service/i) */
  runningStatus?: RegExp;
  /** 해지 전 기다릴 상태 (기본 runningStatus) */
  deletableStatus?: RegExp;
  /** 해지 버튼 (기본 "서비스 해지", 상세 화면) */
  deleteButton?: string;
  /** 생성 대기 한도 (기본 40분) */
  createTimeoutMs?: number;
  tags?: string[];
}

const fillVars = (s: string, vars: Record<string, string>) =>
  s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');

export function defineDbaasSpec(config: DbaasConfig): void {
  const scenario: Scenario = loadScenario(config.scenario);
  const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
  const vars = scenarioVars(scenario);
  const log = (line: string) => console.log(line);
  const ctx = (step: number) => ({
    consoleTitle: CONSOLE_CHECKS,
    scenario: scenario.id,
    step,
    testInfo: test.info(),
  });
  const running = config.runningStatus ?? /Active|Running|In Service/i;
  const deletable = config.deletableStatus ?? running;
  const deleteButton = config.deleteButton ?? '서비스 해지';
  let net: SharedNetwork | null = null;

  async function uncheck(page: Page, label: string) {
    const box = page.locator(`.scp-select:visible:below(:text(${JSON.stringify(label)}))`).first();
    if ((await box.count()) && (await isChecked(box))) await box.click();
  }

  test.describe(
    scenario.title,
    { tag: ['@regression', '@destructive', '@crud', '@stack', '@heavy', '@dbaas', ...(config.tags ?? [])] },
    () => {
      test.describe.configure({ mode: 'serial', timeout: 120 * 60_000 });

      test.afterEach('정리 (역순: DB → 네트워크)', async ({ page }) => {
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
        await attempt('DB 해지', async () => {
          await gotoRoute(page, config.route);
          if ((await row(page, vars.name!).count()) === 0) return;
          await test.step(`teardown[0] ${vars.name} 해지`, async () => {
            await waitForRow(page, config.route, vars.name!, {
              status: deletable,
              timeoutMs: 1_800_000,
              intervalMs: 30_000,
              log,
            });
            const inRow = row(page, vars.name!).getByRole('button', { name: deleteButton, exact: true });
            if (await inRow.count()) await inRow.click();
            else {
              await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
              await settleConsole(page, { appearGraceMs: 800 });
              await topButton(page, deleteButton).click();
            }
            await confirmModal(page, /해지|삭제/, '확인', { agree: true, resourceName: vars.name });
            for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
            await waitForRow(page, config.route, vars.name!, {
              gone: true,
              timeoutMs: 1_800_000,
              intervalMs: 30_000,
              log,
            });
            await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
            await settleConsole(page, { appearGraceMs: 800 });
            await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
          });
        });
        await attempt('네트워크 삭제', async () => {
          if (net?.shared) {
            log('  공유 네트워크는 런처가 지운다');
            return;
          }
          await test.step('teardown[1] Subnet · VPC 삭제', async () => {
            await deleteNetwork(page, vars.vpc!, vars.subnet!, log);
            await gotoRoute(page, ROUTES.vpc);
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
        await test.step('steps[1] 네트워크 (VPC · Subnet)', async () => {
          net = await ensureNetwork(page, { vpc: vars.vpc!, subnet: vars.subnet! }, log);
          if (net.shared) {
            // 시나리오 기대값은 자기 이름 기준이라 공유 채택 땐 화면 진입만 확인한다
            await gotoRoute(page, ROUTES.subnet);
            await expectStep(page, { url: ROUTES.subnet }, ctx(1));
          } else await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
        });
        await test.step(`steps[2] ${vars.name} 생성`, async () => {
          const n = net!;
          await openCreateForm(page, config.route, config.createButton ?? '서비스 생성');
          await page.getByText(config.readyLabel).first().waitFor({ timeout: 60_000 });
          await page.waitForTimeout(1_500);
          if (config.imageOption) {
            // 이미지 종류: 폼 맨 위 첫 드롭다운 (라벨 없음; 헤더의 리전 드롭다운은 뺀다)
            const dd = page
              .locator('.scp-dropdown:visible')
              .filter({ hasNotText: /한국 서부/ })
              .first();
            await dd.click();
            const menu = page.locator('.scp-menu:visible').last();
            await menu.waitFor({ timeout: 5_000 });
            await menu.locator('.scp-menu-item').filter({ hasText: config.imageOption }).first().click();
            await page.waitForTimeout(1_000);
          }
          for (const f of config.fields)
            await fillField(page, f.label, fillVars(f.value, vars), { selector: f.selector });
          for (const label of config.uncheck ?? ['이중화 구성']) await uncheck(page, label);
          await pickOption(page, 'VPC명', new RegExp(n.vpc));
          await page.waitForTimeout(800);
          await pickOption(page, 'Subnet명', new RegExp(n.subnet));
          for (const d of config.dropdowns ?? []) await pickOption(page, d.label, d.option);
          const password = `Qa!${vars.run_id_compact}x9`; // 8~30자, 영문·숫자·특수문자. 기록 금지
          const pw = page.locator('input[type=password]:visible');
          for (let i = 0; i < (config.passwordInputs ?? 2); i++) {
            await pw.nth(i).fill(password);
            await pw.nth(i).press('Tab');
          }
          for (const label of config.uncheck
            ? []
            : ['백업', 'Audit Log 설정', 'ServiceWatch 로그 수집', '유지 관리 기간'])
            await uncheck(page, label);
          for (const label of config.check ?? []) {
            const box = page.locator(`.scp-select:visible:below(:text(${JSON.stringify(label)}))`).first();
            if ((await box.count()) && !(await isChecked(box))) await box.click();
          }
          const fee = page.getByRole('button', { name: '요금 확인', exact: true }).first();
          if (await fee.count()) await fee.click();
          await page.waitForTimeout(1_500);
          await submitForm(page, '생성');
          await confirmModal(page, /생성/, '확인', { agree: true });
          for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
          await waitForRow(page, config.route, vars.name!, {
            status: running,
            timeoutMs: config.createTimeoutMs ?? 2_400_000,
            intervalMs: 30_000,
            log,
          });
          log(
            `  ${scenario.service} 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
          );
          await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
        });
      });
    },
  );
}
