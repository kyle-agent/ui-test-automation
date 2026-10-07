// 직접 작성 (2026-09-29). 시나리오: scenarios/compute/cloud-function.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-09-29 L3 동작 추가(에이전트 C): 상세 "트리거 추가" → Cronjob "* * * * *" → 트리거 탭 행 확인 → 로그 탭에서 트리거 뒤 기동 로그(실행) 확인 → 트리거 삭제.
// 2026-10-07 6차(에이전트 6D): Cronjob 트리거 행 "수정"(매분 → 5분마다), steps[2]~[7] 상세 "구성" 탭(일반 구성 제한시간 · 함수 URL · 환경 변수 · 리소스 정책 · PrivateLink Service)과
// "코드" 탭 인라인 편집기 수정. 구성·코드를 바꿀 때마다 재배포(상세 수정 버튼 비활성)가 끝나기를 목록 Ready 로 기다린다.
// PrivateLink Endpoint 추가는 자기 함수의 Service ID 로 요청해도 목록에 나타나지 않아(조용히 무시) 하지 않는다.
import { expect, type Locator, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { test } from '../../src/fixtures/test';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, dismissModalIfAny, fillStable, isChecked, row, topButton, visibleModal, waitForRow } from '../../src/console/ui';
import { detailValue, logDetail, logModal, openDetail, openLabelEdit, saveModal } from '../../src/console/detail-edit';

const ROUTE = '#/scf/cloudfunctions';
const CRON = '* * * * *'; // 매분 — 실행 확인을 1~2분 안에 끝내려고
const TRIGGER = `cronjob|Asia/Seoul|${CRON}`; // 트리거 탭의 "트리거 서비스명" 표기 (실측)
const CRON_EDITED = '*/5 * * * *';
const TRIGGER_EDITED = `cronjob|Asia/Seoul|${CRON_EDITED}`;
const log = (line: string) => console.log(line);

async function openTab(page: Page, name: string | RegExp) {
  await page
    .getByText(name, { exact: typeof name === 'string' })
    .first()
    .click();
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 로그 탭 본문의 "[2026-09-29T09:12:04.316391312Z] …" 줄 */
async function logLines(page: Page): Promise<string[]> {
  const body = await page.locator('body').innerText();
  return [...body.matchAll(/\[(\d{4}-\d\d-\d\dT[\d:.]+Z)\]\s*([^\n]*)/g)].map(
    (m) => `${m[1]} ${m[2]!.replace(/\s+/g, ' ').trim()}`, // 로그 본문은 공백 대신 nbsp 등이 섞여 있다
  );
}

/** 로그 탭을 새로 읽으며 pred 를 만족할 때까지 기다린다 */
async function waitLogs(page: Page, what: string, pred: (lines: string[]) => boolean, timeoutMs = 300_000) {
  const start = Date.now();
  for (;;) {
    const lines = await logLines(page);
    if (pred(lines)) return lines;
    if (Date.now() - start > timeoutMs)
      throw new Error(`${what}: ${timeoutMs / 1000}초 초과. 마지막 로그: ${lines.slice(0, 3).join(' / ')}`);
    log(`  [${Math.round((Date.now() - start) / 1000)}s] ${what} 대기… (로그 ${lines.length}줄)`);
    await page.waitForTimeout(15_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
}
/**
 * 구성·코드를 바꾸면 함수가 다시 배포되는 동안(목록 상태 ≠ Ready) 상세의 "수정" 버튼이 비활성이다(2026-10-07 실측: 일반 구성 수정 직후).
 * 목록에서 Ready 를 기다린 뒤 상세로 돌아온다.
 */
async function waitReady(page: Page, name: string, log: (l: string) => void) {
  await page.waitForTimeout(3_000);
  await waitForRow(page, ROUTE, name, { status: /Ready/, timeoutMs: 900_000, intervalMs: 10_000, log });
  await openDetail(page, ROUTE, name);
}

/** 배포 중 비활성인 버튼이 활성화될 때까지 기다렸다 누른다 */
async function clickEnabled(button: Locator) {
  await expect(button, '버튼 활성(배포 끝)').toBeEnabled({ timeout: 300_000 });
  await button.click();
}

const ENV_NAME = 'QA_RUN';
const CODE_MARK = 'qa-edit';
const POLICY_TEMPLATE = 'API Gateway 허용 목록';

/** 상세 "구성" 탭의 하위 메뉴(일반 구성·함수 URL·환경 변수·Private 연결 구성·권한)를 연다 */
async function openConfig(page: Page, sub: string) {
  await openTab(page, '구성');
  await page.getByText(sub, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 구성 하위 화면 라벨 값이 바뀔 때까지 새로 읽는다 */
async function waitConfigValue(page: Page, sub: string, label: string, ok: (v: string) => boolean, log: (l: string) => void) {
  const start = Date.now();
  for (;;) {
    const v = await detailValue(page, label);
    if (ok(v)) {
      log(`    ${sub} ${label} = ${v}`);
      return;
    }
    if (Date.now() - start > 120_000) throw new Error(`${sub} ${label} 값이 바뀌지 않았습니다. 마지막: ${v}`);
    await page.waitForTimeout(5_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
    await openConfig(page, sub);
  }
}

const STARTED = /running\s+on\s+port/;
const STOPPED = /SIGTERM/;

async function addCronTrigger(page: Page) {
  await page.getByRole('button', { name: '트리거 추가', exact: true }).first().click();
  const modal = visibleModal(page);
  await modal.waitFor({ timeout: 10_000 });
  await modal.locator('.scp-dropdown').first().click();
  const menu = page.locator('.scp-menu:visible').last();
  await menu.waitFor({ timeout: 5_000 });
  await menu.locator('.scp-menu-item').filter({ hasText: 'Cronjob' }).first().click();
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  await fillCronAndSave(page, CRON);
  await confirmModal(page, /트리거를 추가하시겠습니까/);
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 열린 Cronjob 트리거 모달(추가·수정 공통)의 분·시·일·월·요일 5칸을 채우고 "확인" */
async function fillCronAndSave(page: Page, cron: string) {
  const modal = visibleModal(page);
  // 분·시·일·월·요일 입력란 5개(라벨만 있고 placeholder 없음), Timezone 기본 Asia/Seoul
  const inputs = modal.locator('input[type=text]:visible');
  await expect(inputs).toHaveCount(5, { timeout: 5_000 });
  const parts = cron.split(' ');
  const ok = modal.getByRole('button', { name: '확인', exact: true });
  // 프로그램식 fill 이 가끔 반영되지 않아 "확인" 이 비활성으로 남는다(2026-09-29 1차 실행) → 키보드로 치고, 활성화될 때까지 최대 3회
  for (let attempt = 0; attempt < 3; attempt++) {
    for (let i = 0; i < 5; i++) {
      const input = inputs.nth(i);
      await input.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(parts[i]!, { delay: 30 });
      await page.keyboard.press('Tab');
    }
    if (
      await expect(ok)
        .toBeEnabled({ timeout: 3_000 })
        .then(
          () => true,
          () => false,
        )
    )
      break;
    log(
      `  Cronjob 입력 재시도 ${attempt + 1}: 값 ${JSON.stringify(await Promise.all([0, 1, 2, 3, 4].map((i) => inputs.nth(i).inputValue())))}`,
    );
  }
  try {
    await ok.click({ timeout: 10_000 });
  } catch {
    await ok.click({ force: true });
  }
}

defineSimpleCrudSpec({
  scenario: 'scenarios/compute/cloud-function.yaml',
  route: ROUTE,
  createButton: '서비스 생성',
  fields: [{ label: 'Function명', value: '{{name}}' }],
  createdStatus: /Ready/, // 실측 2026-09-29: 약 1분 뒤 Ready
  createTimeoutMs: 600_000,
  afterCreate: async (page, vars) => {
    await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    // 실행 확인 준비: 함수는 생성 직후 한 번 기동("…running on port 8080!")했다가 호출이 없으면 약 80초 뒤 내려간다("Got SIGTERM").
    // 내려간 뒤에 트리거를 달아야 다음 기동 로그를 크론 호출의 결과로 볼 수 있다(실측 2026-09-29: 추가 1분 안에 기동 로그).
    await openTab(page, '로그');
    const before = await waitLogs(page, '생성 직후 인스턴스 종료(SIGTERM)', (l) =>
      l.some((x) => STOPPED.test(x)),
    );
    // 로그 시각은 콘솔 서버 시각(UTC ISO)이라 문자열 비교로 충분하다. 종료 시각 뒤의 기동 = 크론 호출
    const stoppedAt = before
      .map((x) => x.split(' ')[0]!)
      .sort()
      .pop()!;
    log(`  인스턴스 종료 확인: ${stoppedAt} (로그 ${before.length}줄)`);
    await openTab(page, '상세정보');
    await addCronTrigger(page);
    await openTab(page, /^트리거 \(\d+\)$/);
    await expect(page.getByText(/^트리거 \(1\)$/).first(), '트리거 탭 개수 1').toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('tr.scp-body-row').filter({ hasText: TRIGGER }).first(),
      `트리거 "${TRIGGER}" 행`,
    ).toBeVisible({ timeout: 30_000 });

    // 실행 확인: 크론 호출로 인스턴스가 다시 기동하면 기동 로그가 하나 늘어난다
    await openTab(page, '로그');
    const after = await waitLogs(page, '크론 호출 기동 로그', (l) =>
      l.some((x) => STARTED.test(x) && x.split(' ')[0]! > stoppedAt),
    );
    log(`  크론 호출 기동: ${after.find((x) => STARTED.test(x) && x.split(' ')[0]! > stoppedAt)}`);

    // 트리거 수정(6차, API updatecloudfunctioncronjobtrigger): 행 끝 "수정" → 같은 Cronjob 5칸 모달 → 매분 → 5분마다
    await openTab(page, /^트리거 \(\d+\)$/);
    await page
      .locator('tr.scp-body-row')
      .filter({ hasText: TRIGGER })
      .first()
      .getByRole('button', { name: '수정', exact: true })
      .click();
    await visibleModal(page).waitFor({ timeout: 10_000 });
    await fillCronAndSave(page, CRON_EDITED);
    await confirmModal(page, /하시겠습니까/);
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    await settleConsole(page, { appearGraceMs: 800 });
    const edited = page.locator('tr.scp-body-row').filter({ hasText: TRIGGER_EDITED }).first();
    for (let i = 0; i < 6 && !(await edited.isVisible().catch(() => false)); i++) {
      await page.waitForTimeout(5_000);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
      await openTab(page, /^트리거 \(\d+\)$/);
    }
    await expect(edited, `수정한 트리거 "${TRIGGER_EDITED}" 행`).toBeVisible({ timeout: 10_000 });
    log(`  트리거 수정: ${TRIGGER} → ${TRIGGER_EDITED}`);

    // 트리거 삭제: 트리거 탭 행 선택 → 표 위 "삭제" → "트리거를 삭제하시겠습니까?"
    const trow = edited;
    await trow.locator('i.table-select').first().click();
    await topButton(page, '삭제').click();
    await confirmModal(page, /트리거를 삭제하시겠습니까/, '확인', { agree: true });
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    await expect(page.getByText(/^트리거 \(0\)$/).first(), '트리거 삭제 뒤 개수 0').toBeVisible({
      timeout: 30_000,
    });
    await gotoRoute(page, ROUTE);
  },
  actions: [
    // steps[2] 일반 구성: 제한시간 60 → 90초 → 60초 (API updatecloudfunctionconfig)
    async (page, vars, log) => {
      // 구성·코드 수정마다 재배포(Ready 복귀)를 기다려 팩토리 기본 15분으로는 모자란다
      test.setTimeout(45 * 60_000);
      await openDetail(page, ROUTE, vars.name!);
      for (const sec of ['90', '60']) {
        await openConfig(page, '일반 구성');
        await clickEnabled(page.getByRole('button', { name: '수정', exact: true }).last());
        const modal = visibleModal(page);
        await modal.getByText('일반 구성 수정').first().waitFor({ timeout: 10_000 });
        await fillStable(page, modal.locator('input[type=text]:visible').first(), sec, '제한시간');
        await saveModal(page, log);
        await openConfig(page, '일반 구성');
        await waitConfigValue(page, '일반 구성', '제한시간', (v) => v === `${sec}초`, log);
        await waitReady(page, vars.name!, log);
      }
    },
    // steps[3] 함수 URL 활성화 사용 → 미사용 (API updatecloudfunctionurl)
    async (page, vars, log) => {
      for (const on of [true, false]) {
        await openConfig(page, '함수 URL');
        await clickEnabled(page.getByRole('button', { name: '수정', exact: true }).last());
        const modal = visibleModal(page);
        await modal.getByText('함수 URL 수정').first().waitFor({ timeout: 10_000 });
        const box = modal.locator('.scp-select:visible').filter({ hasText: /^\s*사용\s*$/ }).first();
        if ((await isChecked(box)) !== on) await box.click();
        await logModal(page, log, '함수 URL 수정');
        await saveModal(page, log);
        await openConfig(page, '함수 URL');
        await waitConfigValue(page, '함수 URL', '활성화', (v) => (on ? v.startsWith('사용') : v === '미사용'), log);
        await waitReady(page, vars.name!, log);
      }
    },
    // steps[4] 환경 변수 추가 → 삭제 (API updatecloudfunctionvariables)
    async (page, vars, log) => {
      await openConfig(page, '환경 변수');
      let modal = await openLabelEdit(page, '환경 변수');
      const inputs = modal.locator('input[type=text]:visible');
      await fillStable(page, inputs.nth(0), ENV_NAME, '환경 변수 이름');
      await fillStable(page, inputs.nth(1), vars.run_id!, '환경 변수 값');
      await saveModal(page, log);
      await openConfig(page, '환경 변수');
      await expect(row(page, ENV_NAME), `환경 변수 ${ENV_NAME} 행`).toHaveCount(1, { timeout: 60_000 });
      await waitReady(page, vars.name!, log);
      await openConfig(page, '환경 변수');
      modal = await openLabelEdit(page, '환경 변수');
      await logModal(page, log, '환경 변수 수정(삭제 전)');
      // 행마다 값 칸 옆 휴지통 아이콘(버튼). 하나뿐이라 비우는 대신 지운다
      const del = modal.locator('button:visible').filter({ hasText: /^\s*$/ }).first();
      await del.click();
      await saveModal(page, log);
      await openConfig(page, '환경 변수');
      await expect(row(page, ENV_NAME), `환경 변수 ${ENV_NAME} 삭제`).toHaveCount(0, { timeout: 60_000 });
      log(`    환경 변수 ${ENV_NAME} 추가 → 삭제 확인`);
      await waitReady(page, vars.name!, log);
    },
    // steps[5] 코드 수정: 인라인 편집기(Monaco) 끝에 주석 한 줄 → 완료 (API updatecloudfunctioncode)
    async (page, vars, log) => {
      if (!page.url().includes('/scf/cloudfunctions/detail')) await openDetail(page, ROUTE, vars.name!);
      await openTab(page, '코드');
      await clickEnabled(page.getByRole('button', { name: '수정', exact: true }).last());
      await page.waitForURL(/\/code\/edit/, { timeout: 15_000 });
      await settleConsole(page, { appearGraceMs: 800 });
      const editor = page.locator('.monaco-editor').first();
      await editor.waitFor({ timeout: 15_000 });
      await editor.click();
      // 코드 탭 보기 편집기는 보이는 줄만 그리므로(Monaco) 맨 위 첫 줄에 주석을 넣어 확인하기 쉽게 한다
      await page.keyboard.press('Control+Home');
      await page.keyboard.type(`// ${CODE_MARK} ${vars.run_id}`, { delay: 10 });
      await page.keyboard.press('Enter');
      const done = page.getByRole('button', { name: '완료', exact: true });
      await expect(done, '코드를 바꾸면 완료가 활성').toBeEnabled({ timeout: 10_000 });
      await done.click();
      if (await visibleModal(page).waitFor({ timeout: 5_000 }).then(() => true, () => false)) await saveModal(page, log).catch(async () => {
        await confirmModal(page, /하시겠습니까/);
      });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await page.waitForURL(/\/detail\//, { timeout: 60_000 }).catch(() => undefined);
      log(`    코드 수정 뒤 화면: ${page.url().split('#')[1]}`);
      const start = Date.now();
      for (;;) {
        await openTab(page, '코드');
        const code = ((await page.locator('.view-lines').first().innerText().catch(() => '')) || '').replace(/[\s ]+/g, ' ');
        if (code.includes(`${CODE_MARK} ${vars.run_id}`)) break;
        log(`    코드 탭 내용: ${code.slice(0, 160)}`);
        if (Date.now() - start > 180_000) throw new Error('코드 탭에 수정한 주석이 보이지 않습니다');
        await page.waitForTimeout(10_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
      }
      log(`    코드 탭에 "${CODE_MARK} ${vars.run_id}" 확인`);
      await waitReady(page, vars.name!, log);
    },
    // steps[6] 권한 > 리소스 정책 추가 → 삭제 (API setresourcepolicy · deleteresourcepolicy)
    async (page, vars, log) => {
      await openConfig(page, '권한');
      await page.getByRole('button', { name: '추가', exact: true }).last().click();
      const modal = visibleModal(page);
      await modal.getByText('리소스 정책 추가').first().waitFor({ timeout: 10_000 });
      await modal.locator('.scp-dropdown:visible').first().click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 5_000 });
      // 템플릿: 함수 URL (NONE) · 함수 URL (IAM) · API Gateway 허용 목록 · PrivateLink 연결 (2026-10-07 실측)
      await menu.locator('.scp-menu-item').filter({ hasText: POLICY_TEMPLATE }).first().click();
      await menu.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(1_000);
      await logModal(page, log, '리소스 정책 추가');
      await saveModal(page, log);
      await waitReady(page, vars.name!, log);
      // 추가 뒤 "추가" 버튼이 사라지고 정책 JSON 이 보인다. 라벨 연필 → "리소스 정책 수정" 모달(취소 · 삭제 · 확인)
      await openConfig(page, '권한');
      await expect(page.getByText('scf:InvokeFunction').first(), '추가한 리소스 정책 JSON').toBeVisible({ timeout: 30_000 });
      log('    리소스 정책 추가 확인 (scf:InvokeFunction · apigateway 허용)');
      const modal2 = await openLabelEdit(page, '리소스 정책');
      await modal2.getByText('리소스 정책 수정').first().waitFor({ timeout: 10_000 });
      await modal2.getByRole('button', { name: '삭제', exact: true }).click();
      await saveModal(page, log).catch(async () => confirmModal(page, /삭제/));
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitReady(page, vars.name!, log);
      const start = Date.now();
      for (;;) {
        await openConfig(page, '권한');
        if (!(await page.getByText('scf:InvokeFunction').count())) break;
        if (Date.now() - start > 120_000) throw new Error('리소스 정책이 삭제되지 않았습니다');
        await page.waitForTimeout(5_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
      }
      log('    리소스 정책 삭제 확인');
    },
    // steps[7] Private 연결 구성: PrivateLink Service 사용 → 미사용 (API updateprivatelinkservice)
    async (page, vars, log) => {
      for (const on of [true, false]) {
        await openConfig(page, 'Private 연결 구성');
        const modal = await openLabelEdit(page, 'PrivateLink Service');
        const box = modal.locator('.scp-select:visible').filter({ hasText: /^\s*사용\s*$/ }).first();
        if ((await isChecked(box)) !== on) await box.click();
        await logModal(page, log, `PrivateLink Service ${on ? '켜기' : '끄기'}`);
        await saveModal(page, log);
        await waitReady(page, vars.name!, log);
        await openConfig(page, 'Private 연결 구성');
        await waitConfigValue(page, 'Private 연결 구성', 'PrivateLink Service', (v) => (on ? !v.startsWith('미사용') : v.startsWith('미사용')), log);
        if (!on) continue;
        // 켠 직후 상태 Creating · Service ID "생성중" 동안은 연필이 없다(눌러도 안 열림) → Active 까지 기다린다. PrivateLink Service 가 켜져 있으면 Function 해지가 조용히 무시된다(2026-10-07 실측) → 반드시 끈다
        await waitConfigValue(page, 'Private 연결 구성', '상태', (v) => v === 'Active', log);
        const serviceId = await detailValue(page, 'PrivateLink Service ID');
        log(`    PrivateLink Service ID 확인(${serviceId.length}자)`);
      }
    },
  ],
  deleteButton: '서비스 해지',
  tags: ['@light', '@action'],
});
