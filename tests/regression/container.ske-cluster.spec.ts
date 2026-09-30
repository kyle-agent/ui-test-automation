// 직접 작성 (2026-09-28). 시나리오: scenarios/container/ske-cluster.yaml. 콘솔 사실은 yaml 머리 주석.
// 실측(프로브 3회): "생성" 은 StorageClass 설정의 "NFS 볼륨 — 사용" 체크(기본 켜짐, 볼륨 미선택)를 끄기 전엔 활성화되지 않는다.
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
  openCreateForm,
  pickOption,
  row,
  selectRow,
  setCheckbox,
  submitForm,
  terminateVpc,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/container/ske-cluster.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});
const SKE = ROUTES.ske;

async function pickSecurityGroup(page: Page, name: string) {
  // "Security Group 정보" 의 "선택" 모달 (두 번째 "선택"; 첫 번째는 추가 Subnet)
  await page
    .locator('button:visible')
    .filter({ hasText: /^선택$/ })
    .last()
    .click();
  const modal = visibleModal(page);
  await modal.waitFor({ timeout: 10_000 });
  const search = modal.locator('input:visible').first();
  if (await search.count()) {
    await search.fill(name);
    await search.press('Enter');
    await page.waitForTimeout(1_000);
  }
  await modal
    .locator('tr')
    .filter({ hasText: name })
    .first()
    .locator('i.table-select, .scp-select, input[type=checkbox]')
    .first()
    .click();
  await modal.getByRole('button', { name: '확인', exact: true }).click();
  await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@heavy'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 120 * 60_000 });

  test.afterEach('정리 (역순: 클러스터 → SG → Subnet → VPC)', async ({ page }) => {
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
    await attempt('클러스터 해지', async () => {
      await gotoRoute(page, SKE);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] 클러스터 ${vars.name} 해지`, async () => {
        // 생성 중(Creating)엔 해지가 막힌다 → Active 까지 기다린다
        await waitForRow(page, SKE, vars.name!, {
          status: /Active|Running/i,
          timeoutMs: 1_800_000,
          intervalMs: 30_000,
          log,
        });
        await selectRow(page, vars.name!);
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, SKE, vars.name!, {
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
    await attempt('SG·Subnet·VPC 삭제', async () => {
      await test.step('teardown[1] SG · Subnet · VPC 삭제', async () => {
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
        await gotoRoute(page, ROUTES.sg);
        if (await row(page, vars.sg!).count()) {
          await row(page, vars.sg!).getByText(vars.sg!, { exact: true }).first().click();
          await settleConsole(page, { appearGraceMs: 800 });
          await topButton(page, '서비스 해지').click();
          await confirmModal(page, /해지하시겠습니까/);
          await waitForRow(page, ROUTES.sg, vars.sg!, { gone: true, timeoutMs: 120_000, log });
        }
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
    await test.step('steps[1] VPC · Subnet · SG 생성', async () => {
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

      await openCreateForm(page, ROUTES.sg, '서비스 생성');
      await fillField(page, 'Security Group명', vars.sg!);
      await setCheckbox(page, '로그 저장 여부', false);
      await submitForm(page, '생성');
      await confirmModal(page, /진행하시겠습니까/);
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.sg, vars.sg!, { timeoutMs: 60_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 클러스터 ${vars.name} 생성`, async () => {
      await openCreateForm(page, SKE, '서비스 생성');
      await page.waitForTimeout(1_500);
      await fillField(page, '클러스터명', vars.name!);
      await pickOption(page, 'VPC명 정보', new RegExp(vars.vpc!));
      await page.waitForTimeout(800);
      await pickOption(page, '기본 Subnet 정보', new RegExp(vars.subnet!));
      await pickSecurityGroup(page, vars.sg!);
      await setCheckbox(page, 'NFS 볼륨', false); // 기본 켜짐 + 볼륨 미선택이면 "생성" 이 비활성
      const fee = page.getByRole('button', { name: '요금 확인', exact: true }).first();
      if (await fee.count()) await fee.click();
      await page.waitForTimeout(1_500);
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, SKE, vars.name!, {
        status: /Active|Running/i,
        timeoutMs: 2_400_000,
        intervalMs: 30_000,
        log,
      });
      log(
        `  클러스터 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    // 노드 풀(L3). API 자동화의 콘솔-미러 조합: kr-west1-b · s1v1m2 · SSD 13 Units(=104GB) · 노드 1 · 자동 확장 끔 · Keypair 필요.
    // 에이전트 C 프로브(2026-09-29): 폼은 별도 화면 #/ske/cluster/detail/nodepool/request, Block Storage 기본 SSD_Provisioned(IOPS 필수) → SSD 로 바꾼다,
    // 확인 모달 "노드 풀을 추가하시겠습니까?" 뒤 "0 / 1 Scaling Up". 노드 1대 시간 과금. SKE_NODEPOOL=0 이면 건너뛴다.
    if (process.env.SKE_NODEPOOL === '0') return;
    await test.step(`steps[3] 노드 풀 ${vars.nodepool} 추가 → Running → 삭제`, async () => {
      const openPools = async () => {
        await gotoRoute(page, SKE);
        await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 1_500 });
        await page.getByText(/^노드 풀 \(\d+\)$/).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        return '#' + page.url().split('#')[1]!;
      };
      const pools = await openPools();
      await page.getByRole('button', { name: '노드 풀 추가' }).first().click();
      await page.waitForURL(/nodepool/, { timeout: 30_000 }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 2_000 });
      // 폼 구조를 로그로 남긴다(라벨 이름이 바뀌거나 빗나갈 때 바로 고치려고)
      const form = await page.locator('.scp-form-group:visible').evaluateAll((els) =>
        els
          .map((g) => {
            const label = (g.querySelector('.scp-form-group-label') as HTMLElement | null)?.innerText.replace(/\s+/g, ' ').trim();
            const dd = [...g.querySelectorAll('.scp-dropdown')].map((d) => (d as HTMLElement).innerText.replace(/\s+/g, ' ').trim());
            const inp = [...g.querySelectorAll('input')]
              .filter((e) => (e as HTMLElement).offsetParent)
              .map((e) => `${(e as HTMLInputElement).type}=${(e as HTMLInputElement).value}`);
            return label ? `${label} :: dd[${dd.join(' | ')}] in[${inp.join(' | ')}]` : '';
          })
          .filter(Boolean),
      );
      log(`  노드 풀 폼:\n    ${form.join('\n    ')}`);
      const soft = async (what: string, fn: () => Promise<unknown>) => {
        try {
          await fn();
        } catch (e) {
          log(`  (노드 풀 폼) ${what} 실패: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
        }
      };
      await fillField(page, '노드 풀명', vars.nodepool!);
      await soft('서버 타입 계열', () => pickOption(page, '서버 타입', 'Standard-1'));
      await soft('서버 타입', () => pickOption(page, '서버 타입', /^s1v1m2\b/, { nth: 1 }));
      await soft('Block Storage SSD', async () => {
        await page.locator('.scp-dropdown:visible').filter({ hasText: /^SSD_Provisioned/ }).first().click();
        await page.locator('.scp-menu-item:visible').filter({ hasText: /^SSD$/ }).first().click();
      });
      await soft('Keypair', () => pickOption(page, 'Keypair', 'qa-shared-keypair'));
      await soft('AZ', async () => {
        for (const label of ['Availability Zone', '가용 영역']) {
          if (await page.getByText(label).first().isVisible().catch(() => false)) return pickOption(page, label, /kr-west1-b/);
        }
        throw new Error('AZ 라벨 없음');
      });
      await soft('노드 수', () => fillField(page, '노드 수', '1'));
      const fee = page.getByRole('button', { name: '요금 확인', exact: true }).first();
      if (await fee.count()) await fee.click().catch(() => undefined);
      await page.waitForTimeout(1_500);
      let submitted = false;
      for (const name of ['생성', '추가', '완료']) {
        if (await page.getByRole('button', { name, exact: true }).last().isVisible().catch(() => false)) {
          await submitForm(page, name);
          submitted = true;
          break;
        }
      }
      if (!submitted) throw new Error("노드 풀 폼에 생성·추가·완료 버튼이 없습니다");
      await confirmModal(page, /노드 풀을 추가하시겠습니까|추가하시겠습니까/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, pools, vars.nodepool!, { status: /Running|Active/i, timeoutMs: 1_800_000, intervalMs: 30_000, log });
      log(`  노드 풀 행: ${(await row(page, vars.nodepool!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
      await selectRow(page, vars.nodepool!);
      await page.getByRole('button', { name: '노드 풀 삭제' }).first().click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.nodepool });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, pools, vars.nodepool!, { gone: true, timeoutMs: 1_800_000, intervalMs: 30_000, log });
    });
  });
});
