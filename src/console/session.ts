/**
 * 저장된 세션으로 콘솔에 들어갔을 때 벌어지는 세 가지 상황을 구분한다.
 *
 *  ok        화면 제목이 "… | Console" 로 바뀜 (콘솔 세션 유효)
 *  recovered 콘솔 세션은 무효("권한 없음 / Session Invalid", #/login)지만 SSO 쿠키가 살아 있어서
 *            모달의 "확인" → SSO → 콘솔 순으로 비밀번호·MFA 없이 다시 들어옴. 세션 파일을 갱신해야 한다.
 *  expired   SSO 로그인 폼(사용자 유형 선택 + "다음")까지 갔음. 사람이 다시 로그인해야 한다.
 */
import type { Page } from '@playwright/test';
import { isSsoUrl } from './env';

export type SessionState = 'ok' | 'recovered' | 'expired';

const TITLE_OR_SSO = () => /\| Console$/.test(document.title) || /(^|\.)sso\./.test(location.hostname);

export async function waitForConsole(page: Page, timeoutMs = 60_000): Promise<SessionState> {
  const deadline = Date.now() + timeoutMs;
  let recovered = false;
  while (Date.now() < deadline) {
    const remaining = Math.max(1_000, deadline - Date.now());
    await page
      .waitForFunction(
        () =>
          /\| Console$/.test(document.title) ||
          /(^|\.)sso\./.test(location.hostname) ||
          /Session Invalid|세션이 만료|권한 없음/.test(document.body?.innerText ?? ''),
        null,
        { timeout: Math.min(remaining, 30_000), polling: 250 },
      )
      .catch(() => undefined);

    if (isSsoUrl(page.url())) {
      // SSO 에 갔다가 자동으로 돌아오는 중일 수 있다. 로그인 폼이 보이면 진짜 만료.
      const loginForm = page.getByText('다음', { exact: true }).filter({ visible: true });
      const returned = await Promise.race([
        loginForm
          .first()
          .waitFor({ timeout: 15_000 })
          .then(() => 'form' as const),
        page.waitForFunction(TITLE_OR_SSO, null, { timeout: 15_000 }).then(() => 'moved' as const),
      ]).catch(() => 'timeout' as const);
      if (returned === 'form') return 'expired';
      if (isSsoUrl(page.url())) return 'expired';
      continue;
    }

    if (/\| Console$/.test(await page.title())) return recovered ? 'recovered' : 'ok';

    const confirm = page.getByText('확인', { exact: true }).filter({ visible: true }).first();
    if (!recovered && (await confirm.isVisible().catch(() => false))) {
      recovered = true;
      await confirm.click();
      continue;
    }
    if (recovered) await page.waitForTimeout(1_000);
  }
  return 'expired';
}

export function expiredMessage(sessionFileRel: string): string {
  return (
    `${sessionFileRel} 세션이 만료되었습니다 (SSO 로그인 폼까지 이동). ` +
    `로컬 PC 에서 npm run auth:login 으로 다시 저장하세요.`
  );
}
