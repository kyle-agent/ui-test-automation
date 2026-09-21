/**
 * 콘솔 접속 환경. 값은 .env 또는 실행 환경 변수에서만 읽는다.
 * 자격 증명은 여기에도, 다른 어디에도 두지 않는다. 로그인 세션은 storageState 파일로만 재사용한다.
 */
import path from 'node:path';

export const CONSOLE_URL = (
  process.env.CONSOLE_URL ?? 'https://console.kr-west1.e.samsungsdscloud.com'
).replace(/\/+$/, '');

/** 콘솔 SPA 의 base path. 모든 화면은 `${CONSOLE_URL}${CONSOLE_BASE_PATH}#<route>` 형태의 hash 라우트다. */
export const CONSOLE_BASE_PATH = '/console/';

/** SSO(Keycloak) 호스트. 여기로 리다이렉트되면 세션이 없거나 만료된 것이다. */
export const SSO_HOST_PATTERN = /(^|\.)sso\./;

export type SessionKind = 'root' | 'iam';

export const SESSION: SessionKind = process.env.SESSION === 'iam' ? 'iam' : 'root';

export const RECORDINGS_DIR = path.resolve(process.cwd(), 'recordings');

/** 사람이 로그인해 만든 Playwright storageState 파일. gitignore 대상. */
export function sessionFile(kind: SessionKind = SESSION): string {
  return path.join(RECORDINGS_DIR, `session-${kind}.json`);
}

/** `/iam/user/list` 또는 `#/iam/user/list` → 전체 URL */
export function hashUrl(route: string): string {
  const clean = route.startsWith('#') ? route.slice(1) : route;
  return `${CONSOLE_URL}${CONSOLE_BASE_PATH}#${clean.startsWith('/') ? clean : `/${clean}`}`;
}

export function consoleHost(): string {
  return new URL(CONSOLE_URL).hostname;
}

export function isSsoUrl(url: string): boolean {
  try {
    return SSO_HOST_PATTERN.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function isConsoleUrl(url: string): boolean {
  try {
    return new URL(url).hostname === consoleHost();
  } catch {
    return false;
  }
}
