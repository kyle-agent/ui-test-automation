/**
 * smoke / regression 프로젝트의 선행 조건: 사람이 저장한 로그인 세션이 존재하고 아직 유효한지 한 번만 확인한다.
 * 실패하면 의존 프로젝트 전체가 건너뛰어져, 193개 화면이 하나씩 느리게 실패하는 일을 막는다.
 *
 * 진입은 실제 로그인 때와 같은 콘솔 루트(/console/)로 한다. 콘솔 세션이 무효라도 SSO 쿠키로 자동 복구되면
 * 새 콘솔 세션을 같은 파일에 다시 저장해 뒤따르는 테스트가 쓰게 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test as setup } from '@playwright/test';
import { describePageState } from '../../src/console/diagnose';
import { CONSOLE_BASE_PATH, CONSOLE_URL, SESSION, sessionFile } from '../../src/console/env';
import { expiredMessage, waitForConsole } from '../../src/console/session';

setup(`로그인 세션 확인 (${SESSION})`, async ({ browser }) => {
  const file = sessionFile();
  const rel = path.relative(process.cwd(), file);
  if (!fs.existsSync(file)) {
    throw new Error(
      `${rel} 이(가) 없습니다. 콘솔 로그인은 사람이 합니다: 로컬 PC 에서 \`npm run auth:login -- --session ${SESSION}\` 을 실행해 ` +
        `SSO/MFA 로그인을 마치면 세션이 이 파일로 저장됩니다. (클라우드 세션에서는 대화형 로그인이 불가능합니다)`,
    );
  }
  const context = await browser.newContext({ storageState: file, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const page = await context.newPage();
  await page.goto(`${CONSOLE_URL}${CONSOLE_BASE_PATH}`, { waitUntil: 'domcontentloaded' });
  const state = await waitForConsole(page, 90_000);
  if (state === 'expired') {
    throw new Error(`${expiredMessage(rel)}\n${await describePageState(page, context)}`);
  }
  const title = await page.title();
  if (state === 'recovered') {
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1_500);
    await context.storageState({ path: file, indexedDB: true });
    console.log(
      `세션 복구 (${rel}): 콘솔 세션이 무효였지만 SSO 쿠키로 다시 들어와 파일을 갱신했습니다. 화면: ${title}`,
    );
  } else {
    console.log(`세션 OK (${rel}): ${title}`);
  }
  await context.close();
});
