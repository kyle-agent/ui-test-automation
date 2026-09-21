// 자동 생성: scripts/gen-smoke-specs.ts ← scenarios/smoke/networking--dns.yaml
// 직접 수정하지 말고 YAML 을 고친 뒤 npm run gen:smoke-specs 를 다시 실행할 것.
import { test } from '../../src/fixtures/test';
import { runSmokeStep } from '../../src/console/smoke';

const SCENARIO = "scenarios/smoke/networking--dns.yaml";

test.describe("DNS 화면 진입 스모크 (읽기 전용)", { tag: ["@smoke", "@readonly", "@generated"] }, () => {
  test("모든 서비스에서 Networking > DNS 를 열어 서비스에 진입한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 0);
  });
  test("좌측 메뉴에서 Private DNS 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 1);
  });
  test("좌측 메뉴에서 Hosted Zone 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 2);
  });
  test("좌측 메뉴에서 Public Domain Name 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 3);
  });
});
