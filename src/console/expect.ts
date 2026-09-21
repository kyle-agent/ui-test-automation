/**
 * 결정적 기대값 판정. LLM 없이 코드로만 판정한다. 시나리오 expect(url/title/text/not_text/count)와 1:1.
 */
import { expect, type Page, type TestInfo } from '@playwright/test';
import { hashUrl, isSsoUrl } from './env';
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

/** hash 라우트로 직접 진입하고, 화면이 제목을 세팅할 때까지(또는 SSO 로 튕길 때까지) 기다린다. */
export async function gotoRoute(page: Page, route: string, opts: { timeout?: number } = {}): Promise<void> {
  const timeout = opts.timeout ?? 45_000;
  await page.goto(hashUrl(route), { waitUntil: 'domcontentloaded', timeout });
  await page
    .waitForFunction(
      () => /\| Console$/.test(document.title) || /(^|\.)sso\./.test(location.hostname),
      null,
      {
        timeout,
        polling: 250,
      },
    )
    .catch(() => undefined); // 제목 판정은 아래 expectStep 이 더 좋은 메시지로 한다
  assertNotSso(page);
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
        message: 'document.title 이 "<화면명> | <서비스명> | <리전> | Console" 형식이어야 합니다',
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
  if (exp.title) await expect(page).toHaveTitle(exp.title);
  for (const t of exp.text ?? []) {
    await expect(page.getByText(t).first(), `"${t}" 텍스트가 보여야 합니다`).toBeVisible();
  }
  if (exp.not_text?.length) {
    // 화면이 안정된 뒤 한 번 읽어 대소문자 구분 부분 일치로 검사한다 (오류 배너·권한 안내 탐지용).
    const body = await page.locator('body').innerText();
    for (const t of exp.not_text) {
      expect(body.includes(t), `"${t}" 텍스트가 보이면 안 됩니다`).toBe(false);
    }
  }
  for (const [what, cond] of Object.entries(exp.count ?? {})) {
    const role = what.replace(/^table\s+/, '').trim() as Parameters<Page['getByRole']>[0];
    const n = await page.getByRole(role).count();
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
