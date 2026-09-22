import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  LOADER_SELECTOR,
  NOTICE_SELECTOR,
  dismissNotices,
  settleConsole,
  waitForIdle,
} from '../../src/console/overlays';
import { READ_STATE } from '../../src/jev/browser';
import type { PageState } from '../../src/jev/decide';
import { hasElements } from '../../src/jev/recorder';

const fixture = (query: string) =>
  'file:///' + path.resolve(process.cwd(), 'tests/fixtures/fake-vpc.html').replace(/\\/g, '/') + query;

test.describe('콘솔 셸 오버레이', () => {
  test('로딩 오버레이가 떠 있는 동안 snapshot 은 요소를 0개로 본다', async ({ page }) => {
    await page.goto(fixture('?shell=loader#/vpc/vpc/list'));
    const state = (await page.evaluate(READ_STATE)) as PageState;
    expect(hasElements(state)).toBe(false);
    expect(await waitForIdle(page, 5_000)).toBe(true);
    await expect(page.locator(LOADER_SELECTOR)).toHaveCount(0);
    const after = (await page.evaluate(READ_STATE)) as PageState;
    expect(hasElements(after)).toBe(true);
  });

  test('공지 모달은 닫기 아이콘으로 닫고 개수를 돌려준다', async ({ page }) => {
    await page.goto(fixture('?shell=notice#/vpc/vpc/list'));
    await expect(page.locator(NOTICE_SELECTOR)).toBeVisible();
    expect(await dismissNotices(page)).toBe(1);
    await expect(page.locator(NOTICE_SELECTOR)).toHaveCount(0);
    expect(await dismissNotices(page)).toBe(0);
  });

  test('settleConsole 은 로딩을 기다린 뒤 공지를 닫는다', async ({ page }) => {
    await page.goto(fixture('?shell=loader,notice#/vpc/vpc/list'));
    expect(await settleConsole(page, { timeoutMs: 5_000 })).toBe(1);
    await expect(page.locator(LOADER_SELECTOR)).toHaveCount(0);
    await expect(page.locator(NOTICE_SELECTOR)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'VPC 생성' })).toBeVisible();
  });

  test('모달이 덮고 있는 뒤쪽 요소는 관측 후보에서 빠진다 (실행 hit-test 와 같은 기준)', async ({ page }) => {
    await page.goto(fixture('?shell=notice#/vpc/vpc/list'));
    const state = (await page.evaluate(READ_STATE)) as PageState & { occluded: number };
    const labels = state.actions.map((a) => a.label);
    expect(labels).toContain('확인');
    expect(labels).not.toContain('VPC 생성');
    expect(state.occluded).toBeGreaterThan(0);
    await dismissNotices(page);
    const after = (await page.evaluate(READ_STATE)) as PageState & { occluded: number };
    expect(after.actions.map((a) => a.label)).toContain('VPC 생성');
    expect(after.occluded).toBe(0);
  });

  test('오버레이가 없는 페이지에서는 바로 돌아온다', async ({ page }) => {
    await page.goto(fixture('#/vpc/vpc/list'));
    const start = Date.now();
    expect(await settleConsole(page)).toBe(0);
    expect(Date.now() - start).toBeLessThan(3_000);
  });
});
