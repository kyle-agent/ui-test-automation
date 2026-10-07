// 직접 작성 (2026-10-07, 에이전트 SKE). 시나리오: scenarios/container/ske-upgrade.yaml. 주간 실행용(suite-plan weekly).
// container.ske-cluster spec 의 흐름·헬퍼를 복사해 왔다(원본은 그대로). 차이: 클러스터를 최신 바로 아래 버전으로 만들고,
// 노드 풀 1대를 둔 채 클러스터 → 노드 풀 순서로 업그레이드한 뒤 지운다. 업그레이드는 되돌릴 수 없어 1회용 클러스터에서만 한다.
// SKE_HOLD=1: 실패하면 정리를 건너뛴다(업그레이드 화면 프로브용, 끝나면 반드시 손으로 정리).
import { expect, type Locator, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { logDetail, logModal } from '../../src/console/detail-edit';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  dismissModalIfAny,
  dropdown,
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

const scenario = loadScenario('scenarios/container/ske-upgrade.yaml');
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
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
const VER = /v\d+\.\d+\.\d+/;
/** 생성 단계에서 정한 버전 (from: 생성, to: 업그레이드 목표) */
const version = { from: '', to: '' };

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

/** 클러스터 상세(정보 탭)로 */
async function openCluster(page: Page): Promise<void> {
  await gotoRoute(page, SKE);
  await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 1_500 });
}

/** 클러스터 상세의 노드 풀 탭으로 가서 그 주소(#…)를 돌려준다 */
async function openPools(page: Page): Promise<string> {
  await openCluster(page);
  await page.getByText(/^노드 풀 \(\d+\)$/).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  return '#' + page.url().split('#')[1]!;
}

/** 지금 보이는 "업그레이드" 동작: 버튼(행 밖) → 라벨 연필 아이콘(Kubernetes 버전) 순으로 찾는다. 못 찾으면 null */
async function findUpgrade(page: Page): Promise<Locator | null> {
  const btn = page.locator('button:visible:not(header button)').filter({ hasText: /업그레이드/ });
  if (await btn.count()) return btn.first();
  const lbl = page.locator('.scp-form-group-label:visible').filter({ hasText: /버전/ }).filter({ has: page.locator('i.i-edit') });
  if (await lbl.count()) return lbl.first().locator('i.i-edit').first();
  return null;
}

/**
 * 업그레이드 모달(또는 화면)에서 목표 버전/OS 를 고르고 진행한 뒤, 이어지는 확인·완료 모달을 닫는다.
 * choose: 드롭다운 항목을 고르는 정규식(없으면 기본값 유지)
 */
async function runUpgradeDialog(page: Page, what: string, choose: RegExp | null): Promise<void> {
  const modal = visibleModal(page);
  const opened = await modal.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  if (!opened) {
    await settleConsole(page, { appearGraceMs: 1_500 });
    await logDetail(page, log, `${what} 화면(모달 없음)`);
  } else {
    await logModal(page, log, `${what} 모달`);
  }
  const scope: Page | Locator = opened ? modal : page;
  // 화면 모드면 버전·OS 드롭다운만 만진다(리전 선택 등은 그대로)
  const dds = opened ? scope.locator('.scp-dropdown:visible') : scope.locator('.scp-dropdown:visible').filter({ hasText: /v\d+\.\d+|Ubuntu|RHEL|선택하세요/ });
  const ddCount = await dds.count();
  for (let i = 0; i < ddCount; i++) {
    const dd = dds.nth(i);
    const cur = flat(await dd.innerText().catch(() => ''));
    await dd.click();
    const menu = page.locator('.scp-menu:visible').last();
    await menu.waitFor({ timeout: 5_000 }).catch(() => undefined);
    const items = (await menu.locator('.scp-menu-item').allInnerTexts().catch(() => [] as string[])).map(flat);
    log(`    드롭다운 ${i} 현재="${cur}" 항목=${JSON.stringify(items)}`);
    const want = choose ? menu.locator('.scp-menu-item').filter({ hasText: choose }) : null;
    if (want && (await want.count())) {
      await want.first().click();
      log(`    → ${String(choose)} 선택`);
    } else if (!cur || /선택하세요/.test(cur)) {
      // 비어 있으면 첫 항목
      await menu.locator('.scp-menu-item').first().click().catch(() => undefined);
      log('    → 첫 항목 선택(기본값 없음)');
    } else {
      await page.keyboard.press('Escape').catch(() => undefined);
    }
    await menu.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => undefined);
  }
  // 동의 체크박스가 있으면 켠다(모달일 때만)
  const agree = scope.locator('.scp-select:visible:not(.scp-select-checked)');
  for (let i = 0, n = opened ? await agree.count() : 0; i < n; i++) await agree.nth(i).click().catch(() => undefined);
  const go = scope.getByRole('button', { name: /^(업그레이드|확인|저장|완료|적용)$/ }).last();
  log(`    진행 버튼: "${flat(await go.innerText().catch(() => '?'))}" aria-disabled=${await go.getAttribute('aria-disabled').catch(() => '?')}`);
  const title = opened ? ((await modal.innerText().catch(() => '')) || '').trim().split('\n')[0]!.trim() : '';
  await go.click({ timeout: 15_000 }).catch(() => go.click({ force: true }));
  // 이어지는 "…하시겠습니까?" · 완료 안내. 1차 실측(10-07): 확인 뒤 업그레이드 모달 자신이 잠시 남는다 → 그 "확인" 은 다시 누르지 않고 닫히길 기다린다
  for (let i = 0, clicks = 0; i < 40 && clicks < 4; i++) {
    await page.waitForTimeout(1_500);
    const m = visibleModal(page);
    if (!(await m.isVisible().catch(() => false))) break;
    const text = ((await m.innerText().catch(() => '')) || '').trim();
    if (title && text.split('\n')[0]!.trim() === title) continue;
    clicks++;
    log(`    모달: ${flat(text).slice(0, 240)}`);
    const box = m.locator('.scp-select:visible:not(.scp-select-checked)');
    for (let j = 0, n = await box.count(); j < n; j++) await box.nth(j).click().catch(() => undefined);
    const input = m.locator('input[type=text]:visible').first();
    if ((await input.count()) && !(await input.inputValue().catch(() => ''))) {
      // "확인을 위해 X 를 입력" — 문구 안의 이름을 넣는다
      await input.fill(flat(await m.innerText()).includes(vars.nodepool!) ? vars.nodepool! : vars.name!);
    }
    await m.getByRole('button', { name: /^(확인|예|업그레이드)$/ }).last().click({ timeout: 10_000 }).catch(() => undefined);
  }
  await settleConsole(page, { appearGraceMs: 1_000 });
}

/**
 * 목록 행이 업그레이드를 시작(상태가 Running 이 아니게 되거나 버전이 목표로)했다가 Running + 목표 버전이 될 때까지 기다린다.
 * API 자동화 _note: 상태가 바뀌기 전에 첫 확인을 하면 너무 일찍 통과할 수 있다 → 시작을 먼저 본다(최대 startMs).
 */
async function waitUpgraded(
  page: Page,
  route: string,
  name: string,
  target: string,
  opts: { timeoutMs: number; startMs?: number },
): Promise<string> {
  const read = async () => {
    await gotoRoute(page, route);
    await settleConsole(page, { appearGraceMs: 800 });
    return flat(await row(page, name).first().innerText().catch(() => ''));
  };
  const started = Date.now();
  let seenStart = false;
  let last = '';
  for (;;) {
    last = await read();
    const running = /Running/i.test(last) && !/Upgrad|Updat|Scaling|Creating|Pending|Deleting/i.test(last);
    const atTarget = last.includes(target);
    if (!running || atTarget) seenStart = true;
    log(`  [${Math.round((Date.now() - started) / 1000)}s] ${name} 업그레이드 대기… ${last.slice(0, 150)}`);
    if (seenStart && running && atTarget) return last;
    if (!seenStart && Date.now() - started > (opts.startMs ?? 300_000))
      throw new Error(`${name} 업그레이드가 ${(opts.startMs ?? 300_000) / 1000}초 안에 시작되지 않았습니다(요청이 무시됨?). 마지막: ${last}`);
    if (Date.now() - started > opts.timeoutMs)
      throw new Error(`${name} 업그레이드가 ${opts.timeoutMs / 1000}초 안에 끝나지 않았습니다. 마지막: ${last}`);
    await page.waitForTimeout(30_000);
  }
}

/** 노드 풀 삭제(행 선택 → "노드 풀 삭제" → 이름 입력 모달). 조용히 무시되는 경우가 있어 10분마다 최대 3회 다시 누른다. */
async function deleteNodepool(page: Page, pools: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    await gotoRoute(page, pools);
    await settleConsole(page, { appearGraceMs: 800 });
    const now = flat(await row(page, vars.nodepool!).first().innerText().catch(() => ''));
    if (!now) return;
    if (!/Deleting|Terminating|Scaling Down/i.test(now)) {
      await selectRow(page, vars.nodepool!);
      await page.getByRole('button', { name: '노드 풀 삭제' }).first().click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.nodepool });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    }
    try {
      await waitForRow(page, pools, vars.nodepool!, { gone: true, timeoutMs: 600_000, intervalMs: 30_000, log });
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
      log(`  노드 풀 삭제 재시도 ${attempt}/3 (아직 남아 있음)`);
    }
  }
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@heavy', '@weekly'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 150 * 60_000 });

  test.afterEach('정리 (역순: 노드 풀 → 클러스터 → SG → Subnet → VPC)', async ({ page }, testInfo) => {
    testInfo.annotations.push(
      { type: 'scenario', description: scenario.id },
      { type: 'phase', description: 'teardown' },
    );
    if (process.env.SKE_HOLD === '1' && testInfo.status !== testInfo.expectedStatus) {
      log(`  SKE_HOLD=1 → 정리 건너뜀. 남은 리소스: ${vars.nodepool} ${vars.name} ${vars.sg} ${vars.subnet} ${vars.vpc}`);
      return;
    }
    const errors: string[] = [];
    const attempt = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
        log(`  정리 실패 ${name}: ${errors[errors.length - 1]}`);
      }
    };
    await attempt('노드 풀·클러스터 해지', async () => {
      await gotoRoute(page, SKE);
      if ((await row(page, vars.name!).count()) === 0) return;
      await test.step(`teardown[0] 노드 풀 → 클러스터 ${vars.name} 해지`, async () => {
        // 생성·업그레이드 중엔 해지가 막힌다 → Running 까지 기다린다
        await waitForRow(page, SKE, vars.name!, { status: /Active|Running/i, timeoutMs: 3_600_000, intervalMs: 30_000, log });
        const pools = await openPools(page);
        if (await row(page, vars.nodepool!).count()) {
          await waitForRow(page, pools, vars.nodepool!, { status: /Running|Active|Failed|Error/i, timeoutMs: 2_400_000, intervalMs: 30_000, log });
          await deleteNodepool(page, pools);
        }
        await gotoRoute(page, SKE);
        await waitForRow(page, SKE, vars.name!, { status: /Active|Running/i, timeoutMs: 1_800_000, intervalMs: 30_000, log });
        await selectRow(page, vars.name!);
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await waitForRow(page, SKE, vars.name!, { gone: true, timeoutMs: 1_800_000, intervalMs: 30_000, log });
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
          await waitForRow(page, ROUTES.subnet, vars.subnet!, { gone: true, timeoutMs: 1_200_000, intervalMs: 20_000, log });
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
      await waitForRow(page, ROUTES.subnet, vars.subnet!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });

      await openCreateForm(page, ROUTES.sg, '서비스 생성');
      await fillField(page, 'Security Group명', vars.sg!);
      await setCheckbox(page, '로그 저장 여부', false);
      await submitForm(page, '생성');
      await confirmModal(page, /진행하시겠습니까/);
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.sg, vars.sg!, { timeoutMs: 60_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] 클러스터 ${vars.name} 생성 (최신 바로 아래 버전)`, async () => {
      await openCreateForm(page, SKE, '서비스 생성');
      await page.waitForTimeout(1_500);
      await fillField(page, '클러스터명', vars.name!);
      // 버전 목록(항목마다 "vX.Y.Z YYYY-MM-DD 지원 종료", 같은 항목이 두 번씩 잡힌다) → 중복 제거
      const dd = await dropdown(page, 'Kubernetes 버전');
      await dd.click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 5_000 });
      const items = (await menu.locator('.scp-menu-item').allInnerTexts()).map(flat);
      const versions = [...new Set(items.map((s) => s.match(VER)?.[0]).filter((v): v is string => !!v))];
      log(`  Kubernetes 버전 선택지: ${JSON.stringify([...new Set(items)])}`);
      if (versions.length < 2) throw new Error(`Kubernetes 버전 선택지가 ${versions.length}개뿐이라 업그레이드를 시험할 수 없습니다: ${JSON.stringify(items)}`);
      version.to = versions[0]!;
      version.from = process.env.SKE_FROM_VERSION?.trim() || versions[1]!;
      if (!versions.includes(version.from)) throw new Error(`SKE_FROM_VERSION=${version.from} 이 선택지에 없습니다: ${versions.join(', ')}`);
      log(`  생성 버전 ${version.from} → 업그레이드 목표 ${version.to}`);
      test.info().annotations.push({ type: 'k8s_version', description: `${version.from} → ${version.to}` });
      await menu.locator('.scp-menu-item').filter({ hasText: version.from }).first().click();
      await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
      expect(flat(await dd.innerText())).toContain(version.from);
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
      await waitForRow(page, SKE, vars.name!, { status: /Active|Running/i, timeoutMs: 2_400_000, intervalMs: 30_000, log });
      const line = flat(await row(page, vars.name!).first().innerText());
      log(`  클러스터 행: ${line.slice(0, 160)}`);
      expect(line, '클러스터가 고른 버전으로 만들어져야 합니다').toContain(version.from);
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] 노드 풀 ${vars.nodepool} 추가 → Running`, async () => {
      const pools = await openPools(page);
      await page.getByRole('button', { name: '노드 풀 추가' }).first().click();
      await page.waitForURL(/nodepool/, { timeout: 30_000 }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 2_000 });
      await logDetail(page, log, '노드 풀 폼');
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
      if (!submitted) throw new Error('노드 풀 폼에 생성·추가·완료 버튼이 없습니다');
      await confirmModal(page, /노드 풀을 추가하시겠습니까|추가하시겠습니까/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, pools, vars.nodepool!, { status: /Running|Active/i, timeoutMs: 1_800_000, intervalMs: 30_000, log });
      const line = flat(await row(page, vars.nodepool!).first().innerText());
      log(`  노드 풀 행: ${line.slice(0, 160)}`);
      expect(line, '노드 풀은 클러스터 버전으로 만들어진다').toContain(version.from);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step('steps[4] 클러스터 업그레이드 → 완료 대기', async () => {
      await openCluster(page);
      await logDetail(page, log, '클러스터 상세');
      const action = await findUpgrade(page);
      if (!action) throw new Error('클러스터 상세에서 업그레이드 동작(버튼·버전 연필 아이콘)을 찾지 못했습니다 — 위 [클러스터 상세] 로그 참고');
      log(`  클러스터 업그레이드 동작: "${flat(await action.innerText().catch(() => '(아이콘)'))}"`);
      await action.click();
      await runUpgradeDialog(page, '클러스터 업그레이드', new RegExp(version.to.replace(/\./g, '\\.')));
      const line = await waitUpgraded(page, SKE, vars.name!, version.to, { timeoutMs: 3_600_000 });
      log(`  클러스터 행(업그레이드 후): ${line.slice(0, 160)}`);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
    await test.step(`steps[5] 노드 풀 ${vars.nodepool} 업그레이드 → 완료 대기 → 삭제`, async () => {
      const pools = await openPools(page);
      log(`  노드 풀 행(업그레이드 전): ${flat(await row(page, vars.nodepool!).first().innerText()).slice(0, 160)}`);
      let action: Locator | null = null;
      // 1) 목록에서 행 선택 → 상단 버튼  2) 노드 풀 상세
      await selectRow(page, vars.nodepool!);
      await page.waitForTimeout(800);
      await logDetail(page, log, '노드 풀 목록(행 선택)');
      action = await findUpgrade(page);
      if (!action) {
        await row(page, vars.nodepool!).getByText(vars.nodepool!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 1_500 });
        await logDetail(page, log, '노드 풀 상세');
        action = await findUpgrade(page);
      }
      if (!action) throw new Error('노드 풀 업그레이드 동작을 찾지 못했습니다 — 위 로그 참고');
      log(`  노드 풀 업그레이드 동작: "${flat(await action.innerText().catch(() => '(아이콘)'))}"`);
      await action.click();
      await runUpgradeDialog(page, '노드 풀 업그레이드', new RegExp(version.to.replace(/\./g, '\\.')));
      const line = await waitUpgraded(page, pools, vars.nodepool!, version.to, { timeoutMs: 2_400_000 });
      log(`  노드 풀 행(업그레이드 후): ${line.slice(0, 160)}`);
      await deleteNodepool(page, pools);
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
    });
  });
});
