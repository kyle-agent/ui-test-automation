/**
 * 선행 리소스가 필요 없는 단순 리소스(Server Group, Object Storage 버킷, Address Group …)의 "생성 → 목록 확인 → 삭제" spec 팩토리.
 * 폼은 라벨 기반 헬퍼(src/console/ui.ts)로 채우고, 확인 모달은 동의 체크·입력 확인까지 자동 처리한다.
 * 삭제는 행 끝 버튼이 있으면 그것을, 없으면 행 선택 → 상단 버튼을 쓴다 (콘솔마다 다르다: docs/service-facts/*.md).
 */
import type { Page } from '@playwright/test';
import { test } from '../fixtures/test';
import { expectStep, gotoRoute } from './expect';
import { settleConsole } from './overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  setCheckbox,
  submitForm,
  topButton,
  waitForRow,
} from './ui';
import { loadScenario, resolveExpectation, scenarioVars, type Scenario } from '../scenario/schema';

export interface SimpleCrudConfig {
  /** scenarios/<…>.yaml. steps[0] = 목록 진입(goto), steps[1] = 생성, teardown[0] = 삭제. vars 에 name 이 있어야 한다 */
  scenario: string;
  route: string;
  /** 목록의 생성 버튼 (예: "서비스 생성", "Server Group 생성") */
  createButton: string;
  /** 폼 채우기: 라벨 → 값. 값의 {{name}} 은 vars.name 으로 바뀐다 */
  fields?: { label: string; value: string; selector?: string }[];
  dropdowns?: { label: string; option: string | RegExp }[];
  checkboxes?: { label: string; checked: boolean }[];
  /** 생성 확인 모달 문구 (기본 /생성|신청|예약/) */
  confirmText?: RegExp;
  /** 생성 후 목록에서 기다릴 상태 (없으면 등장만) */
  createdStatus?: RegExp;
  /** 삭제 버튼 문구 (기본 "삭제"; 해지형 서비스는 "서비스 해지") */
  deleteButton?: string;
  deleteConfirmText?: RegExp;
  /** 'detail' 이면 목록에 삭제 버튼이 없어 이름 링크로 상세에 들어간 뒤 상단 deleteButton 을 누른다 (예: Private DNS). 기본 'list' */
  deleteFrom?: 'list' | 'detail';
  /** 삭제 전에 행이 이 상태여야 한다 (예: Private DNS 는 Creating 동안 해지 버튼이 비활성) */
  deletableStatus?: RegExp;
  tags?: string[];
  /** 폼을 채운 뒤 '생성' 을 누르기 전 추가 동작 (예: key/value 태그 입력 후 '태그 추가') */
  beforeSubmit?: (page: Page, vars: Record<string, string>) => Promise<void>;
  /** 생성 후 삭제 전 추가 검증·동작 (예: 상세 화면 확인) */
  afterCreate?: (page: Page, vars: Record<string, string>) => Promise<void>;
  /** 환경 전제가 안 갖춰져 실행할 수 없을 때(예: Object Storage 는 인증키 필요) 사유와 함께 건너뛴다 */
  skipReason?: string;
}

const fill = (s: string, vars: Record<string, string>) =>
  s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');

export function defineSimpleCrudSpec(config: SimpleCrudConfig): void {
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
  const deleteButton = config.deleteButton ?? '삭제';

  test.describe(
    scenario.title,
    { tag: ['@regression', '@destructive', '@crud', ...(config.tags ?? [])] },
    () => {
      test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });
      if (config.skipReason) test.skip(true, config.skipReason);

      test.afterEach('정리', async ({ page }) => {
        test
          .info()
          .annotations.push(
            { type: 'scenario', description: scenario.id },
            { type: 'phase', description: 'teardown' },
          );
        await gotoRoute(page, config.route);
        if ((await row(page, vars.name!).count()) === 0) return;
        await test.step(`teardown[0] ${vars.name} 삭제`, async () => {
          if (config.deletableStatus)
            await waitForRow(page, config.route, vars.name!, {
              status: config.deletableStatus,
              timeoutMs: 300_000,
              intervalMs: 15_000,
              log,
            });
          const r = row(page, vars.name!);
          const inRow = r.getByRole('button', { name: deleteButton, exact: true });
          if (config.deleteFrom === 'detail') {
            await r.getByText(vars.name!, { exact: true }).first().click();
            await settleConsole(page, { appearGraceMs: 800 });
            await topButton(page, deleteButton).click();
          } else if (await inRow.count()) await inRow.click();
          else {
            await selectRow(page, vars.name!);
            await topButton(page, deleteButton).click();
          }
          await confirmModal(page, config.deleteConfirmText ?? /삭제|해지/, '확인', {
            agree: true,
            resourceName: vars.name,
          });
          for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
          await waitForRow(page, config.route, vars.name!, {
            gone: true,
            timeoutMs: 300_000,
            intervalMs: 10_000,
            log,
          });
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
          await gotoRoute(page, config.route);
          await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
        });
        await test.step(`steps[1] ${vars.name} 생성`, async () => {
          await openCreateForm(page, config.route, config.createButton);
          for (const f of config.fields ?? [])
            await fillField(page, f.label, fill(f.value, vars), { selector: f.selector });
          for (const d of config.dropdowns ?? []) await pickOption(page, d.label, d.option);
          for (const c of config.checkboxes ?? []) await setCheckbox(page, c.label, c.checked);
          if (config.beforeSubmit) await config.beforeSubmit(page, vars);
          await submitForm(page, '생성');
          await confirmModal(page, config.confirmText ?? /생성|신청|예약/, '확인', { agree: true });
          for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
          await waitForRow(page, config.route, vars.name!, {
            status: config.createdStatus,
            timeoutMs: 180_000,
            intervalMs: 10_000,
            log,
          });
          if (config.afterCreate) await config.afterCreate(page, vars);
          await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
        });
      });
    },
  );
}
