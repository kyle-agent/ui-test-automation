/**
 * 콘솔에 로그인된 브라우저 컨텍스트를 얻는 두 가지 방법.
 *
 *  1. 살아 있는 로그인 브라우저에 CDP 로 붙기 (권장, PW_CDP_URL)
 *     `npm run auth:login -- --keep-open` 이 띄운 브라우저는 --remote-debugging-port 를 열어 둔다.
 *     콘솔은 창을 닫거나 시간이 지나면 서버 세션을 무효화하고 SSO 까지 로그아웃시키므로,
 *     쿠키를 파일로 복사해 새 브라우저에서 재생하는 방식은 오래 가지 않는다. 같은 브라우저 안에서 새 탭을 여는 것이 안전하다.
 *
 *  2. storageState 파일로 새 브라우저 띄우기 (PW_CDP_URL 이 없을 때)
 *     로그인 직후 짧은 시간에는 동작한다. 러너가 브라우저를 계속 살려 둘 수 없을 때의 차선책.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { sessionFile } from './env';

export const CDP_URL = process.env.PW_CDP_URL?.trim() || '';

export function usingLiveBrowser(): boolean {
  return CDP_URL !== '';
}

export async function connectLiveBrowser(): Promise<Browser> {
  try {
    return await chromium.connectOverCDP(CDP_URL);
  } catch (err) {
    throw new Error(
      `PW_CDP_URL=${CDP_URL} 에 연결하지 못했습니다. \`npm run auth:login -- --keep-open\` 으로 띄운 브라우저가 열려 있어야 합니다. ` +
        `(${err instanceof Error ? err.message.split('\n')[0] : String(err)})`,
    );
  }
}

export function liveContext(browser: Browser): BrowserContext {
  const ctx = browser.contexts()[0];
  if (!ctx) throw new Error('CDP 로 연결한 브라우저에 컨텍스트가 없습니다. 로그인 브라우저를 다시 띄우세요.');
  return ctx;
}

export interface ConsoleSession {
  context: BrowserContext;
  live: boolean;
  close(): Promise<void>;
}

/** 스크립트용: 살아 있는 브라우저가 있으면 그 컨텍스트를, 없으면 storageState 로 새 브라우저를 연다. */
export async function openConsoleSession(opts: { headless?: boolean } = {}): Promise<ConsoleSession> {
  if (usingLiveBrowser()) {
    const browser = await connectLiveBrowser();
    return { context: liveContext(browser), live: true, close: () => browser.close() };
  }
  const file = sessionFile();
  if (!fs.existsSync(file)) {
    throw new Error(
      `${path.relative(process.cwd(), file)} 이(가) 없습니다. npm run auth:login 으로 로그인 세션을 저장하거나, ` +
        `--keep-open 으로 띄운 브라우저에 PW_CDP_URL 로 붙으세요.`,
    );
  }
  const browser = await chromium.launch({
    headless: opts.headless ?? true,
    channel: process.env.PW_CHANNEL || undefined,
  });
  const context = await browser.newContext({ storageState: file, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  return { context, live: false, close: () => browser.close() };
}
