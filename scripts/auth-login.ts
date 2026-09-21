/**
 * 사람이 브라우저에서 직접 로그인(비밀번호·MFA·캡차)하고, 완료되면 Playwright storageState 를 저장한다.
 * 이 스크립트는 자격 증명을 읽지도, 입력하지도 않는다. 대시보드가 뜨는 것만 기다린다.
 *
 *   npm run auth:login -- [--session root|iam] [--channel msedge|chrome] [--timeout 15]
 *   (--channel 을 생략하면 .env 의 PW_CHANNEL 을, 그것도 없으면 Playwright 가 설치한 Chromium 을 쓴다)
 *
 * 저장 위치: recordings/session-<session>.json (gitignore). 이 파일은 로그인 세션 그 자체이므로 공유·커밋 금지.
 * 클라우드 세션에서는 headed 브라우저를 띄울 수 없으므로 반드시 로컬 PC 또는 회사망 러너에서 실행한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import {
  CONSOLE_BASE_PATH,
  CONSOLE_URL,
  consoleHost,
  sessionFile,
  type SessionKind,
} from '../src/console/env';
import { parseArgs } from '../src/service-map/io';

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const kind: SessionKind = flags.session === 'iam' ? 'iam' : 'root';
  const minutes = typeof flags.timeout === 'string' ? Number(flags.timeout) : 15;
  const file = sessionFile(kind);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    channel: typeof flags.channel === 'string' ? flags.channel : process.env.PW_CHANNEL || undefined,
  });
  try {
    const context = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${CONSOLE_URL}${CONSOLE_BASE_PATH}`, { waitUntil: 'domcontentloaded' });
    console.log(`열린 브라우저에서 ${kind} 사용자로 로그인하세요 (비밀번호, MFA 인증번호, 캡차 포함).`);
    console.log(`콘솔 대시보드가 뜨면 자동으로 세션을 저장합니다. 최대 ${minutes}분 기다립니다.`);
    await page.waitForFunction(
      (host) => location.hostname === host && /\| Console$/.test(document.title),
      consoleHost(),
      { timeout: minutes * 60_000, polling: 1000 },
    );
    await page.waitForTimeout(1500); // 토큰 저장이 끝나도록 잠시 여유
    await context.storageState({ path: file });
    console.log(`저장 완료: ${path.relative(process.cwd(), file)} (${await page.title()})`);
    console.log('이 파일은 gitignore 대상입니다. 만료되면 같은 명령으로 다시 저장하세요.');
  } finally {
    await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
