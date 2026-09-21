/**
 * 화면 진입 스모크 한 step 실행: 시나리오 YAML 의 expect.url 로 직접 진입 → url/title/text/not_text 판정.
 * Jev 없이 결정적으로 돈다. tests/smoke/*.spec.ts 는 scripts/gen-smoke-specs.ts 가 생성한다.
 */
import type { Page, TestInfo } from '@playwright/test';
import { loadScenario } from '../scenario/schema';
import { expectStep, gotoRoute } from './expect';

export async function runSmokeStep(
  page: Page,
  testInfo: TestInfo,
  scenarioFile: string,
  stepIndex: number,
): Promise<void> {
  const scenario = loadScenario(scenarioFile);
  const step = scenario.steps[stepIndex];
  if (!step)
    throw new Error(
      `${scenarioFile}: step ${stepIndex} 가 없습니다. npm run gen:smoke-specs 로 spec 을 다시 생성하세요.`,
    );
  testInfo.annotations.push(
    { type: 'scenario', description: scenario.id },
    { type: 'step', description: String(stepIndex) },
  );
  const route = step.expect?.url;
  if (!route)
    throw new Error(`${scenarioFile}: step ${stepIndex} 에 expect.url 이 없어 직접 진입할 수 없습니다`);
  await gotoRoute(page, route);
  await expectStep(page, step.expect ?? {}, { route, scenario: scenario.id, step: stepIndex, testInfo });
}
