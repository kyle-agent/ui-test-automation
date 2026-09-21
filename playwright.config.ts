import 'dotenv/config';
import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { CONSOLE_URL, sessionFile } from './src/console/env';

const CI = !!process.env.CI;
const runDestructive = process.env.RUN_DESTRUCTIVE === '1';
const liveBrowser = !!process.env.PW_CDP_URL;
// storageState 파일은 있을 때만 넘긴다. 없으면 session 프로젝트가 안내 메시지와 함께 먼저 실패한다.
const savedState = !liveBrowser && fs.existsSync(sessionFile()) ? sessionFile() : undefined;
// 살아 있는 로그인 브라우저 하나에 붙을 때는 탭을 순서대로 여는 편이 안전하다. PW_WORKERS 로 올릴 수 있다.
const workers = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : liveBrowser ? 1 : CI ? 2 : 4;
/** 사내 PC 처럼 브라우저 다운로드가 막힌 곳에서는 PW_CHANNEL=msedge(또는 chrome) 로 설치된 브라우저를 쓴다. */
const channel = process.env.PW_CHANNEL || undefined;

/**
 * 프로젝트
 *  - unit         브라우저 없이 도는 모듈 테스트 (파서, diff, 시나리오 로더)
 *  - auth-public  로그인 전 공개 화면. 세션 불필요 → 클라우드/GitHub 러너에서도 실행 가능
 *  - session      로그인 세션 확인 (smoke/regression 의 선행 조건). PW_CDP_URL 이 있으면 살아 있는 로그인 브라우저에,
 *                 없으면 recordings/session-<SESSION>.json 으로 새 브라우저에 들어가 본다
 *  - smoke        화면 진입 스모크 (URL 직접 진입 + title/text 단언). tests/smoke 는 생성물
 *  - regression   Jev 트레이스에서 변환한 회귀 spec
 *
 * destructive 태그(과금 리소스 생성/삭제)는 RUN_DESTRUCTIVE=1 일 때만 포함된다.
 */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  grepInvert: runDestructive ? undefined : /@destructive/,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/report.json' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: CONSOLE_URL,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1440, height: 900 },
    channel,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'unit', testDir: 'tests/unit' },
    {
      name: 'auth-public',
      testDir: 'tests/auth',
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
    },
    { name: 'session', testDir: 'tests/setup', testMatch: /session\.setup\.ts/ },
    {
      name: 'smoke',
      testDir: 'tests/smoke',
      dependencies: ['session'],
      use: { ...devices['Desktop Chrome'], storageState: savedState },
    },
    {
      name: 'regression',
      testDir: 'tests/regression',
      dependencies: ['session'],
      use: { ...devices['Desktop Chrome'], storageState: savedState },
    },
  ],
});
