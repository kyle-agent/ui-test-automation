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
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { sessionFile } from './env';

export const CDP_URL = process.env.PW_CDP_URL?.trim() || '';

export function usingLiveBrowser(): boolean {
  return CDP_URL !== '';
}

const connectError = (err: unknown) =>
  new Error(
    `PW_CDP_URL=${CDP_URL} 에 연결하지 못했습니다. \`npm run auth:login -- --keep-open\` 으로 띄운 브라우저가 열려 있어야 합니다. ` +
      `(${err instanceof Error ? err.message.split('\n')[0] : String(err)})`,
  );

async function cdpAlive(timeoutMs = 3_000): Promise<boolean> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: ctl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** CDP 타깃 중 브라우저 내부 페이지(edge://, chrome://). Playwright 는 여기에 붙으려다 멈춘다 (edge://downloads-hub/, 2026-09-21 실측). */
async function internalTargets(): Promise<string[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3_000);
  try {
    const res = await fetch(`${CDP_URL}/json/list`, { signal: ctl.signal });
    const list = (await res.json()) as { type: string; url: string }[];
    return list.filter((t) => t.type === 'page' && /^(edge|chrome):\/\//.test(t.url)).map((t) => t.url);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** 로그인 브라우저 프로세스를 강제 종료한다 (영구 프로필 디렉터리로 식별). 강제 종료는 로그아웃을 일으키지 않는다. */
export async function killLoginBrowser(log: (line: string) => void = console.log): Promise<void> {
  const session = process.env.SESSION?.trim() || 'root';
  const marker = `profile-${session}`;
  log(`로그인 브라우저(${marker})를 강제 종료합니다.`);
  await new Promise<void>((resolve) => {
    const ps = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'msedge.exe' -or $_.Name -eq 'chrome.exe') -and $_.CommandLine -like '*${marker}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: 'ignore', windowsHide: true },
    );
    ps.on('exit', () => resolve());
    ps.on('error', () => resolve());
  });
  for (let i = 0; i < 10 && (await cdpAlive(1_000)); i++) await new Promise((r) => setTimeout(r, 500));
}

/**
 * 로그인 브라우저를 같은 영구 프로필로 다시 띄운다 (죽었을 때, 또는 force 면 강제 종료 후).
 * 콘솔의 .pem 다운로드로 Edge 가 크래시하거나 내부 페이지 타깃 때문에 붙지 못할 때 쓴다 (2026-09-21).
 * 크래시·강제 종료는 로그아웃이 아니라서 프로필의 쿠키가 살아 있고, 다시 띄우기만 하면 콘솔 세션이 돌아온다 (재로그인 불필요, 실측).
 * 세션이 정말 만료됐으면 띄운 브라우저가 SSO 화면에서 사람을 기다리고, 테스트는 세션 만료로 실패한다.
 * PW_AUTO_RELAUNCH=0 이면 하지 않는다.
 */
export async function relaunchLoginBrowser(
  log: (line: string) => void = console.log,
  opts: { force?: boolean } = {},
): Promise<boolean> {
  if (process.env.PW_AUTO_RELAUNCH === '0') return false;
  if (await cdpAlive()) {
    if (!opts.force) return true;
    await killLoginBrowser(log);
  }
  const session = process.env.SESSION?.trim() || 'root';
  const channel = process.env.PW_CHANNEL?.trim();
  const port = new URL(CDP_URL).port || '9222';
  const args = ['tsx', 'scripts/auth-login.ts', '--session', session, '--keep-open', '--cdp-port', port];
  if (channel) args.push('--channel', channel);
  log(`로그인 브라우저가 응답하지 않아 다시 띄웁니다: npx ${args.join(' ')}`);
  const logDir = path.resolve(process.cwd(), 'test-results');
  fs.mkdirSync(logDir, { recursive: true });
  const out = fs.openSync(path.join(logDir, 'auth-login.relaunch.log'), 'a');
  const child = spawn('cmd.exe', ['/d', '/s', '/c', `npx ${args.join(' ')}`], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', out, out],
    windowsHide: true,
  });
  child.unref();
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    if (await cdpAlive()) {
      await new Promise((r) => setTimeout(r, 3_000)); // 프로필 로드·첫 탭 이동 시간
      log(`로그인 브라우저 복구됨 (${CDP_URL})`);
      return true;
    }
  }
  log('로그인 브라우저를 90초 안에 다시 띄우지 못했습니다.');
  return false;
}

/**
 * 살아 있는 로그인 브라우저를 강제로 죽이고 다시 띄워도 되는가. 기본은 **안 된다**:
 * 병렬 스위트·여러 에이전트가 같은 브라우저를 나눠 쓰는 동안 한 프로세스의 연결 시간 초과(부하)나 내부 탭(다운로드) 때문에
 * 강제 재기동하면 다른 spec 의 탭이 전부 닫힌다(2026-09-30 16:26 실측, 09-29 13:50·09-30 11:01 의 "탭 동시 소멸" 도 같은 경로로 추정).
 * 혼자 돌릴 때만 PW_FORCE_RELAUNCH=1 로 켠다. 브라우저가 실제로 죽었을 때(CDP 무응답) 다시 띄우는 것은 그대로 한다.
 */
const forceRelaunchAllowed = () => process.env.PW_FORCE_RELAUNCH === '1';

export async function connectLiveBrowser(log: (line: string) => void = console.log): Promise<Browser> {
  // 내부 페이지 타깃이 있으면 connectOverCDP 가 거기에 붙으려다 타임아웃된다. /json/close 로는 닫히지 않는다.
  if (process.env.PW_AUTO_RELAUNCH !== '0' && (await cdpAlive())) {
    const internal = await internalTargets();
    if (internal.length) {
      if (!forceRelaunchAllowed())
        throw connectError(
          new Error(
            `브라우저 내부 페이지 탭(${internal.join(', ')})이 열려 있어 연결할 수 없습니다. 그 탭을 손으로 닫아 주세요 ` +
              '(다른 실행이 같은 브라우저를 쓰고 있을 수 있어 자동 재기동하지 않습니다. 혼자 돌릴 때는 PW_FORCE_RELAUNCH=1).',
          ),
        );
      log(`브라우저 내부 페이지 타깃(${internal.join(', ')}) 때문에 연결이 막히므로 로그인 브라우저를 재기동합니다.`);
      if (!(await relaunchLoginBrowser(log, { force: true }))) throw connectError(new Error('재기동 실패'));
    }
  }
  try {
    return await chromium.connectOverCDP(CDP_URL, { timeout: 20_000 });
  } catch (err) {
    // 죽었으면(ECONNREFUSED) 다시 띄운다. 살아 있는데 붙지 못한 것(부하 중 타임아웃)이면 강제 재기동하지 않고 한 번 더 기다려 붙는다.
    if (await cdpAlive()) {
      if (!forceRelaunchAllowed()) {
        log('CDP 연결이 시간 안에 안 됐지만 브라우저는 살아 있어 재기동하지 않고 다시 붙습니다.');
        try {
          return await chromium.connectOverCDP(CDP_URL, { timeout: 60_000 });
        } catch (err2) {
          throw connectError(err2);
        }
      }
    }
    if (!(await relaunchLoginBrowser(log, { force: forceRelaunchAllowed() }))) throw connectError(err);
    try {
      return await chromium.connectOverCDP(CDP_URL, { timeout: 20_000 });
    } catch (err2) {
      throw connectError(err2);
    }
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
