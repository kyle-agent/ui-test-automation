// 자동 생성: scripts/gen-smoke-specs.ts ← scenarios/smoke/compute--virtual-server-dr.yaml
// 직접 수정하지 말고 YAML 을 고친 뒤 npm run gen:smoke-specs 를 다시 실행할 것.
import { test } from '../../src/fixtures/test';
import { runSmokeStep } from '../../src/console/smoke';

const SCENARIO = "scenarios/smoke/compute--virtual-server-dr.yaml";

test.describe("Virtual Server DR 화면 진입 스모크 (읽기 전용)", { tag: ["@smoke", "@readonly", "@generated"] }, () => {
  test("모든 서비스에서 Compute > Virtual Server DR 를 열어 서비스에 진입한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 0);
  });
});
