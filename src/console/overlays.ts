/**
 * 콘솔 셸이 화면 위에 얹는 것들을 관측·판정 전에 걷어낸다.
 *
 *  - 로딩 오버레이: 라우트 진입·화면 전환 직후 2~3초 동안 전체 화면 `.loader-overlay`(z-index 9999) 가 뜨고
 *    앱 루트가 `[inert]` 가 된다. 이때 snapshot 은 요소를 0개로 보고 Jev 는 BLOCKED 를 낸다 (2026-09-21 실제 기록에서 확인).
 *  - 공지 모달: 새 탭(sessionStorage 의 isFirstView)으로 홈에 들어가면 `.scp-modal.notice-info-container` 가 전체 화면을 덮는다.
 *    헤더의 닫기 아이콘(`.modal-header-icon`) 또는 "확인" 버튼으로 닫는다. "오늘 하루 보지 않기" 는 건드리지 않는다
 *    (로그인 브라우저의 상태를 바꾸지 않기 위해).
 *
 * 셀렉터는 실제 콘솔 DOM 을 프로브해 얻은 것이다. 픽스처(tests/fixtures/fake-vpc.html?shell=loader,notice)가 같은 구조를 흉내 낸다.
 */
import type { Page } from '@playwright/test';

export const LOADER_SELECTOR = '.loader-overlay';
export const NOTICE_SELECTOR = '.scp-modal.notice-info-container';

/** 문자열 표현식: tsx(esbuild) 가 evaluate 안의 함수에 helper 를 끼워 넣어 브라우저에서 깨지는 것을 피한다. */
const LOADER_VISIBLE = `[...document.querySelectorAll(${JSON.stringify(LOADER_SELECTOR)})].some((e) => e.checkVisibility())`;

/** 로딩 오버레이가 사라질 때까지 기다린다. 시간 안에 사라지면 true.
 *  appearGraceMs: 동작 직후에는 오버레이가 0.3~0.5초 뒤에야 붙는다(실측). 그 시간 동안은 나타나는지 지켜본 뒤 판단한다. */
export async function waitForIdle(
  page: Page,
  timeoutMs = 15_000,
  opts: { appearGraceMs?: number } = {},
): Promise<boolean> {
  const started = Date.now();
  const deadline = started + timeoutMs;
  const grace = started + (opts.appearGraceMs ?? 0);
  let seen = false;
  for (;;) {
    const busy = (await page.evaluate(LOADER_VISIBLE).catch(() => false)) as boolean;
    if (busy) seen = true;
    else if (seen || Date.now() >= grace) return true;
    if (Date.now() >= deadline) return false;
    await page.waitForTimeout(busy ? 150 : 100);
  }
}

/** 보이는 공지 모달을 닫는다. 닫은 개수를 돌려준다 (공지가 여러 개면 연달아 뜰 수 있다). */
export async function dismissNotices(page: Page, opts: { max?: number } = {}): Promise<number> {
  const max = opts.max ?? 3;
  let closed = 0;
  for (let i = 0; i < max; i++) {
    const modal = page.locator(NOTICE_SELECTOR).filter({ visible: true }).first();
    if (!(await modal.isVisible().catch(() => false))) break;
    const close = modal.locator('.modal-header-icon').first();
    const confirm = modal.getByRole('button', { name: '확인', exact: true }).first();
    if (await close.isVisible().catch(() => false))
      await close.click({ timeout: 3_000 }).catch(() => undefined);
    else if (await confirm.isVisible().catch(() => false))
      await confirm.click({ timeout: 3_000 }).catch(() => undefined);
    else break;
    await modal.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => undefined);
    if (await modal.isVisible().catch(() => false)) break; // 닫히지 않으면 같은 것을 반복 클릭하지 않는다
    closed++;
  }
  return closed;
}

/** 로딩이 끝나고 공지가 닫힌 상태를 만든다. 닫은 공지 개수를 돌려준다. */
export async function settleConsole(
  page: Page,
  opts: { timeoutMs?: number; appearGraceMs?: number } = {},
): Promise<number> {
  await waitForIdle(page, opts.timeoutMs, { appearGraceMs: opts.appearGraceMs });
  const closed = await dismissNotices(page);
  if (closed) await waitForIdle(page, opts.timeoutMs);
  return closed;
}
