// 자동 생성: scripts/gen-smoke-specs.ts ← scenarios/smoke/networking--cloud-virtual-circuit.yaml
// 직접 수정하지 말고 YAML 을 고친 뒤 npm run gen:smoke-specs 를 다시 실행할 것.
import { test } from '@playwright/test';
import { runSmokeStep } from '../../src/console/smoke';

const SCENARIO = "scenarios/smoke/networking--cloud-virtual-circuit.yaml";

test.describe("Cloud Virtual Circuit 화면 진입 스모크 (읽기 전용)", { tag: ["@smoke", "@readonly", "@generated"] }, () => {
  test("모든 서비스에서 Networking > Cloud Virtual Circuit 를 열어 서비스에 진입한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 0);
  });
});
