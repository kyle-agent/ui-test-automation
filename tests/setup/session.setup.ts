/**
 * smoke / regression 프로젝트의 선행 조건: 사람이 저장한 로그인 세션이 존재하고 아직 유효한지 한 번만 확인한다.
 * 실패하면 의존 프로젝트 전체가 건너뛰어져, 193개 화면이 하나씩 느리게 실패하는 일을 막는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { SESSION, hashUrl, isSsoUrl, sessionFile } from '../../src/console/env';
import { TITLE_PATTERN } from '../../src/console/titles';

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
  await page.goto(hashUrl('/home/dashboard'), { waitUntil: 'domcontentloaded' });
  await page
    .waitForFunction(
      () => /\| Console$/.test(document.title) || /(^|\.)sso\./.test(location.hostname),
      null,
      {
        timeout: 60_000,
      },
    )
    .catch(() => undefined);
  if (isSsoUrl(page.url())) {
    throw new Error(
      `${rel} 세션이 만료되었습니다 (SSO 로그인 페이지로 이동). 로컬 PC 에서 npm run auth:login 으로 갱신하세요.`,
    );
  }
  await expect(
    page,
    '대시보드 제목 형식이 "<화면명> | <서비스명> | <리전> | Console" 이어야 합니다',
  ).toHaveTitle(TITLE_PATTERN);
  console.log(`세션 OK (${rel}): ${await page.title()}`);
  await context.close();
});
