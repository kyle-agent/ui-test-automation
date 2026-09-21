// 자동 생성: scripts/gen-smoke-specs.ts ← scenarios/smoke/container--kubernetes-engine.yaml
// 직접 수정하지 말고 YAML 을 고친 뒤 npm run gen:smoke-specs 를 다시 실행할 것.
import { test } from '../../src/fixtures/test';
import { runSmokeStep } from '../../src/console/smoke';

const SCENARIO = "scenarios/smoke/container--kubernetes-engine.yaml";

test.describe("Kubernetes Engine 화면 진입 스모크 (읽기 전용)", { tag: ["@smoke", "@readonly", "@generated"] }, () => {
  test("모든 서비스에서 Container > Kubernetes Engine 를 열어 서비스에 진입한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 0);
  });
  test("좌측 메뉴에서 클러스터 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 1);
  });
  test("좌측 메뉴에서 노드 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 2);
  });
  test("좌측 메뉴에서 네임스페이스 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 3);
  });
  test("좌측 메뉴에서 워크로드 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 4);
  });
  test("좌측 메뉴에서 서비스 및 인그레스 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 5);
  });
  test("좌측 메뉴에서 스토리지 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 6);
  });
  test("좌측 메뉴에서 구성 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 7);
  });
  test("좌측 메뉴에서 권한 을(를) 클릭한다", async ({ page }, testInfo) => {
    await runSmokeStep(page, testInfo, SCENARIO, 8);
  });
});
