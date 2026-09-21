// 자동 생성: scripts/gen-smoke-specs.ts ← scenarios/smoke/financial-management--cost-management.yaml
// 직접 수정하지 말고 YAML 을 고친 뒤 npm run gen:smoke-specs 를 다시 실행할 것.
import { test } from '../../src/fixtures/test';
import { runSmokeStep } from '../../src/console/smoke';

const SCENARIO = "scenarios/smoke/financial-management--cost-management.yaml";

test.describe("Cost Management 화면 진입 스모크 (읽기 전용)", { tag: ["@smoke", "@readonly", "@generated"] }, () => {
  test("모든 서비스에서 Financial Management > Cost Management 를 열어 서비스에 진입한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 0);
  });
  test("좌측 메뉴에서 이용 및 청구 내역 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 1);
  });
  test("좌측 메뉴에서 납부 내역 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 2);
  });
  test("좌측 메뉴에서 Cost Navigator 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 3);
  });
  test("좌측 메뉴에서 빌링 태그 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 4);
  });
  test("좌측 메뉴에서 Credit 관리 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 5);
  });
  test("좌측 메뉴에서 예산 관리 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 6);
  });
  test("좌측 메뉴에서 Cost Savings 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 7);
  });
  test("좌측 메뉴에서 Account 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 8);
  });
  test("좌측 메뉴에서 결제 관리 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 9);
  });
  test("좌측 메뉴에서 탄소 배출량 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 10);
  });
  test("좌측 메뉴에서 EDP Report 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 11);
  });
  test("좌측 메뉴에서 레거시 페이지 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 12);
  });
});
