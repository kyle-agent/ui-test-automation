/**
 * smoke / regression 프로젝트의 선행 조건: 콘솔에 로그인된 세션이 있는지 한 번만 확인한다.
 * 실패하면 의존 프로젝트 전체가 건너뛰어져, 화면 수백 개가 하나씩 느리게 실패하는 일을 막는다.
 *
 *  - PW_CDP_URL 이 있으면 살아 있는 로그인 브라우저에서 새 탭을 열어 확인한다 (권장).
 *  - 없으면 recordings/session-<SESSION>.json 으로 새 브라우저를 띄워 확인한다. 콘솔이 세션을 무효화했으면 실패한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test as setup } from '../../src/fixtures/test';
import { usingLiveBrowser } from '../../src/console/browser';
import { describePageState } from '../../src/console/diagnose';
import { CONSOLE_BASE_PATH, CONSOLE_URL, SESSION, sessionFile } from '../../src/console/env';
import { expiredMessage, waitForConsole } from '../../src/console/session';

const file = sessionFile();
const rel = path.relative(process.cwd(), file);

setup.beforeAll(() => {
  if (!usingLiveBrowser() && !fs.existsSync(file)) {
    throw new Error(
      `${rel} 이(가) 없고 PW_CDP_URL 도 없습니다. 콘솔 로그인은 사람이 합니다: 로컬 PC 에서 ` +
        `\`npm run auth:login -- --session ${SESSION} --keep-open\` 으로 로그인한 브라우저를 열어 두고, .env 에 ` +
        `PW_CDP_URL=http://127.0.0.1:9222 를 넣으세요.`,
    );
  }
});

setup(
  `로그인 세션 확인 (${SESSION}${usingLiveBrowser() ? ', 살아 있는 브라우저' : ', storageState 파일'})`,
  async ({ page, context }) => {
    await page.goto(`${CONSOLE_URL}${CONSOLE_BASE_PATH}`, { waitUntil: 'domcontentloaded' });
    const state = await waitForConsole(page, 90_000);
    if (state === 'expired') {
      const hint = usingLiveBrowser()
        ? '로그인 브라우저의 세션이 끝났습니다. npm run auth:login -- --keep-open 으로 다시 로그인하세요.'
        : expiredMessage(rel);
      throw new Error(`${hint}\n${await describePageState(page, context)}`);
    }
    const title = await page.title();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    // 살아 있는 브라우저의 최신 쿠키를 파일에도 남겨 둔다 (CDP 없이 도는 스크립트의 차선책).
    await context.storageState({ path: file, indexedDB: true }).catch(() => undefined);
    console.log(`세션 ${state === 'recovered' ? '복구' : 'OK'}: ${title}`);
  },
);
