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
import { collectWriteRequests } from '../console/api-log';
import { connectLiveBrowser, liveContext, usingLiveBrowser } from '../console/browser';
import { recordingVideo, startScreencast, VIDEO_DIR } from '../console/screencast';
import { API_WRITES_ANNOTATION } from '../report/run-record';

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
      // 연결만 끊는다. 브라우저 자체는 계속 산다. 2026-10-16 DBaaS 3개 동시 실행 뒤 close() 가 90초 워커 teardown 한도를 넘겨
      // 테스트는 다 통과했는데 실행 기록이 FAIL 로 남았다 → 15초만 기다리고 넘어간다(CDP 세션은 프로세스 종료로 정리됨).
      await Promise.race([
        browser.close().catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 15_000).unref()),
      ]);
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
    // 이 페이지가 보낸 쓰기 요청(메서드·경로만)을 실행 기록에 남긴다 → 콘솔 전용 쓰기 동작 자동 집계(2026-10-14)
    const writes = collectWriteRequests(page);
    // PW_VIDEO_DIR 이 있으면 화면을 webm 으로 남긴다 (팀 공유용, src/console/screencast.ts). 실패해도 테스트는 계속 간다.
    const specBase = path.basename(testInfo.file, '.spec.ts');
    const stopVideo =
      recordingVideo() && !/\.setup\.ts$/.test(testInfo.file) // 세션 확인(setup 프로젝트)은 찍지 않는다
        ? await startScreencast(page, testInfo.outputPath('frames'), (l) => console.log(l)).catch((err) => {
            console.log(
              `[video] 녹화를 시작하지 못했습니다: ${err instanceof Error ? err.message : String(err)}`,
            );
            return null;
          })
        : null;
    await use(page);
    if (stopVideo) {
      const d = new Date(); // 실행 기록(reports/runs)과 같은 현지 시각 YYYYMMDD-HHMM
      const p2 = (n: number) => String(n).padStart(2, '0');
      const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
      const video = await stopVideo(path.join(VIDEO_DIR, `${stamp}-${specBase}.webm`)).catch(() => null);
      if (video) testInfo.attachments.push({ name: 'video', path: video, contentType: 'video/webm' });
    }
    const written = writes();
    if (written.length)
      testInfo.annotations.push({ type: API_WRITES_ANNOTATION, description: JSON.stringify(written) });
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
