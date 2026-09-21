/**
 * scenarios/auth/login-page-smoke.yaml 의 spec. 자격 증명 없이 공개 로그인 페이지만 확인한다.
 * 동작(클릭)은 여기서 코드로 정의하고, 기대값은 YAML 의 steps[i].expect 를 그대로 판정한다.
 *
 * Keycloak 로그인 테마는 버튼이 전부 div 라 getByRole 을 쓸 수 없다. 화면 텍스트(exact)와 안정적인 id 만 쓴다.
 */
import { expect, test, type Page } from '@playwright/test';
import { CONSOLE_BASE_PATH, CONSOLE_URL } from '../../src/console/env';
import { expectStep } from '../../src/console/expect';
import { loadScenario } from '../../src/scenario/schema';

const SCENARIO = 'scenarios/auth/login-page-smoke.yaml';
const scenario = loadScenario(SCENARIO);
const step = (i: number) => scenario.steps[i]!.expect ?? {};

/** 보이는 요소 중 정확히 이 텍스트인 것 (IAM 폼처럼 숨겨진 중복 버튼을 제외한다) */
const visibleText = (page: Page, text: string) =>
  page.getByText(text, { exact: true }).filter({ visible: true }).first();

/** 같은 placeholder 의 입력란이 숨겨진 다음 단계 폼에도 있으므로 보이는 것만 고른다 */
const visibleInput = (page: Page, placeholder: string) =>
  page.getByPlaceholder(placeholder).filter({ visible: true }).first();

async function openLoginPage(page: Page): Promise<void> {
  await page.goto(`${CONSOLE_URL}${CONSOLE_BASE_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/sso\.e\.samsungsdscloud\.com\/realms\/scp/, { timeout: 45_000 });
  await visibleText(page, '다음').waitFor();
}

test.describe(scenario.title, { tag: ['@smoke', '@readonly', '@public'] }, () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'scenario', description: scenario.id });
    await openLoginPage(page);
  });

  test(scenario.steps[0]!.goal, async ({ page }) => {
    await expectStep(page, step(0), { consoleTitle: false });
  });

  test(`${scenario.steps[1]!.goal} → ${scenario.steps[2]!.goal}`, async ({ page }) => {
    await visibleText(page, 'IAM 사용자').click();
    await expect(visibleInput(page, 'Account Id 또는 별칭을 입력하세요.')).toBeVisible();
    await expectStep(page, step(1), { consoleTitle: false });

    await visibleText(page, 'Root 사용자').click();
    await expect(visibleInput(page, '이메일(email@address.com)을 입력하세요.')).toBeVisible();
    await expectStep(page, step(2), { consoleTitle: false });
  });

  test(scenario.steps[3]!.goal, async ({ page }) => {
    const email = visibleInput(page, '이메일(email@address.com)을 입력하세요.');
    await expect(email).toHaveValue('');
    await visibleText(page, '다음').click();
    await page.waitForTimeout(1000); // 이동이 없어야 하므로 잠시 기다린 뒤 판정한다
    await expectStep(page, step(3), { consoleTitle: false });
  });

  test(`${scenario.steps[4]!.goal} → ${scenario.steps[5]!.goal}`, async ({ page }) => {
    // 언어 드롭다운은 지구본 아이콘뿐이라 접근성 이름이 없다. Keycloak 테마의 고정 id 를 쓴다.
    const languageMenu = page.locator('#dropdownMenuButton').locator('xpath=..');
    await languageMenu.click();
    await visibleText(page, 'English').click();
    await expectStep(page, step(4), { consoleTitle: false });

    await languageMenu.click();
    await visibleText(page, '한국어').click();
    await expectStep(page, step(5), { consoleTitle: false });
  });

  test('하단 링크의 href 가 기대 경로를 가리킨다 (클릭하지 않음)', async ({ page }) => {
    for (const link of scenario.links) {
      const anchor = page
        .getByRole('link', { name: link.text, exact: true })
        .filter({ visible: true })
        .first();
      await expect(anchor, `"${link.text}" 링크가 보여야 합니다`).toBeVisible();
      await expect(anchor, `"${link.text}" href 에 ${link.href} 가 포함되어야 합니다`).toHaveAttribute(
        'href',
        new RegExp(link.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      );
    }
  });
});
