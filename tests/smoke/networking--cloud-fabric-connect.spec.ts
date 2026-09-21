// 자동 생성: scripts/gen-smoke-specs.ts ← scenarios/smoke/networking--cloud-fabric-connect.yaml
// 직접 수정하지 말고 YAML 을 고친 뒤 npm run gen:smoke-specs 를 다시 실행할 것.
import { test } from '../../src/fixtures/test';
import { runSmokeStep } from '../../src/console/smoke';

const SCENARIO = "scenarios/smoke/networking--cloud-fabric-connect.yaml";

test.describe("Cloud Fabric Connect 화면 진입 스모크 (읽기 전용)", { tag: ["@smoke", "@readonly", "@generated"] }, () => {
  test("모든 서비스에서 Networking > Cloud Fabric Connect 를 열어 서비스에 진입한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 0);
  });
  test("좌측 메뉴에서 Fabric 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 1);
  });
  test("좌측 메뉴에서 Port 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 2);
  });
  test("좌측 메뉴에서 Connection 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 3);
  });
  test("좌측 메뉴에서 Policy 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 4);
  });
});
