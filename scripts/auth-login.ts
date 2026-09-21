/**
 * 사람이 브라우저에서 직접 로그인(비밀번호·MFA·캡차)하고, 완료되면 Playwright storageState 를 저장한다.
 * 이 스크립트는 자격 증명을 읽지도, 입력하지도 않는다. 콘솔 대시보드가 뜨는 것만 기다린다.
 *
 *   npm run auth:login -- [--session root|iam] [--channel msedge|chrome] [--timeout 15] [--keep-open]
 *   (--channel 을 생략하면 .env 의 PW_CHANNEL 을, 그것도 없으면 Playwright 가 설치한 Chromium 을 쓴다)
 *
 * 저장 위치: recordings/session-<session>.json (gitignore). 이 파일은 로그인 세션 그 자체이므로 공유·커밋 금지.
 * 클라우드 세션에서는 headed 브라우저를 띄울 수 없으므로 반드시 로컬 PC 또는 회사망 러너에서 실행한다.
 *
 * 로그인 도중 SSO 가 새 탭을 열거나 원래 탭을 닫아도 견디도록, 특정 탭이 아니라 컨텍스트의 모든 탭을 주기적으로 확인한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
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
  const channel = typeof flags.channel === 'string' ? flags.channel : process.env.PW_CHANNEL || undefined;
  const file = sessionFile(kind);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const browser = await chromium.launch({ headless: false, channel });
  const context = await browser.newContext({
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1440, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto(`${CONSOLE_URL}${CONSOLE_BASE_PATH}`, { waitUntil: 'domcontentloaded' });
    console.log(
      `열린 브라우저(${channel ?? 'chromium'})에서 ${kind} 사용자로 로그인하세요 (비밀번호, MFA 인증번호, 캡차 포함).`,
    );
    console.log(
      `콘솔 대시보드가 뜨면 세션을 저장합니다. 최대 ${minutes}분 기다립니다. 창을 직접 닫지 마세요.`,
    );

    const dashboard = await waitForConsole(context, minutes * 60_000);
    // 토큰이 저장소에 기록될 시간을 준다. 화면이 아직 로딩 중이어도 네트워크가 잠잠해질 때까지만 기다린다.
    await dashboard.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await dashboard.waitForTimeout(2_000);
    // IndexedDB 까지 포함해 저장한다 (SPA 가 토큰을 IndexedDB 에 둘 수도 있다).
    await context.storageState({ path: file, indexedDB: true });
    const storage = await dashboard
      .evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))
      .catch(() => null);
    if (storage) {
      console.log(`  localStorage 키: ${storage.local.join(', ') || '(없음)'}`);
      console.log(
        `  sessionStorage 키: ${storage.session.join(', ') || '(없음)'} (sessionStorage 는 파일에 저장되지 않는다)`,
      );
    }
    console.log(`저장 완료: ${path.relative(process.cwd(), file)}`);
    console.log(`  화면: ${await dashboard.title()}`);
    console.log(
      '이 파일은 gitignore 대상입니다. 만료되면 같은 명령으로 다시 저장하세요. 확인: npm run auth:check',
    );
    if (flags['keep-open']) {
      console.log('--keep-open: 브라우저를 열어 둡니다. 이 터미널에서 Ctrl+C 로 종료하세요.');
      await new Promise(() => undefined);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** 컨텍스트의 어느 탭이든 콘솔 호스트에서 "… | Console" 제목을 갖게 될 때까지 기다린다. 탭이 닫히거나 바뀌어도 계속 본다. */
async function waitForConsole(context: BrowserContext, timeoutMs: number): Promise<Page> {
  const host = consoleHost();
  const deadline = Date.now() + timeoutMs;
  let lastNote = '';
  while (Date.now() < deadline) {
    const pages = context.pages();
    if (pages.length === 0) {
      throw new Error('브라우저 탭이 모두 닫혔습니다. 로그인이 끝날 때까지 창을 닫지 마세요.');
    }
    for (const p of pages) {
      const info = await p
        .evaluate(() => ({ host: location.hostname, title: document.title }))
        .catch(() => null); // 이동 중이면 다음 주기에 다시 본다
      if (!info) continue;
      if (info.host === host && /\| Console$/.test(info.title)) return p;
      const note = `${info.host} — ${info.title}`;
      if (note !== lastNote) {
        lastNote = note;
        console.log(`  현재: ${note}`);
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${timeoutMs / 60_000}분 안에 콘솔 대시보드가 뜨지 않았습니다. 다시 실행하세요.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
