// 직접 작성 (2026-09-28). 시나리오: scenarios/container/ske-cluster.yaml. 콘솔 사실은 yaml 머리 주석.
// 실측(프로브 3회): "생성" 은 StorageClass 설정의 "NFS 볼륨 — 사용" 체크(기본 켜짐, 볼륨 미선택)를 끄기 전엔 활성화되지 않는다.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { logWriteRequests } from '../../src/console/api-log';
import { detailValue, logDetail, logModal, openLabelEdit, probeEdits, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { ROUTES } from '../../src/console/inventory';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  isChecked,
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
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

/** 노드 풀 목록 행이 조건(예: /2 \/ 2 Running/)을 만족할 때까지 (행 텍스트 "… v1.36.3 1 / 1 Running") */
async function waitPoolRow(page: Page, pools: string, want: RegExp, timeoutMs = 1_200_000): Promise<string> {
  const started = Date.now();
  for (;;) {
    await gotoRoute(page, pools);
    await settleConsole(page, { appearGraceMs: 800 });
    const now = flat(await row(page, vars.nodepool!).first().innerText().catch(() => ''));
    log(`  [${Math.round((Date.now() - started) / 1000)}s] 노드 풀 ${want} 대기… ${now.slice(-60)}`);
    if (want.test(now)) return now;
    if (Date.now() - started > timeoutMs) throw new Error(`노드 풀이 ${timeoutMs / 1000}초 안에 ${want} 가 되지 않았습니다. 마지막: ${now}`);
    await page.waitForTimeout(20_000);
  }
}

/** 노드 풀 상세(#/ske/cluster/detail/nodepool/detail/info) 로 */
async function openPoolDetail(page: Page, pools: string): Promise<void> {
  await gotoRoute(page, pools);
  await settleConsole(page, { appearGraceMs: 800 });
  await row(page, vars.nodepool!).getByText(vars.nodepool!, { exact: true }).first().click();
  await page.waitForURL(/nodepool\/detail/, { timeout: 30_000 }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 1_500 });
}

/**
 * 노드 풀 상세 "레이블"/"테인트" 연필 → 수정 모달. add 가 있으면 "추가" 로 행을 만들고 [키, 값] 입력(테인트 효과는 기본 NoSchedule),
 * 없으면 기존 행을 모두 지운다. 2026-10-07 프로브: 모달 버튼 "추가·취소·확인", 레이블 행 = 입력 2개(키·값), 테인트 행 = 효과 드롭다운 + 입력 2개.
 */
async function editPoolKv(page: Page, label: '레이블' | '테인트', add: { key: string; value: string } | null): Promise<void> {
  const modal = await openLabelEdit(page, label);
  if (add) {
    await modal.getByRole('button', { name: '추가', exact: true }).click();
    await page.waitForTimeout(800);
    const inputs = modal.locator('input[type=text]:visible');
    await fillStable(page, inputs.nth(0), add.key, `${label} 키`);
    await fillStable(page, inputs.nth(1), add.value, `${label} 값`);
  } else {
    // 행마다 오른쪽 삭제 아이콘 i.i-btn-del (2026-10-07 실측; 머리글의 닫기 아이콘은 i.i-del-s). 지우면 "확인" 이 활성화된다
    for (let i = 0; i < 5 && (await modal.locator('input[type=text]:visible').count()); i++) {
      const del = modal.locator('i.i-btn-del:visible').first();
      if (!(await del.count())) throw new Error(`${label} 수정 모달에서 행 삭제 아이콘(i.i-btn-del)을 찾지 못했습니다`);
      await del.click();
      await page.waitForTimeout(600);
    }
  }
  await logModal(page, log, `${label} 수정`);
  await saveModal(page, log);
}

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
        // 노드 풀 단계가 중간에 실패해 노드 풀이 남았으면 먼저 지운다(2026-10-07 노드 수·레이블 단계 추가와 함께)
        await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 1_500 });
        await page.getByText(/^노드 풀 \(\d+\)$/).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        if (await row(page, vars.nodepool!).count()) {
          const pools = '#' + page.url().split('#')[1]!;
          await waitPoolRow(page, pools, /Running|Failed|Error/i, 1_800_000);
          await selectRow(page, vars.nodepool!);
          await page.getByRole('button', { name: '노드 풀 삭제' }).first().click();
          await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.nodepool });
          for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
          await waitForRow(page, pools, vars.nodepool!, { gone: true, timeoutMs: 1_200_000, intervalMs: 30_000, log });
        }
        await gotoRoute(page, SKE);
        await waitForRow(page, SKE, vars.name!, { status: /Active|Running/i, timeoutMs: 1_200_000, intervalMs: 30_000, log });
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
        for (const sg of [vars.sg!, vars.sg2!]) {
          await gotoRoute(page, ROUTES.sg);
          if (!(await row(page, sg).count())) continue;
          await row(page, sg).getByText(sg, { exact: true }).first().click();
          await settleConsole(page, { appearGraceMs: 800 });
          await topButton(page, '서비스 해지').click();
          await confirmModal(page, /해지하시겠습니까/);
          await waitForRow(page, ROUTES.sg, sg, { gone: true, timeoutMs: 120_000, log });
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
    if (process.env.SKE_NODEPOOL !== '0')
    await test.step(`steps[3] 노드 풀 ${vars.nodepool} 추가 → Running → 노드 수·레이블·테인트 → 삭제`, async () => {
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
      // L4 동작(2026-10-07 에이전트 SKE). 노드 풀 상세 버튼: "노드 목록 · 업그레이드 · 노드 수 조정 · 서비스 해지", 연필: 우선 IP 지정 · Keypair · 레이블 · 테인트 · 노드 풀 연결 자원.
      // 노드 수 조정 모달: 자동 확장/축소(미사용) · 노드 수 · 최소 · 최대 · 자동 복구 — 첫 text 입력이 노드 수. 노드 1대 더 시간 과금 → 확인 즉시 1로 되돌린다.
      if (process.env.SKE_SCALE !== '0')
        await test.step('steps[3].a 노드 수 1 → 2 (Running 2/2) → 1', async () => {
          for (const [n, want] of [
            ['2', /\b2 \/ 2 Running/],
            ['1', /\b1 \/ 1 Running/],
          ] as const) {
            await openPoolDetail(page, pools);
            await page.getByRole('button', { name: '노드 수 조정', exact: true }).click();
            const modal = visibleModal(page);
            await modal.waitFor({ timeout: 10_000 });
            await fillStable(page, modal.locator('input[type=text]:visible').first(), n, '노드 수');
            await logModal(page, log, `노드 수 ${n}`);
            await saveModal(page, log);
            log(`  노드 수 ${n}: ${await waitPoolRow(page, pools, want, 1_500_000)}`);
          }
        });
      if (process.env.SKE_LABELS !== '0')
        await test.step('steps[3].b 레이블·테인트 추가 → 상세 반영 → 제거', async () => {
          const label = { key: 'qa-run', value: vars.run_id! };
          const taint = { key: 'qa-taint', value: vars.run_id! };
          for (const [what, kv] of [
            ['레이블', label],
            ['테인트', taint],
          ] as const) {
            await openPoolDetail(page, pools);
            await editPoolKv(page, what, kv);
            await waitDetailValue(page, what, (v) => v.includes(kv.key), { log, timeoutMs: 300_000 });
            await waitPoolRow(page, pools, /\bRunning/, 900_000);
          }
          await openPoolDetail(page, pools);
          await logDetail(page, log, '노드 풀 상세(레이블·테인트 추가 후)');
          for (const what of ['레이블', '테인트'] as const) {
            await openPoolDetail(page, pools);
            await editPoolKv(page, what, null);
            await waitDetailValue(page, what, (v) => !v.includes('qa-'), { log, timeoutMs: 300_000 });
            await waitPoolRow(page, pools, /\bRunning/, 900_000);
          }
        });
      // 2026-10-13 6E (API setnodepoolpreferredips): 노드 풀 상세 "우선 IP 지정" 연필 → 모달에서 Subnet 안 IP 하나 추가 → 확인 → 반영 → 다시 열어 제거.
      // 모달 구조를 모르므로 logModal 로 남기고, 입력칸에 IP 를 넣은 뒤 "추가" 가 있으면 누른다. 실패해도 spec 을 멈추지 않는다(미실시로 기록). SKE_PREFIP=0 이면 생략
      if (process.env.SKE_PREFIP !== '0')
        await test.step('steps[3].c 우선 IP 지정 10.250.0.200 추가 → 반영 → 제거', async () => {
          const ip = '10.250.0.200';
          try {
            await openPoolDetail(page, pools);
            await logWriteRequests(page, log);
            await probeEdits(page, log, '노드 풀');
            const label = /우선 IP/;
            const modal = await openLabelEdit(page, label);
            await logModal(page, log, '우선 IP 지정(열기)');
            const use = modal.locator('.scp-select:visible').first();
            if ((await use.count()) && !((await use.getAttribute('class')) ?? '').includes('scp-select-checked')) await use.click();
            const add = modal.getByRole('button', { name: '추가', exact: true });
            let input = modal.locator('input[type=text]:visible').first();
            if (!(await input.count()) && (await add.count())) {
              await add.first().click();
              await page.waitForTimeout(600);
              input = modal.locator('input[type=text]:visible').first();
            }
            await fillStable(page, input, ip, '우선 IP');
            if ((await add.count()) && !(await modal.locator('tr, .scp-chip, li').filter({ hasText: ip }).count())) await add.first().click().catch(() => undefined);
            await logModal(page, log, '우선 IP 지정(입력 후)');
            await saveModal(page, log);
            await waitDetailValue(page, label, (v) => v.includes(ip), { log, timeoutMs: 300_000 });
            await waitPoolRow(page, pools, /\bRunning/, 900_000);
            // 제거: 행 삭제 아이콘(i.i-btn-del) 이 있으면 지우고, 없으면 "사용" 체크를 끈다
            await openPoolDetail(page, pools);
            const again = await openLabelEdit(page, label);
            const del = again.locator('i.i-btn-del:visible, i.i-del:visible');
            if (await del.count()) await del.first().click();
            else {
              const box = again.locator('.scp-select:visible').first();
              if (((await box.getAttribute('class')) ?? '').includes('scp-select-checked')) await box.click();
            }
            await logModal(page, log, '우선 IP 지정(제거 후)');
            await saveModal(page, log);
            await waitDetailValue(page, label, (v) => !v.includes(ip), { log, timeoutMs: 300_000 });
            await waitPoolRow(page, pools, /\bRunning/, 900_000);
            log(`  우선 IP 지정 ${ip} 추가 → 제거 확인`);
          } catch (err) {
            log(`  (우선 IP 지정) 실패 — 미실시로 기록: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
            await dismissModalIfAny(page, '취소');
            await dismissModalIfAny(page);
          }
        });
      // 1차 실측(2026-09-30): 삭제 확인 뒤 30분간 1 / 1 Running 그대로 — 요청이 조용히 무시된 것으로 보인다(VM·VPC 해지와 같은 증상)
      // → 모달 문구·버튼 상태를 남기고, 10분 안에 상태가 안 바뀌면 최대 3회 다시 누른다.
      for (let attempt = 1; ; attempt++) {
        await gotoRoute(page, pools);
        const now = (await row(page, vars.nodepool!).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
        if (!now) break;
        if (!/Deleting|Terminating|Scaling Down/i.test(now)) {
          await selectRow(page, vars.nodepool!);
          const del = page.getByRole('button', { name: '노드 풀 삭제' }).first();
          log(`  노드 풀 삭제 버튼 aria-disabled=${await del.getAttribute('aria-disabled')}`);
          await del.click();
          const modal = visibleModal(page);
          await modal.waitFor({ timeout: 10_000 });
          log(`  노드 풀 삭제 모달: ${(await modal.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
          await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: vars.nodepool });
          for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        }
        try {
          await waitForRow(page, pools, vars.nodepool!, { gone: true, timeoutMs: 600_000, intervalMs: 30_000, log });
          break;
        } catch (e) {
          if (attempt >= 3) throw e;
          log(`  노드 풀 삭제 재시도 ${attempt}/3 (아직 남아 있음)`);
        }
      }
    });
    // 클러스터 설정 변경(L4, 2026-10-07 에이전트 SKE): 상세 "ServiceWatch 로그 수집" 연필 → 모달 체크 "사용" → 확인. 미사용 → 사용 → 미사용 으로 되돌린다.
    // 로그 그룹은 5GB 까지 무료. Deletion Protection 은 되돌리기 실패 시 정리가 막히므로 쓰지 않는다. SKE_SETTING=0 이면 건너뛴다.
    if (process.env.SKE_SETTING !== '0')
      await test.step('steps[4] 클러스터 ServiceWatch 로그 수집 켬 → 반영 → 끔', async () => {
        for (const on of [true, false]) {
          await waitForRow(page, SKE, vars.name!, { status: /Running/i, timeoutMs: 1_200_000, intervalMs: 20_000, log });
          await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
          await settleConsole(page, { appearGraceMs: 1_500 });
          const modal = await openLabelEdit(page, 'ServiceWatch 로그 수집');
          const box = modal.locator('.scp-select:visible').first();
          if (((await box.getAttribute('class')) ?? '').includes('scp-select-checked') !== on) await box.click();
          await logModal(page, log, `ServiceWatch 로그 수집 ${on ? '켬' : '끔'}`);
          await saveModal(page, log);
          await waitDetailValue(page, 'ServiceWatch 로그 수집', (v) => (on ? /^사용/.test(v) : /미사용/.test(v)), { log, timeoutMs: 600_000 });
        }
        await gotoRoute(page, SKE);
        await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
      });
    /** 클러스터 상세(상세 정보 탭)를 Running 확인 뒤 연다 */
    const openClusterDetail = async () => {
      await waitForRow(page, SKE, vars.name!, { status: /Running/i, timeoutMs: 1_200_000, intervalMs: 20_000, log });
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 1_500 });
    };
    // 2026-10-13 6E (API setclusterpublicaccesscontrol): 상세 "퍼블릭 엔드포인트" 연필 → "사용" 체크 → (경고 "외부 접근이 가능합니다" 확인) → 반영 → 미사용으로 되돌림
    if (process.env.SKE_SETTING !== '0')
      await test.step('steps[5] 클러스터 퍼블릭 엔드포인트 켬 → 반영 → 끔', async () => {
        const label = /^\s*퍼블릭 엔드포인트/;
        await openClusterDetail();
        await logWriteRequests(page, log);
        await logDetail(page, log, '클러스터 상세');
        await probeEdits(page, log, '클러스터');
        for (const on of [true, false]) {
          await openClusterDetail();
          const before = await detailValue(page, label);
          const modal = await openLabelEdit(page, label);
          await logModal(page, log, `퍼블릭 엔드포인트 ${on ? '켬' : '끔'}`);
          const box = modal.locator('.scp-select:visible').first();
          if (((await box.getAttribute('class')) ?? '').includes('scp-select-checked') !== on) await box.click();
          // 켤 때 경고 모달("Kubernetes API 에 대한 외부 접근이 가능합니다…")이 바로 뜬다(2차 실측 10-13). 수정 모달이 DOM 뒤에 남아 .last() 가 수정 모달을 잡으므로
          // 경고는 문구로 찾아 확인을 누르고 사라질 때까지 기다린 뒤, 수정 모달도 제목으로 다시 잡는다.
          await page.waitForTimeout(800);
          const warn = page.locator('.scp-modal:visible').filter({ hasText: /외부 접근이 가능합니다/ }).first();
          if (await warn.isVisible().catch(() => false)) {
            log(`    경고 모달: ${((await warn.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160)}`);
            // 2차 실측(10-13): 경고 모달엔 라벨 없는 동의 체크(.scp-select)가 있어 켜기 전엔 "확인" 이 먹지 않는다
            const agree = warn.locator('.scp-select:visible');
            for (let i = 0; i < (await agree.count()); i++) if (!(await isChecked(agree.nth(i)))) await agree.nth(i).click();
            await page.waitForTimeout(300);
            await warn.getByRole('button', { name: /^(확인|예)$/ }).last().click({ timeout: 5_000 }).catch(() => undefined);
            await warn.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
            await page.waitForTimeout(500);
          }
          const edit = page.locator('.scp-modal:visible').filter({ hasText: /퍼블릭 엔드포인트 수정/ }).first();
          await edit.waitFor({ timeout: 10_000 });
          if (on) {
            // 1차 실측(10-13): "사용" 을 켜면 "접근 허용 IP 범위"(CIDR) 를 1개 이상 넣어야 "확인" 이 통한다(안 넣으면 모달이 안 닫힘) → 문서용 IP 1개를 넣고 "추가"
            log(`    수정 모달(사용 체크 후): ${((await edit.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 300)}`);
            const ipInput = edit.locator('input[type=text]:visible').first();
            await ipInput.waitFor({ timeout: 10_000 });
            await fillStable(page, ipInput, '203.0.113.1/32', '접근 허용 IP 범위');
            const add = edit.getByRole('button', { name: '추가', exact: true });
            if (await add.count()) await add.first().click({ timeout: 5_000 }).catch(() => undefined);
            await page.waitForTimeout(500);
            log(`    수정 모달(IP 추가 후): ${((await edit.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 300)}`);
          }
          await saveModal(page, log, 90_000, { modal: edit });
          await waitDetailValue(page, label, (v) => (on ? !/미사용/.test(v) && v !== before : /미사용/.test(v) || v === '-'), { log, timeoutMs: 900_000 });
          await waitForRow(page, SKE, vars.name!, { status: /Running/i, timeoutMs: 1_200_000, intervalMs: 20_000, log });
        }
        await gotoRoute(page, SKE);
        await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), ctx(5));
      });
    // 2026-10-13 6E (API setclustersecuritygroups): 두 번째 SG 를 만들어 상세 "Security Group" 연필 → 선택 모달에서 체크 → 확인 → 반영 → 다시 열어 체크 해제 → 반영
    if (process.env.SKE_SETTING !== '0')
      await test.step(`steps[6] Security Group ${vars.sg2} 추가 → 반영 → 제거`, async () => {
        await openCreateForm(page, ROUTES.sg, '서비스 생성');
        await fillField(page, 'Security Group명', vars.sg2!);
        await setCheckbox(page, '로그 저장 여부', false);
        await submitForm(page, '생성');
        await confirmModal(page, /진행하시겠습니까/);
        await confirmModal(page, /생성하시겠습니까/);
        await waitForRow(page, ROUTES.sg, vars.sg2!, { timeoutMs: 60_000, log });
        const label = /^\s*Security Group\s*$/;
        /** 수정 모달에서 SG 행의 체크 상태를 want 로 맞춘다. 모달 안에 표가 없고 "선택" 버튼만 있으면 그걸 눌러 선택 모달에서 고른다 */
        const setSg = async (want: boolean) => {
          await openClusterDetail();
          const modal = await openLabelEdit(page, label);
          await logModal(page, log, `Security Group 수정(${want ? '추가' : '제거'})`);
          let table = modal.locator('tr').filter({ hasText: vars.sg2! });
          if (!(await table.count())) {
            // 3차 실측(10-13): 모달은 "Security Group 선택"(검색 input "Security Group 명을 입력하세요" + 표, 처음엔 "데이터가 없습니다") → 이름을 검색해야 행이 나온다
            const search = modal.locator('input[placeholder*="Security Group"]:visible, input:visible').first();
            if (await search.count()) {
              await search.fill(vars.sg2!);
              await search.press('Enter');
              await page.waitForTimeout(1_500);
              table = modal.locator('tr').filter({ hasText: vars.sg2! });
            }
          }
          if (!(await table.count())) {
            const pick = modal.getByRole('button', { name: /^(선택|추가)$/ }).first();
            if (await pick.count()) {
              await pick.click();
              await page.waitForTimeout(800);
              const picker = visibleModal(page);
              const search = picker.locator('input:visible').first();
              if (await search.count()) {
                await search.fill(vars.sg2!);
                await search.press('Enter');
                await page.waitForTimeout(1_000);
              }
              table = picker.locator('tr').filter({ hasText: vars.sg2! });
            }
          }
          if (!(await table.count())) {
            await logModal(page, log, 'Security Group 수정(행 없음)');
            throw new Error(`Security Group 수정 모달에 ${vars.sg2} 행이 없습니다`);
          }
          // 4차 실측(10-13): 행 선택 아이콘의 class 로는 선택 여부를 못 읽는다(제거 때 클릭이 안 나가 "확인" 이 안 닫힘) → 모달의 "n/4 개" 선택 수로 판단·검증
          const countOf = async () => Number(((((await modal.innerText().catch(() => '')) || '').replace(/\s+/g, ' ')).match(/(\d+)\s*\/\s*4\s*개/) ?? [])[1] ?? -1);
          const before = await countOf();
          const target = want ? before + 1 : before - 1;
          const sel = table.first().locator('i.table-select, .scp-select, input[type=checkbox]').first();
          for (let attempt = 1; (await countOf()) !== target; attempt++) {
            if (attempt > 3) throw new Error(`Security Group 선택 수가 ${target}/4 이 되지 않습니다 (지금 ${await countOf()}/4)`);
            await sel.click();
            await page.waitForTimeout(800);
          }
          log(`    Security Group 선택 ${before} → ${await countOf()}/4`);
          // 선택 모달(안쪽)이 열려 있으면 먼저 확인으로 닫고 수정 모달로 돌아온다
          const inner = visibleModal(page);
          if ((await inner.innerText().catch(() => '')) !== (await modal.innerText().catch(() => ''))) {
            await inner.getByRole('button', { name: '확인', exact: true }).click({ timeout: 5_000 }).catch(() => undefined);
            await page.waitForTimeout(600);
          }
          await saveModal(page, log);
          await waitDetailValue(page, label, (v) => v.includes(vars.sg2!) === want, { log, timeoutMs: 900_000 });
          await waitForRow(page, SKE, vars.name!, { status: /Running/i, timeoutMs: 1_200_000, intervalMs: 20_000, log });
        };
        await setSg(true);
        await setSg(false);
        await gotoRoute(page, SKE);
        await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), ctx(6));
      });
  });
});
