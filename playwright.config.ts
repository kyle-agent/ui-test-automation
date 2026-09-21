import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { CONSOLE_URL, sessionFile } from './src/console/env';

const CI = !!process.env.CI;
const runDestructive = process.env.RUN_DESTRUCTIVE === '1';
const workers = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : CI ? 2 : 4;

/**
 * 프로젝트
 *  - unit         브라우저 없이 도는 모듈 테스트 (파서, diff, 시나리오 로더)
 *  - auth-public  로그인 전 공개 화면. 세션 불필요 → 클라우드/GitHub 러너에서도 실행 가능
 *  - session      recordings/session-<SESSION>.json 이 있고 아직 유효한지 확인 (smoke/regression 의 선행 조건)
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
      use: { ...devices['Desktop Chrome'], storageState: sessionFile() },
    },
    {
      name: 'regression',
      testDir: 'tests/regression',
      dependencies: ['session'],
      use: { ...devices['Desktop Chrome'], storageState: sessionFile() },
    },
  ],
});
