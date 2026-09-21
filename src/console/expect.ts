/**
 * 결정적 기대값 판정. LLM 없이 코드로만 판정한다. 시나리오 expect(url/title/text/not_text/count)와 1:1.
 */
import { expect, type Page, type TestInfo } from '@playwright/test';
import { hashUrl, isSsoUrl } from './env';
import { allBodyText, countRole, visibleText } from './frames';
import { waitForConsole } from './session';
import { TITLE_PATTERN, knownTitle, recordObservedTitle } from './titles';
import type { Expectation } from '../scenario/schema';

export class SessionExpiredError extends Error {
  constructor(url: string) {
    super(
      `SSO 로그인 페이지로 이동했습니다 (${url}). 저장된 세션이 없거나 만료되었습니다. ` +
        `로컬에서 npm run auth:login 을 실행해 recordings/session-<root|iam>.json 을 갱신하세요.`,
    );
    this.name = 'SessionExpiredError';
  }
}

export function assertNotSso(page: Page): void {
  const url = page.url();
  if (isSsoUrl(url)) throw new SessionExpiredError(url);
}

/** hash 라우트로 직접 진입하고, 화면이 제목을 세팅할 때까지(또는 SSO 로 튕길 때까지) 기다린다.
 *  콘솔 세션이 무효("Session Invalid")여도 SSO 쿠키로 자동 복구되면 원래 라우트로 다시 들어간다. */
export async function gotoRoute(page: Page, route: string, opts: { timeout?: number } = {}): Promise<void> {
  const timeout = opts.timeout ?? 60_000;
  await page.goto(hashUrl(route), { waitUntil: 'domcontentloaded', timeout });
  const state = await waitForConsole(page, timeout);
  if (state === 'expired') throw new SessionExpiredError(page.url());
  if (state === 'recovered' && !page.url().includes(`#${normalizeHash(route)}`)) {
    await page.goto(hashUrl(route), { waitUntil: 'domcontentloaded', timeout });
    if ((await waitForConsole(page, timeout)) === 'expired') throw new SessionExpiredError(page.url());
  }
  assertNotSso(page);
}

function normalizeHash(route: string): string {
  const clean = route.startsWith('#') ? route.slice(1) : route;
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export interface ExpectContext {
  /** 관측 제목 기록용 (스모크에서 라우트별 제목 레지스트리를 쌓는다) */
  route?: string;
  scenario?: string;
  step?: number;
  /** 콘솔 화면이 아닌 페이지(예: SSO 로그인)에서는 false */
  consoleTitle?: boolean;
  testInfo?: TestInfo;
}

export async function expectStep(page: Page, exp: Expectation, ctx: ExpectContext = {}): Promise<void> {
  if (exp.url) {
    const fragment = exp.url;
    await expect(page, `URL 에 "${fragment}" 가 포함되어야 합니다`).toHaveURL((u) =>
      u.href.includes(fragment),
    );
  }
  if (ctx.consoleTitle !== false) {
    assertNotSso(page);
    await expect
      .poll(() => page.title(), {
        message: 'document.title 이 "<화면명> | [<서비스명> |] <리전> | Console" 형식이어야 합니다',
        timeout: 30_000,
      })
      .toMatch(TITLE_PATTERN);
    const title = await page.title();
    if (ctx.route) {
      recordObservedTitle({ route: ctx.route, title, scenario: ctx.scenario, step: ctx.step });
      const known = knownTitle(ctx.route);
      if (known)
        expect(title, `등록된 제목(service-map/titles.json)과 달라졌습니다: ${ctx.route}`).toBe(known);
    }
    ctx.testInfo?.annotations.push({ type: 'title', description: title });
  }
  const timeout = exp.timeout;
  if (exp.title) await expect(page).toHaveTitle(exp.title, { timeout });
  if (exp.title_contains) {
    const part = exp.title_contains;
    await expect
      .poll(() => page.title(), { message: `document.title 에 "${part}" 가 포함되어야 합니다`, timeout })
      .toContain(part);
  }
  for (const t of exp.text ?? []) {
    // 콘솔 화면 내용은 iframe 안에 있을 수 있으므로 모든 프레임을 본다.
    const found = await visibleText(page, t, timeout ?? 15_000);
    expect(found !== null, `"${t}" 텍스트가 보여야 합니다 (모든 프레임 검사)`).toBe(true);
  }
  if (exp.not_text?.length) {
    // 대소문자 구분 부분 일치로 화면 텍스트에 없어야 한다 (오류 배너·권한 안내·삭제된 리소스 이름). 사라질 때까지 기다린다.
    for (const t of exp.not_text) {
      await expect
        .poll(async () => (await allBodyText(page)).includes(t), {
          message: `"${t}" 텍스트가 보이면 안 됩니다`,
          timeout,
        })
        .toBe(false);
    }
  }
  for (const [what, cond] of Object.entries(exp.count ?? {})) {
    const role = what.replace(/^table\s+/, '').trim() as Parameters<Page['getByRole']>[0];
    const n = await countRole(page, role);
    expect(compareCount(n, cond), `${what} 개수 ${n} 이(가) ${cond} 를 만족해야 합니다`).toBe(true);
  }
}

export function compareCount(n: number, cond: string): boolean {
  const m = /^(>=|<=|==|=|>|<)?\s*(\d+)$/.exec(cond.trim());
  if (!m) throw new Error(`count 조건 형식 오류: ${cond}`);
  const op = m[1] ?? '==';
  const v = Number(m[2]);
  switch (op) {
    case '>=':
      return n >= v;
    case '<=':
      return n <= v;
    case '>':
      return n > v;
    case '<':
      return n < v;
    default:
      return n === v;
  }
}

// ---------------------------------------------------------------------------
// 기록 러너용 비파괴 판정: 예외 대신 실패 목록을 돌려준다. 판정 규칙은 expectStep 과 같다.
// ---------------------------------------------------------------------------

export interface CheckOptions {
  /** 기본 15초. 기록 중 "아직인지" 빨리 보려면 짧게 준다 */
  timeoutMs?: number;
  consoleTitle?: boolean;
}

export async function checkExpectation(
  page: Page,
  exp: Expectation,
  opts: CheckOptions = {},
): Promise<string[]> {
  const timeout = exp.timeout ?? opts.timeoutMs ?? 15_000;
  const failures: string[] = [];
  const deadline = Date.now() + timeout;
  const remaining = () => Math.max(250, deadline - Date.now());
  const poll = async (label: string, test: () => Promise<boolean>): Promise<void> => {
    for (;;) {
      if (await test().catch(() => false)) return;
      if (Date.now() >= deadline) {
        failures.push(label);
        return;
      }
      await page.waitForTimeout(250);
    }
  };
  if (exp.url) await poll(`URL 에 "${exp.url}" 포함`, async () => page.url().includes(exp.url!));
  if (opts.consoleTitle !== false) {
    if (isSsoUrl(page.url())) return [...failures, 'SSO 로그인 페이지로 이동함 (세션 만료)'];
    await poll('document.title 이 "… | Console" 형식', async () => TITLE_PATTERN.test(await page.title()));
  }
  if (exp.title) await poll(`title == "${exp.title}"`, async () => (await page.title()) === exp.title);
  if (exp.title_contains)
    await poll(`title 에 "${exp.title_contains}" 포함`, async () =>
      (await page.title()).includes(exp.title_contains!),
    );
  for (const t of exp.text ?? []) {
    await poll(
      `"${t}" 텍스트 표시`,
      async () => (await visibleText(page, t, Math.min(remaining(), 1_000))) !== null,
    );
  }
  for (const t of exp.not_text ?? []) {
    await poll(`"${t}" 텍스트 없음`, async () => !(await allBodyText(page)).includes(t));
  }
  for (const [what, cond] of Object.entries(exp.count ?? {})) {
    const role = what.replace(/^table\s+/, '').trim() as Parameters<Page['getByRole']>[0];
    await poll(`${what} 개수 ${cond}`, async () => compareCount(await countRole(page, role), cond));
  }
  return failures;
}

export function describeExpectation(exp: Expectation): string {
  const parts: string[] = [];
  if (exp.url) parts.push(`URL 에 "${exp.url}" 포함`);
  if (exp.title) parts.push(`제목 "${exp.title}"`);
  if (exp.title_contains) parts.push(`제목에 "${exp.title_contains}" 포함`);
  if (exp.text?.length) parts.push(`화면에 ${exp.text.map((t) => `"${t}"`).join(', ')} 표시`);
  if (exp.not_text?.length) parts.push(`${exp.not_text.map((t) => `"${t}"`).join(', ')} 는 없음`);
  for (const [k, v] of Object.entries(exp.count ?? {})) parts.push(`${k} 개수 ${v}`);
  return parts.join('; ') || '(기대값 없음)';
}
