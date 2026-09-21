/**
 * Jev 기록 트레이스 → 결정적 Playwright spec 초안.
 *
 *   npm run gen:spec -- recordings/<scenario id>/trace.json [--out tests/regression/<id>.spec.ts]
 *
 * 트레이스의 각 동작을 role/name 기반 로케이터로 바꾸고, step 마다 시나리오 YAML 의 expect 를 코드로 판정한다.
 * 실행 시점의 {{run_id}} 는 spec 이 새로 만든다(리소스 이름이 실행마다 고유). teardown 은 afterEach 에서 돈다.
 * 생성물은 초안이다: 로케이터가 화면 문맥상 모호하면(같은 이름의 요소가 여럿) 사람이 다듬는다.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Descriptor } from '../src/jev/browser';
import type { Trace, TraceAction, TraceStep } from '../src/jev/recorder';
import { loadScenario } from '../src/scenario/schema';
import { parseArgs } from '../src/service-map/io';

const { flags, positional } = parseArgs(process.argv.slice(2));
const traceFile = positional[0];
if (!traceFile)
  throw new Error(
    '사용법: npm run gen:spec -- recordings/<id>/trace.json [--out tests/regression/<id>.spec.ts]',
  );
const trace = JSON.parse(fs.readFileSync(traceFile, 'utf8')) as Trace;
const scenario = loadScenario(trace.file);
const out =
  typeof flags.out === 'string' ? flags.out : path.join('tests/regression', `${scenario.id}.spec.ts`);

const q = (s: string) => JSON.stringify(s);
/** 실행마다 달라지는 값(vars)이 문자열에 들어 있으면 템플릿 리터럴로 바꾼다. */
const templ = (s: string): string => {
  const entries = Object.entries(trace.vars).sort((a, b) => b[1].length - a[1].length);
  let replaced = false;
  let body = s.replace(/[\\`$]/g, (c) => `\\${c}`);
  for (const [k, v] of entries) {
    if (v && body.includes(v)) {
      body = body.split(v).join(`\${vars.${k}}`);
      replaced = true;
    }
  }
  return replaced ? `\`${body}\`` : q(s);
};

function locator(d: Descriptor | null, label: string): string {
  // micro-app 이 iframe 안에 있으면 frameLocator 로 들어간다. shadow DOM 은 Playwright 로케이터가 자동으로 뚫는다.
  const scope = d?.frame?.selector ? `page.frameLocator(${q(d.frame.selector)})` : 'page';
  if (!d) return `${scope}.getByText(${templ(label)}, { exact: true }).filter({ visible: true }).first()`;
  const nth = d.count > 1 && d.nth >= 0 ? `.nth(${d.nth})` : '';
  if (d.role && d.name && !d.pointer)
    return `${scope}.getByRole(${q(d.role)}, { name: ${templ(d.name)}, exact: true })${nth}`;
  if (d.placeholder)
    return `${scope}.getByPlaceholder(${templ(d.placeholder)}).filter({ visible: true }).first()`;
  if (d.fallbackText)
    return `${scope}.getByText(${templ(d.fallbackText)}, { exact: true }).filter({ visible: true }).first()`;
  if (d.id) return `${scope}.locator(${q('#' + d.id)})`;
  return `${scope}.getByText(${templ(label)}, { exact: true }).filter({ visible: true }).first()`;
}

function actionCode(a: TraceAction): string[] {
  const lines: string[] = [];
  const why = ` // Jev p=${a.probability === null ? '-' : a.probability.toFixed(2)}`;
  switch (a.operation) {
    case 'GOTO':
      lines.push(`await gotoRoute(page, ${q(a.label)});`);
      break;
    case 'CLICK':
      lines.push(`await ${locator(a.descriptor, a.label)}.click();${why}`);
      break;
    case 'TYPE_TEXT': {
      const value = a.text_var ? `vars.${a.text_var}` : templ(a.text ?? '');
      lines.push(`await ${locator(a.descriptor, a.label)}.fill(${value});${why}`);
      break;
    }
    case 'SELECT':
      lines.push(`await ${locator(a.descriptor, a.label)}.selectOption(${q(a.select_value ?? '')});${why}`);
      break;
    case 'SCROLL_DOWN':
    case 'SCROLL_UP':
      lines.push(`await page.mouse.wheel(0, ${a.operation === 'SCROLL_UP' ? -560 : 560});`);
      break;
    case 'WAIT':
      lines.push(`await page.waitForTimeout(500);`);
      break;
    default:
      break; // DONE / BLOCKED 는 코드가 아니다
  }
  return lines;
}

function stepCode(s: TraceStep, phase: 'steps' | 'teardown'): string[] {
  const lines: string[] = [];
  lines.push(`await test.step(${q(`${phase}[${s.index}] ${s.goal}`)}, async () => {`);
  const body: string[] = [];
  for (const a of s.actions) body.push(...actionCode(a));
  body.push(
    `await expectStep(page, resolveExpectation(scenario.${phase}[${s.index}]!.expect, vars), { consoleTitle: CONSOLE_CHECKS, scenario: scenario.id, step: ${s.index}, testInfo: test.info() });`,
  );
  lines.push(...body.map((l) => `  ${l}`));
  lines.push('});');
  return lines;
}

const steps = trace.steps.filter((s) => s.phase === 'steps');
const teardown = trace.steps.filter((s) => s.phase === 'teardown');
const notRecorded = [...steps, ...teardown].filter((s) => s.result !== 'passed');
if (notRecorded.length) {
  console.warn(
    `경고: 통과하지 못한 step 이 있어 spec 이 불완전합니다: ${notRecorded.map((s) => `${s.phase}[${s.index}] ${s.result}`).join(', ')}`,
  );
}
const tags = scenario.tags.map((t) => `@${t}`);
const guardText = teardown
  .flatMap((s) => s.expect.not_text ?? [])
  .find((t) => Object.values(trace.vars).some((v) => v && t.includes(v)));

const lines: string[] = [];
lines.push(`// 초안 생성: scripts/trace-to-spec.ts ← ${traceFile} (${trace.recorded_at.slice(0, 16)})`);
lines.push(
  `// 시나리오: ${scenario.file}. 로케이터는 Jev 가 고른 요소의 role/name 에서 왔다. 모호하면 사람이 다듬는다.`,
);
lines.push(`import { test } from '../../src/fixtures/test';`);
lines.push(`import { expectStep, gotoRoute } from '../../src/console/expect';`);
lines.push(`import { visibleText } from '../../src/console/frames';`);
lines.push(`import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';`);
lines.push('');
lines.push(`const scenario = loadScenario(${q(scenario.file)});`);
lines.push(
  `const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined; // 픽스처 실행 시에는 콘솔 제목/SSO 검사를 끈다`,
);
lines.push(`/** 실행마다 고유한 리소스 이름. teardown 과 공유한다. */`);
lines.push(`const vars = scenarioVars(scenario);`);
lines.push('');
lines.push(`test.describe(scenario.title, { tag: [${tags.map(q).join(', ')}] }, () => {`);
lines.push(`  test.describe.configure({ mode: 'serial' });`);
lines.push('');
if (teardown.length) {
  lines.push(`  test.afterEach('정리', async ({ page }) => {`);
  lines.push(
    `    test.info().annotations.push({ type: 'scenario', description: scenario.id }, { type: 'phase', description: 'teardown' });`,
  );
  for (const s of teardown) {
    if (guardText && !s.goto) {
      lines.push(`    // 생성 전에 실패했으면 지울 것이 없다.`);
      lines.push(`    if ((await visibleText(page, ${templ(guardText)}, 3_000)) === null) return;`);
    }
    lines.push(...stepCode(s, 'teardown').map((l) => `    ${l}`));
  }
  lines.push('  });');
  lines.push('');
}
lines.push(`  test(scenario.title, async ({ page }) => {`);
lines.push(
  `    test.info().annotations.push({ type: 'scenario', description: scenario.id }, { type: 'run_id', description: vars.run_id! });`,
);
for (const s of steps) lines.push(...stepCode(s, 'steps').map((l) => `    ${l}`));
lines.push('  });');
lines.push('});');
lines.push('');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'));
try {
  execFileSync(path.join('node_modules', '.bin', 'prettier'), ['--write', out], { stdio: 'ignore' });
} catch {
  /* prettier 가 없어도 spec 은 유효하다 */
}
console.log(
  `spec 초안: ${out} (steps ${steps.length}, teardown ${teardown.length}, 동작 ${trace.totals.actions})`,
);
