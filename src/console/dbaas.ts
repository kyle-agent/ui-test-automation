/**
 * DBaaS(PostgreSQL·MySQL·MariaDB·…) "네트워크 → 단일 서버 생성 → 상세 해지 → 네트워크" 스택 spec 팩토리.
 * 공유 네트워크(SHARED_VPC/SHARED_SUBNET)가 오면 채택하고, 아니면 자기 VPC/Subnet 을 만든다(src/console/shared.ts).
 * 폼 차이는 config 로 흡수한다: 이름 라벨, 추가 입력, 끌 체크박스, 상태 정규식. 비밀번호는 run_id 로 실행 중 만들고 기록하지 않는다.
 */
import type { Page } from '@playwright/test';
import { test } from '../fixtures/test';
import { expectStep, gotoRoute } from './expect';
import { detailValue, logDetail, logModal, openDetail, openLabelEdit, saveModal, waitDetailValue } from './detail-edit';
import { settleConsole } from './overlays';
import { ROUTES } from './inventory';
import { deleteNetwork, ensureNetwork, type SharedNetwork } from './shared';
import {
  confirmModal,
  dismissModalIfAny,
  fillStable,
  fillField,
  isChecked,
  openCreateForm,
  pickOption,
  row,
  submitForm,
  topButton,
  visibleModal,
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
  /**
   * 읽기 복제본(Replica) 단계를 켠다 (API {engine}createreplica). 시나리오에 steps[3](추가 → Running), steps[4](삭제) 와 var `replica` 가 있어야 한다.
   * 켜면 생성 폼의 "백업" 을 끄지 않는다 — 백업이 꺼진 클러스터에 Replica 를 요청하면 콘솔 API 가 500(ContactAdminForAssistance)을 돌려주고
   * 화면엔 아무 안내 없이 폼에 머문다(2026-09-30 PostgreSQL 실측 2회, 백업을 켠 뒤 같은 요청 202).
   */
  replica?: boolean;
  /** 생성 뒤 상세 "중지" → Stopped → "시작" → Running 단계(L3)를 켠다. 시나리오에 steps[3] 이 있어야 한다 (replica 와 함께 쓰지 않는다) */
  stopStart?: boolean;
  /**
   * 6차(2026-10-07) 상세 공통 동작 단계. 시나리오의 **마지막** step 이 이 단계다(Replica 단계보다 먼저 실행). 순서대로 한다.
   * 모두 바꿈 → 반영 확인 → 되돌림(백업은 켠 채 둔다: Replica 의 전제). 환경 변수 DBAAS_SOFT=1 이면 동작별 실패를 로그만 남기고 계속한다(프로브용).
   */
  ops?: DbaasOp[];
  /** ops 'parameter' 가 바꿀 동적 파라미터 후보 이름(화면에 있는 첫 것)과 후보 값 2개(지금 값이 아닌 쪽으로 바꿨다가 되돌린다; 없으면 정수 +1). 기본 cpu_tuple_cost 0.01/0.02 (PostgreSQL·EPAS) */
  parameter?: { names: string[]; values?: [string, string] };
  tags?: string[];
}

/** restart 재시작 · sync 서비스 상태 동기화 · stopStart 중지→시작 · maintenance 유지 관리 기간 켬→끔 · backup 백업 켬 · audit Audit Log 켬→끔 ·
 *  ipAcl IP 접근 제어 추가→삭제 · parameter Parameter 조회·값 변경→되돌림 · archive Archive 설정 조회·보관기간 변경→되돌림 */
export type DbaasOp = 'restart' | 'sync' | 'stopStart' | 'maintenance' | 'backup' | 'audit' | 'ipAcl' | 'parameter' | 'archive';

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

  /** 목록 행(버튼이 있으면) 또는 상세 상단의 해지 버튼 → 확인 모달("확인을 위해 Database명을 입력" 포함) → 소멸까지. Replica 도 같은 화면·같은 모달이다. */
  async function terminateCluster(page: Page, name: string) {
    // 해지가 Terminating → Failed 로 끝나는 경우가 있다(2026-09-30 프로브: 백업을 상세에서 켜고 Replica 를 지운 뒤의 PostgreSQL Master. spec 실행에선 재현 안 됨, 작업 이력 "Delete Error";
    // API 자동화도 같은 웨지를 기록, 재삭제로 푼다. 프로브에선 곧바로 다시 해지하면 두 번 더 Failed, ≈40분 뒤 네 번째에 소멸) → Failed 면 5분 쉬고 다시 해지(최대 6회).
    const failedOrRunning = new RegExp(`${deletable.source}|Failed`, 'i');
    for (let attempt = 1; ; attempt++) {
      await waitForRow(page, config.route, name, { status: failedOrRunning, timeoutMs: 1_800_000, intervalMs: 30_000, log });
      const inRow = row(page, name).getByRole('button', { name: deleteButton, exact: true });
      if (await inRow.count()) await inRow.click();
      else {
        await row(page, name).getByText(name, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, deleteButton).click();
      }
      await confirmModal(page, /해지|삭제/, '확인', { agree: true, resourceName: name });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      // 소멸 또는 Failed 를 기다린다
      const start = Date.now();
      let failed = false;
      for (;;) {
        await gotoRoute(page, config.route);
        const text = (await row(page, name).first().innerText({ timeout: 5_000 }).catch(() => '')).replace(/\s+/g, ' ');
        if (!text) break;
        if (/Failed/i.test(text) && Date.now() - start > 60_000) {
          failed = true;
          break;
        }
        if (Date.now() - start > 1_800_000) throw new Error(`${name} 해지 대기 1800초 초과. 마지막: ${text}`);
        log(`  [${Math.round((Date.now() - start) / 1000)}s] ${name} 해지 대기… ${text.slice(0, 100)}`);
        await page.waitForTimeout(30_000);
      }
      if (!failed) break;
      log(`  ${name} 해지가 Failed 로 끝남 → 5분 뒤 다시 해지 (${attempt}/6)`);
      if (attempt >= 6) throw new Error(`${name} 해지가 ${attempt}회 모두 Failed`);
      await page.waitForTimeout(300_000);
    }
    await waitForRow(page, config.route, name, { gone: true, timeoutMs: 300_000, intervalMs: 15_000, log });
  }

  /** 상세 상단 "서비스 해지" 왼쪽의 아이콘 버튼(더보기 메뉴: Parameter 관리 · Replica 구성 · …)에서 항목을 고른다 */
  async function pickMoreMenu(page: Page, item: RegExp) {
    const toggles = page.locator('[id^="menu-"] button:visible');
    const n = await toggles.count();
    for (let i = 0; i < n; i++) {
      await toggles.nth(i).click();
      const entry = page.locator('.scp-menu:visible .scp-menu-item').filter({ hasText: item });
      if (
        await entry
          .first()
          .waitFor({ timeout: 3_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await entry.first().click();
        return;
      }
      await page.keyboard.press('Escape').catch(() => undefined);
    }
    throw new Error(`상세 더보기 메뉴에 ${item} 항목이 없습니다 (메뉴 버튼 ${n}개)`);
  }

  // ── 6차 상세 동작 (2026-10-07 에이전트 6A, PostgreSQL 프로브 기준) ──
  // 상세(#/<engine>/<engine>/detail/info?clusterId=…) 상단 버튼: 시작 · 중지 · 재시작 · 서비스 상태 동기화 · 백업 이력 · Database 복구 · [더보기] · 서비스 해지 · Disk 추가.
  // 연필 라벨: Image 버전 · 유지 관리 기간 · 백업 · Audit Log 설정 · ServiceWatch 로그 수집 · IP 접근 제어.
  // 더보기 화면(Parameter 관리·DB 사용자 관리·DB 접근 제어 설정·Archive 설정 관리·Block Storage 사용량 관리)은 별도 주소이고
  // 모두 하단 "조회"(DB 서버와 동기화)를 먼저 해야 "수정"·"추가" 가 켜진다.

  async function waitRunning(page: Page) {
    await waitForRow(page, config.route, vars.name!, { status: running, timeoutMs: 1_800_000, intervalMs: 20_000, log });
  }

  /** 동작 요청 뒤 상태가 바뀌기 시작할 틈을 주고 Running 으로 돌아올 때까지 */
  async function settleRunning(page: Page) {
    await page.waitForTimeout(20_000);
    await waitRunning(page);
    log(`    행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 120)}`);
  }

  /** 보이는 버튼 중 innerText 가 정확히 같은 것 (topButton 이 상세 버튼을 못 잡는 경우가 있다, 2026-10-06) */
  async function clickExact(page: Page, text: string, timeoutMs = 15_000) {
    const buttons = page.locator('button:visible');
    const texts = (await buttons.allInnerTexts()).map((t) => t.trim());
    const idx = texts.lastIndexOf(text);
    if (idx < 0) throw new Error(`"${text}" 버튼이 없습니다: ${JSON.stringify(texts.filter(Boolean).slice(0, 30))}`);
    // 비활성 버튼이 켜질 때까지 기다리는 동안 목록이 다시 그려져도 같은 버튼을 잡도록 텍스트로 다시 찾는다
    const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await page
      .locator('button:visible')
      .filter({ hasText: new RegExp(`^\\s*${esc}\\s*$`) })
      .last()
      .click({ timeout: timeoutMs });
  }

  /** 확인 모달("…하시겠습니까?")이 뜨면 문구를 남기고 확인(동의·이름 입력 포함), 이어지는 안내 모달도 닫는다 */
  async function confirmIfAny(page: Page, what: string) {
    const modal = visibleModal(page);
    if (!(await modal.waitFor({ timeout: 8_000 }).then(() => true, () => false))) return;
    log(`    ${what} 모달: ${((await modal.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 200)}`);
    await confirmModal(page, undefined, '확인', { agree: true, resourceName: vars.name });
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  }

  /** 상세 상단 버튼(재시작 · 서비스 상태 동기화) → 확인 → Running */
  async function detailAction(page: Page, button: string) {
    await openDetail(page, config.route, vars.name!);
    await clickExact(page, button);
    await confirmIfAny(page, button);
    await settleRunning(page);
  }

  /** 연필 → 모달의 "사용" 체크를 on/off → 저장 → 상세 값이 미사용/사용으로 → Running */
  async function toggleLabel(page: Page, label: string, on: boolean) {
    await openDetail(page, config.route, vars.name!);
    const modal = await openLabelEdit(page, label);
    await page.waitForTimeout(1_000);
    await logModal(page, log, `${label} 수정(${on ? '켬' : '끔'}) 전`);
    const box = modal.locator('.scp-select:visible').first();
    if ((await isChecked(box)) !== on) await box.click();
    await page.waitForTimeout(1_000);
    await logModal(page, log, `${label} 수정(${on ? '켬' : '끔'}) 후`);
    await saveModal(page, log);
    await waitDetailValue(page, label, (v) => (on ? v !== '' && !/^미사용/.test(v) : /^미사용/.test(v)), { log, timeoutMs: 900_000 });
    await settleRunning(page);
  }

  /** 더보기 메뉴 화면을 열고 하단 "조회"(DB 서버 정보 동기화)를 누른다 */
  async function openMenuPage(page: Page, item: RegExp) {
    // 직전 동작(Parameter 저장 등) 뒤엔 행이 Running 이어도 상세 버튼이 잠시 모두 비활성이었다(2026-10-07) → 메뉴 화면이 안 열리면 30초 쉬고 다시(최대 6회)
    for (let attempt = 1; ; attempt++) {
      try {
        await openDetail(page, config.route, vars.name!);
        await pickMoreMenu(page, item);
        await settleConsole(page, { appearGraceMs: 1_500 });
        // 앞서 연 메뉴 화면이 DOM 에 숨은 채 남아 getByRole(…).last() 는 숨은 "조회" 를 잡았다(2026-10-07 두 번째 Parameter 화면) → 보이는 것만
        await page.locator('button:visible').filter({ hasText: /^\s*조회\s*$/ }).first().waitFor({ timeout: 30_000 });
        break;
      } catch (err) {
        if (attempt >= 6) throw err;
        log(`    메뉴 화면 ${item} 열기 재시도 ${attempt}/6: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(30_000);
      }
    }
    await clickExact(page, '조회');
    await confirmIfAny(page, '조회');
    await settleConsole(page, { appearGraceMs: 1_500 });
    await page.waitForTimeout(3_000);
    // "수정" 이 있는 화면(Parameter·Archive)은 조회가 끝나야 켜진다 → 켜질 때까지(최대 10분) 기다린 뒤 값을 읽는다
    const edit = page.locator('button:visible').filter({ hasText: /^\s*수정\s*$/ }).last();
    for (const start = Date.now(); (await edit.count()) && (await edit.isDisabled().catch(() => false)); ) {
      if (Date.now() - start > 600_000) throw new Error('조회 뒤 10분이 지나도 "수정" 이 켜지지 않습니다');
      await page.waitForTimeout(5_000);
    }
  }

  /** 바꿀 동적 파라미터(재시작 불필요). 후보 이름 중 화면에 있는 첫 것 (PostgreSQL·EPAS: cpu_tuple_cost, 기본 0.01) */
  let PARAM = config.parameter?.names[0] ?? 'cpu_tuple_cost';

  /** Parameter 표에서 이름이 정확히 같은 행. 첫 페이지에 없으면 "Parameter명을 입력하세요." 검색칸으로 거른다 */
  async function paramRow(page: Page, name: string) {
    const exact = () => page.locator('tr.scp-body-row:visible').filter({ has: page.getByText(name, { exact: true }) }).first();
    if (await exact().count()) return exact();
    const search = page.getByPlaceholder(/Parameter명을 입력/).first();
    if (await search.count()) {
      await search.fill(name);
      await search.press('Enter');
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForTimeout(1_000);
    }
    return exact();
  }

  async function setParameter(page: Page, value: string) {
    await openMenuPage(page, /^\s*Parameter 관리\s*$/);
    // "수정" 은 "조회"(DB 서버에서 읽기, 몇 분)가 끝나야 켜진다(2026-10-07 두 번째 실행에서 15초 초과) → 최대 10분 기다린다
    await clickExact(page, '수정', 600_000);
    await settleConsole(page, { appearGraceMs: 800 });
    await page.waitForTimeout(1_500);
    const r = await paramRow(page, PARAM);
    log(`    ${PARAM} 행(수정 모드): ${(await r.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160)}`);
    const input = r.locator('input:visible').first();
    if (!(await input.count())) {
      log(`    버튼: ${JSON.stringify((await page.locator('button:visible').allInnerTexts()).map((t) => t.trim()).filter(Boolean))}`);
      throw new Error(`${PARAM} 행에 입력칸이 없습니다`);
    }
    await fillStable(page, input, value, `${PARAM} 사용자 정의값`);
    log(`    버튼(입력 후): ${JSON.stringify((await page.locator('button:visible').allInnerTexts()).map((t) => t.trim()).filter(Boolean))}`);
    const save = page.locator('button:visible:not(tr button)').filter({ hasText: /^\s*(저장|완료|적용)\s*$/ }).last();
    await save.click();
    await confirmIfAny(page, 'Parameter 저장');
    await settleRunning(page);
    // 반영 확인: 다시 조회 → 현재 설정값
    await openMenuPage(page, /^\s*Parameter 관리\s*$/);
    const text = (await (await paramRow(page, PARAM)).innerText()).replace(/\s+/g, ' ');
    log(`    ${PARAM} 행(조회): ${text.slice(0, 160)}`);
    if (!text.includes(value)) throw new Error(`${PARAM} 가 ${value} 로 바뀌지 않았습니다: ${text.slice(0, 120)}`);
  }

  /** Archive 설정 관리 → 조회 → 수정(별도 화면 …/archive-config/edit: "Archive Log 보관기간") → 저장 → 확인 → 다시 조회해 반영 확인 */
  async function setArchiveDays(page: Page, days: string) {
    await openMenuPage(page, /^\s*Archive 설정 관리\s*$/);
    // "수정" 은 "조회"(DB 서버에서 읽기, 몇 분)가 끝나야 켜진다(2026-10-07 두 번째 실행에서 15초 초과) → 최대 10분 기다린다
    await clickExact(page, '수정', 600_000);
    await page.waitForURL(/archive-config\/edit/, { timeout: 30_000 });
    await settleConsole(page, { appearGraceMs: 1_000 });
    await page.waitForTimeout(1_500);
    const field = page
      .locator('.scp-form-group-label:visible')
      .filter({ hasText: /Archive Log 보관기간/ })
      .first()
      .locator('xpath=following-sibling::*[1]');
    const input = field.locator('input:visible').first();
    if (await input.count()) await fillStable(page, input, days, 'Archive Log 보관기간');
    else {
      await field.locator('.scp-dropdown').first().click();
      await page
        .locator('.scp-menu:visible .scp-menu-item')
        .filter({ hasText: new RegExp(`^\\s*${days}\\s*(일)?\\s*$`) })
        .first()
        .click();
    }
    await page.waitForTimeout(800);
    log(`    Archive 수정 화면: ${(await field.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 80)} · input ${await input.count()}`);
    await submitForm(page, '저장');
    await confirmIfAny(page, 'Archive 저장');
    await settleRunning(page);
    await openMenuPage(page, /^\s*Archive 설정 관리\s*$/);
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const m = body.match(/보관기간\s*(\d+)\s*일\)/);
    log(`    Archive 화면: ${m?.[0] ?? body.slice(0, 200)}`);
    if (m?.[1] !== days) throw new Error(`Archive 보관기간이 ${days}일로 바뀌지 않았습니다 (${m?.[1] ?? '?'})`);
  }

  const ACL_IP = '10.250.250.0/24';

  async function ipAcl(page: Page, add: boolean) {
    await openDetail(page, config.route, vars.name!);
    const modal = await openLabelEdit(page, 'IP 접근 제어');
    await page.waitForTimeout(1_000);
    await logModal(page, log, `IP 접근 제어 ${add ? '추가' : '삭제'} 전`);
    if (add) {
      const input = modal.locator('input[type=text]:visible').first();
      await fillStable(page, input, ACL_IP, 'IP 접근 제어 CIDR');
      const addBtn = modal.getByRole('button', { name: /^\s*추가\s*$/ }).first();
      if (await addBtn.count()) await addBtn.click();
    } else {
      const r = modal.locator('tr:visible, li:visible, .scp-tag:visible, [class*=chip]:visible').filter({ hasText: ACL_IP }).first();
      await r.locator('button, i').last().click();
    }
    await page.waitForTimeout(800);
    await logModal(page, log, `IP 접근 제어 ${add ? '추가' : '삭제'} 후`);
    await saveModal(page, log);
    const ip = ACL_IP.split('/')[0]!;
    await waitDetailValue(page, 'IP 접근 제어', (v) => (add ? v.includes(ip) : !v.includes(ip)), { log, timeoutMs: 900_000 });
    await settleRunning(page);
  }

  async function stopStartOp(page: Page) {
    for (const [button, want] of [
      ['중지', /Stopped/i],
      ['시작', running],
    ] as const) {
      await openDetail(page, config.route, vars.name!);
      await clickExact(page, button);
      await confirmModal(page, new RegExp(button), '확인', { agree: true, resourceName: vars.name });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.waitForTimeout(15_000);
      await waitForRow(page, config.route, vars.name!, { status: want, timeoutMs: 1_800_000, intervalMs: 20_000, log });
    }
  }

  async function runOp(page: Page, op: DbaasOp) {
    switch (op) {
      case 'restart':
        return detailAction(page, '재시작');
      case 'sync':
        return detailAction(page, '서비스 상태 동기화');
      case 'stopStart':
        return stopStartOp(page);
      case 'maintenance': {
        // 지금 상태의 반대로 바꿨다가 되돌린다 (CacheStore 는 생성 폼에서 끄지 않아 켜져 있을 수 있다)
        await openDetail(page, config.route, vars.name!);
        const on = !/^미사용/.test(await detailValue(page, '유지 관리 기간'));
        await toggleLabel(page, '유지 관리 기간', !on);
        return toggleLabel(page, '유지 관리 기간', on);
      }
      case 'backup':
        return toggleLabel(page, '백업', true);
      case 'audit':
        await toggleLabel(page, 'Audit Log 설정', true);
        return toggleLabel(page, 'Audit Log 설정', false);
      case 'ipAcl':
        await ipAcl(page, true);
        return ipAcl(page, false);
      case 'parameter': {
        // 지금 값(조회 후 "현재 설정값" 열)을 읽어 다른 후보 값으로 바꾼 뒤 원래 값으로 되돌린다
        await openMenuPage(page, /^\s*Parameter 관리\s*$/);
        for (const name of config.parameter?.names ?? [PARAM]) {
          PARAM = name;
          if (await (await paramRow(page, name)).count()) break;
          log(`    파라미터 ${name} 없음`);
        }
        const current = ((await (await paramRow(page, PARAM)).locator('td').nth(2).innerText().catch(() => '')) || '').trim();
        const values = config.parameter?.values;
        // 후보 값이 없으면 정수 현재값 + 1
        const target = values ? (values.find((v) => v !== current) ?? values[0]) : /^\d+$/.test(current) ? String(Number(current) + 1) : '0.02';
        log(`    ${PARAM} 현재 ${current} → ${target} → ${current}`);
        if (!current || current === '-') throw new Error(`${PARAM} 현재 설정값을 읽지 못했습니다`);
        await setParameter(page, target);
        return setParameter(page, current);
      }
      case 'archive':
        await setArchiveDays(page, '4');
        return setArchiveDays(page, '3');
    }
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
        // steps[4] 전에 실패하면 Replica 가 남는다 → Master 보다 먼저 해지 (Replica 가 있으면 Master 해지가 막힌다)
        if (config.replica)
          await attempt('Replica 해지', async () => {
            await gotoRoute(page, config.route);
            if ((await row(page, vars.replica!).count()) === 0) return;
            await test.step(`teardown Replica ${vars.replica} 해지`, async () => {
              await terminateCluster(page, vars.replica!);
            });
          });
        await attempt('DB 해지', async () => {
          await gotoRoute(page, config.route);
          if ((await row(page, vars.name!).count()) === 0) return;
          await test.step(`teardown[0] ${vars.name} 해지`, async () => {
            await terminateCluster(page, vars.name!);
            await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
          });
        });
        await attempt('네트워크 삭제', async () => {
          if (net?.shared) {
            log('  공유 네트워크는 런처가 지운다');
            return;
          }
          await test.step('teardown[1] Subnet · VPC 삭제', async () => {
            // 클러스터가 목록에서 사라진 직후엔 Subnet 삭제가 아직 막혀 있을 수 있다(2026-10-06 Event Streams: 삭제 클릭 15초 초과,
            // 몇 분 뒤 같은 절차로 바로 지워짐) → 1분 쉬고 최대 3회
            for (let attempt = 1; ; attempt++) {
              try {
                await deleteNetwork(page, vars.vpc!, vars.subnet!, log);
                break;
              } catch (err) {
                if (attempt >= 3) throw err;
                log(`  네트워크 삭제 재시도 ${attempt}/3: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
                await page.keyboard.press('Escape').catch(() => undefined);
                await page.waitForTimeout(60_000);
              }
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
          // 네트워크 절(VPC 목록)이 비동기로 늦게 채워지며 폼 전체가 다시 그려져 먼저 채운 값이 사라진다(병렬 실행 때 두드러짐, 2026-09-28)
          // → VPC/Subnet 을 먼저 고르고(목록이 찰 때까지 pickOption 이 기다린다) 잠시 가라앉힌 뒤 입력란을 채운다.
          await pickOption(page, 'VPC명', new RegExp(n.vpc));
          await page.waitForTimeout(800);
          await pickOption(page, 'Subnet명', new RegExp(n.subnet));
          await settleConsole(page, { appearGraceMs: 800 });
          await page.waitForTimeout(1_500);
          for (const f of config.fields)
            await fillField(page, f.label, fillVars(f.value, vars), { selector: f.selector });
          for (const label of config.uncheck ?? ['이중화 구성']) await uncheck(page, label);
          for (const d of config.dropdowns ?? []) await pickOption(page, d.label, d.option);
          const password = `Qa!${vars.run_id_compact}x9`; // 8~30자, 영문·숫자·특수문자. 기록 금지
          const pw = page.locator('input[type=password]:visible');
          for (let i = 0; i < (config.passwordInputs ?? 2); i++) {
            await pw.nth(i).fill(password);
            await pw.nth(i).press('Tab');
          }
          for (const label of config.uncheck
            ? []
            : ['백업', 'Audit Log 설정', 'ServiceWatch 로그 수집', '유지 관리 기간'].filter(
                (l) => !(config.replica && l === '백업'),
              ))
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

        if (config.ops?.length) {
          const opsIdx = scenario.steps.length - 1;
          await test.step(`steps[${opsIdx}] ${vars.name} 상세 동작: ${config.ops.join(' · ')}`, async () => {
            const soft = process.env.DBAAS_SOFT === '1';
            const failedOps: string[] = [];
            for (const op of config.ops!) {
              log(`  ── 동작 ${op}`);
              try {
                await waitRunning(page);
                await runOp(page, op);
                log(`  OP OK ${op}`);
              } catch (err) {
                const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
                log(`  OP FAIL ${op}: ${msg}`);
                await logModal(page, log, `${op} 실패 시 모달`).catch(() => undefined);
                await logDetail(page, log, `${op} 실패 시 화면`).catch(() => undefined);
                if (!soft) throw err;
                failedOps.push(op);
                await page.keyboard.press('Escape').catch(() => undefined);
                for (let i = 0; i < 3; i++) {
                  const cancel = visibleModal(page).getByRole('button', { name: /^(취소|닫기|확인)$/ }).first();
                  if (!(await cancel.count())) break;
                  await cancel.click({ timeout: 5_000 }).catch(() => undefined);
                  await page.waitForTimeout(500);
                }
              }
            }
            await gotoRoute(page, config.route);
            await expectStep(page, resolveExpectation(scenario.steps[opsIdx]!.expect, vars), ctx(opsIdx));
            if (failedOps.length) log(`  (soft) 실패한 동작: ${failedOps.join(', ')}`);
          });
        }
        if (config.stopStart)
          // 상세 상단 "중지" → Stopping → Stopped → "시작" → Running (L3, 2026-10-06 에이전트 3D). 시나리오 steps[3] 필요
          await test.step(`steps[3] ${vars.name} 중지 → Stopped → 시작 → Running (L3)`, async () => {
            for (const [button, want] of [
              ['중지', /Stopped/i],
              ['시작', running],
            ] as const) {
              await waitForRow(page, config.route, vars.name!, { status: button === '중지' ? running : /Stopped/i, timeoutMs: 1_200_000, intervalMs: 30_000, log });
              await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
              await settleConsole(page, { appearGraceMs: 800 });
              if (button === '중지') await logDetail(page, log, `${scenario.service} 상세`);
              // topButton(^중지$ 텍스트 일치)은 이 버튼을 못 잡았다(2026-10-06, 화면 innerText 는 "중지") → 보이는 버튼 중 innerText 가 정확히 같은 것
              const buttons = page.locator('button:visible');
              const texts = (await buttons.allInnerTexts()).map((t) => t.trim());
              const idx = texts.indexOf(button);
              if (idx < 0) throw new Error(`상세에 "${button}" 버튼이 없습니다: ${JSON.stringify(texts.slice(0, 30))}`);
              await buttons.nth(idx).click();
              await confirmModal(page, new RegExp(button), '확인', { agree: true, resourceName: vars.name });
              for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
              await waitForRow(page, config.route, vars.name!, { status: want, timeoutMs: 1_800_000, intervalMs: 30_000, log });
              log(`  ${button} 뒤 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
            }
            await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
          });
        if (!config.replica) return;
        // 콘솔(2026-09-30 PostgreSQL 프로브): Master 상세 더보기 "Replica 구성" → "지금 Replica를 추가하시겠습니까? … 1대 최소 20분" → 확인
        // → 폼(#/<engine>/<engine>/replica?…): Replica 수 1, "Replica 명"(소문자로 시작, 소문자·숫자·- 3~19자, 서버명 prefix·클러스터명이 된다),
        // 서버 타입·DATA 용량·VPC/Subnet 은 Master 값으로 채워짐, 유지 관리 기간 → "완료" → "Replica를 구성하시겠습니까? … 생성 완료까지 취소 불가 … 추가 과금" → 확인.
        // Replica 는 목록에 별도 행(클러스터 유형 Replica Cluster)으로 생기고 Creating → Running(실측 ≈10분). Master 상세엔 "Replica정보 (1)" 탭.
        await test.step(`steps[3] Replica ${vars.replica} 추가 → Running`, async () => {
          await gotoRoute(page, config.route);
          await waitForRow(page, config.route, vars.name!, { status: running, timeoutMs: 1_200_000, intervalMs: 30_000, log });
          await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
          await settleConsole(page, { appearGraceMs: 800 });
          await pickMoreMenu(page, /^\s*Replica 구성\s*$/);
          await confirmModal(page, /Replica를 추가하시겠습니까/);
          await settleConsole(page, { appearGraceMs: 800 });
          await page.getByText('인스턴스 유형').first().waitFor({ timeout: 60_000 });
          await page.waitForTimeout(1_500);
          await fillField(page, 'Replica 명', vars.replica!);
          await uncheck(page, '유지 관리 기간');
          const fee = page.getByRole('button', { name: '요금 확인', exact: true }).first();
          if (await fee.count()) await fee.click();
          await page.waitForTimeout(1_000);
          await submitForm(page, '완료');
          // 실패해도 화면에 안내가 없다(500 이어도 폼에 머묾) → 요청 응답 코드를 직접 본다
          const posted = page.waitForResponse(
            (r) => r.request().method() === 'POST' && /\/clusters\/[^/]+\/replicas$/.test(r.url().split('?')[0]!),
            { timeout: 60_000 },
          );
          await confirmModal(page, /Replica를 구성하시겠습니까/, '확인', { agree: true });
          const res = await posted;
          log(`  Replica 생성 요청 응답 ${res.status()}`);
          if (res.status() >= 400)
            throw new Error(
              `Replica 생성 요청 실패 ${res.status()} (백업이 꺼진 Master 면 500): ${(await res.text().catch(() => '')).slice(0, 120)}`,
            );
          for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
          await waitForRow(page, config.route, vars.replica!, {
            status: running,
            timeoutMs: config.createTimeoutMs ?? 2_400_000,
            intervalMs: 30_000,
            log,
          });
          log(`  Replica 행: ${(await row(page, vars.replica!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
          await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
        });
        await test.step(`steps[4] Replica ${vars.replica} 해지`, async () => {
          // Replica 상세 버튼: 시작·중지·재시작·서비스 상태 동기화·Replica 재구성·Parameter 관리·서비스 해지. 해지 모달은 Master 와 같다(Database명 입력)
          await terminateCluster(page, vars.replica!);
          await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
        });
      });
    },
  );
}
