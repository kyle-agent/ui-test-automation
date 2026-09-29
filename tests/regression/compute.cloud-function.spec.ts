// 직접 작성 (2026-09-29). 시나리오: scenarios/compute/cloud-function.yaml. 공용 팩토리: src/console/simple-crud.ts
// 2026-09-29 L3 동작 추가(에이전트 C): 상세 "트리거 추가" → Cronjob "* * * * *" → 트리거 탭 행 확인 → 로그 탭에서 트리거 뒤 기동 로그(실행) 확인 → 트리거 삭제.
import { expect, type Page } from '@playwright/test';
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, dismissModalIfAny, row, topButton, visibleModal } from '../../src/console/ui';

const ROUTE = '#/scf/cloudfunctions';
const CRON = '* * * * *'; // 매분 — 실행 확인을 1~2분 안에 끝내려고
const TRIGGER = `cronjob|Asia/Seoul|${CRON}`; // 트리거 탭의 "트리거 서비스명" 표기 (실측)
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
  // 분·시·일·월·요일 입력란 5개(라벨만 있고 placeholder 없음), Timezone 기본 Asia/Seoul
  const inputs = modal.locator('input[type=text]:visible');
  await expect(inputs).toHaveCount(5, { timeout: 5_000 });
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  const parts = CRON.split(' ');
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
  await confirmModal(page, /트리거를 추가하시겠습니까/);
  for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
  await settleConsole(page, { appearGraceMs: 800 });
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

    // 트리거 삭제: 트리거 탭 행 선택 → 표 위 "삭제" → "트리거를 삭제하시겠습니까?"
    await openTab(page, /^트리거 \(\d+\)$/);
    const trow = page.locator('tr.scp-body-row').filter({ hasText: TRIGGER }).first();
    await trow.locator('i.table-select').first().click();
    await topButton(page, '삭제').click();
    await confirmModal(page, /트리거를 삭제하시겠습니까/, '확인', { agree: true });
    for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
    await expect(page.getByText(/^트리거 \(0\)$/).first(), '트리거 삭제 뒤 개수 0').toBeVisible({
      timeout: 30_000,
    });
    await gotoRoute(page, ROUTE);
  },
  deleteButton: '서비스 해지',
  tags: ['@light', '@action'],
});
