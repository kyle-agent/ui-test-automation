/**
 * 콘솔 테스트용 test 객체. `@playwright/test` 의 test 대신 이걸 import 한다.
 *
 * PW_CDP_URL 이 있으면 살아 있는 로그인 브라우저(npm run auth:login -- --keep-open)에 붙어 그 기본 컨텍스트에서 탭을 연다.
 * 없으면 기본 동작대로 storageState 파일로 새 컨텍스트를 만든다. 두 경우 모두 실패 시 스크린샷과 trace 를 남긴다.
 *
 * 로그인 전 공개 화면 테스트(tests/auth)는 이 fixture 를 쓰지 않는다. 항상 빈 컨텍스트여야 하기 때문이다.
 */
import path from 'node:path';
import { test as base, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { connectLiveBrowser, liveContext, usingLiveBrowser } from '../console/browser';

type WorkerFixtures = { liveBrowser: Browser | null };
type TestFixtures = { context: BrowserContext; page: Page };

export const test = base.extend<TestFixtures, WorkerFixtures>({
  liveBrowser: [
    async ({}, use) => {
      if (!usingLiveBrowser()) {
        await use(null);
        return;
      }
      const browser = await connectLiveBrowser();
      await use(browser);
      await browser.close().catch(() => undefined); // 연결만 끊는다. 브라우저 자체는 계속 산다.
    },
    { scope: 'worker' },
  ],

  browser: [
    async ({ liveBrowser, playwright, browserName, headless, channel, launchOptions }, use) => {
      if (liveBrowser) {
        await use(liveBrowser);
        return;
      }
      const browser = await playwright[browserName].launch({
        ...launchOptions,
        headless,
        channel: channel || undefined,
      });
      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],

  context: async (
    { browser, liveBrowser, contextOptions, actionTimeout, navigationTimeout, trace },
    use,
    testInfo,
  ) => {
    const context = liveBrowser ? liveContext(liveBrowser) : await browser.newContext(contextOptions);
    if (actionTimeout) context.setDefaultTimeout(actionTimeout);
    if (navigationTimeout) context.setDefaultNavigationTimeout(navigationTimeout);

    const traceMode = typeof trace === 'string' ? trace : trace?.mode;
    const wantTrace =
      traceMode === 'on' || traceMode === 'retain-on-failure' || traceMode === 'on-first-retry';
    let tracing = false;
    if (wantTrace) {
      await context.tracing
        .start({ screenshots: true, snapshots: true, sources: true, title: testInfo.title })
        .then(() => (tracing = true))
        .catch(() => undefined); // 같은 컨텍스트에 다른 연결이 이미 trace 중이면 건너뛴다
    }

    await use(context);

    const failed = testInfo.status !== testInfo.expectedStatus;
    if (tracing) {
      if (failed || traceMode === 'on') {
        const file = testInfo.outputPath('trace.zip');
        await context.tracing.stop({ path: file }).catch(() => undefined);
        testInfo.attachments.push({ name: 'trace', path: file, contentType: 'application/zip' });
      } else {
        await context.tracing.stop().catch(() => undefined);
      }
    }
    if (!liveBrowser) await context.close();
  },

  page: async ({ context, screenshot }, use, testInfo) => {
    const page = await context.newPage();
    await use(page);
    const failed = testInfo.status !== testInfo.expectedStatus;
    const mode = typeof screenshot === 'string' ? screenshot : screenshot?.mode;
    if ((failed && mode === 'only-on-failure') || mode === 'on') {
      const file = testInfo.outputPath(`screenshot-${path.basename(testInfo.file, '.spec.ts')}.png`);
      await page.screenshot({ path: file, fullPage: false }).catch(() => undefined);
      testInfo.attachments.push({ name: 'screenshot', path: file, contentType: 'image/png' });
    }
    await page.close().catch(() => undefined);
  },
});

export { expect } from '@playwright/test';
