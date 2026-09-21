/**
 * scenarios/smoke/*.yaml → tests/smoke/<같은 이름>.spec.ts
 * 스모크는 Jev 기록 없이 expect.url 로 직접 진입하므로 spec 을 결정적으로 생성할 수 있다.
 *
 *   npm run gen:smoke-specs
 *
 * 전체 파이프라인: 메뉴 API → screens.json/screens.txt (menu:snapshot) → YAML (gen:smoke-scenarios) → spec (이 스크립트)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadScenarios } from '../src/scenario/schema';

const SCENARIO_DIR = 'scenarios/smoke';
const OUT_DIR = path.resolve(process.cwd(), 'tests/smoke');

const scenarios = loadScenarios(SCENARIO_DIR);
if (scenarios.length === 0)
  throw new Error(`${SCENARIO_DIR} 에 시나리오가 없습니다. npm run gen:smoke-scenarios 를 먼저 실행하세요.`);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const q = (s: string) => JSON.stringify(s);
let steps = 0;
for (const sc of scenarios) {
  const base = path.basename(sc.file).replace(/\.ya?ml$/, '');
  const tags = sc.tags.map((t) => `@${t}`);
  const lines: string[] = [];
  lines.push(`// 자동 생성: scripts/gen-smoke-specs.ts ← ${sc.file}`);
  lines.push('// 직접 수정하지 말고 YAML 을 고친 뒤 npm run gen:smoke-specs 를 다시 실행할 것.');
  lines.push(`import { test } from '../../src/fixtures/test';`);
  lines.push(`import { runSmokeStep } from '../../src/console/smoke';`);
  lines.push('');
  lines.push(`const SCENARIO = ${q(sc.file)};`);
  lines.push('');
  lines.push(`test.describe(${q(sc.title)}, { tag: [${tags.map(q).join(', ')}] }, () => {`);
  sc.steps.forEach((step, i) => {
    if (!step.expect?.url) throw new Error(`${sc.file} step ${i}: 스모크 step 에는 expect.url 이 필요합니다`);
    lines.push(`  test(${q(step.goal)}, async ({ page }, testInfo) => {`);
    lines.push(`    await runSmokeStep(page, testInfo, SCENARIO, ${i});`);
    lines.push('  });');
    steps++;
  });
  lines.push('});');
  lines.push('');
  fs.writeFileSync(path.join(OUT_DIR, `${base}.spec.ts`), lines.join('\n'));
}
console.log(`spec ${scenarios.length}개, test ${steps}개 → tests/smoke/`);
