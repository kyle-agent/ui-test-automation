/**
 * 기록 러너의 핵심 루프: 관측 → Jev 가 고름 → 코드가 실행 → 코드가 expect 판정.
 *
 * 한 step 은 goal 하나와 expect 하나다. 루프는 expect 가 만족될 때까지(또는 예산이 끝날 때까지) 동작을 반복한다.
 * 결과는 trace.json 에 남고, scripts/trace-to-spec.ts 가 이를 결정적 Playwright spec 초안으로 바꾼다.
 *
 * 안전장치
 *  - 삭제/결제/승인 같은 위험 라벨은 goal 이 그 단어를 명시할 때만 후보에 넣는다. 로그아웃은 절대 후보에 넣지 않는다.
 *  - 첫 step 의 goto 에서 얻은 라우트 접두어(예: /vpc) 를 벗어나면 멈춘다.
 *  - 같은 화면에서 세 번 연속 아무 변화가 없으면 멈춘다. step 당 동작 예산이 있다.
 *  - confirm 콜백이 있으면 모든 동작을 사람이 승인한다. TYPE_TEXT 값은 시나리오 vars 에서만 온다(없을 때만 텍스트 모델).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { checkExpectation, describeExpectation } from '../console/expect';
import { hashUrl } from '../console/env';
import { waitForConsole } from '../console/session';
import {
  choose,
  fieldContext,
  fieldText,
  type ActionKind,
  type Decision,
  type HistoryEntry,
  type ObservedAction,
  type PageState,
} from './decide';
import { StalePage, act, describe, observe, settle, type Descriptor } from './browser';
import { DEFAULT_STEP_BUDGET } from './questions';
import {
  resolveExpectation,
  resolveVars,
  scenarioVars,
  type Expectation,
  type Scenario,
  type Step,
} from '../scenario/schema';

export interface TraceAction {
  n: number;
  operation: string;
  kind: ActionKind | 'goto';
  action_id: string | null;
  label: string;
  descriptor: Descriptor | null;
  text: string | null;
  text_var: string | null;
  select_value: string | null;
  url_before: string;
  title_before: string;
  url_after: string;
  title_after: string;
  page_changed: boolean | null;
  probability: number | null;
  confidence: number | null;
  alternatives: Record<string, number>;
  latency_ms: number | null;
  model: string | null;
  cost: number | null;
  screenshot: string | null;
  note?: string;
  /** 결정 시점에 모델에 보낸 요소 표 요약 (진단·spec 다듬기용) */
  observed?: ObservedSummary;
}

export interface ObservedSummary {
  elements: number;
  omitted: number;
  frames: { index: number; url: string; selector: string | null; shadow_hosts: number }[];
  sample: string[];
}

export function summarize(state: PageState, candidates: ObservedAction[]): ObservedSummary {
  const elements = candidates.filter((a) => a.kind !== 'scroll' && a.kind !== 'wait');
  return {
    elements: elements.length,
    omitted: state.omitted_actions,
    frames: (state.frames ?? []).map((f) => ({
      index: f.index,
      url: f.url.slice(0, 120),
      selector: f.selector,
      shadow_hosts: f.shadow_hosts,
    })),
    sample: elements
      .slice(0, 80)
      .map(
        (a) =>
          `[${a.id}] ${a.role ?? a.kind} "${a.label.slice(0, 60)}"${a.frame ? ` (frame ${a.frame})` : ''}`,
      ),
  };
}

export type StepResult = 'passed' | 'failed' | 'blocked' | 'budget' | 'aborted' | 'skipped' | 'error';

export interface TraceStep {
  phase: 'steps' | 'teardown';
  index: number;
  goal: string;
  goal_resolved: string;
  goto: string | null;
  expect: Expectation;
  actions: TraceAction[];
  result: StepResult;
  failures: string[];
  already_satisfied: boolean;
  final_url: string;
  final_title: string;
  started_at: string;
  ended_at: string;
}

export interface Trace {
  scenario: string;
  file: string;
  title: string;
  recorded_at: string;
  run_id: string;
  vars: Record<string, string>;
  base_url: string | null;
  console_checks: boolean;
  steps: TraceStep[];
  totals: { decisions: number; actions: number; cost: number };
  status: 'passed' | 'failed' | 'aborted';
}

export interface ConfirmRequest {
  phase: 'steps' | 'teardown';
  step: Step;
  decision: Decision;
  action: ObservedAction | null;
  text: string | null;
}

export interface RecordOptions {
  scenario: Scenario;
  page: Page;
  outDir: string;
  runId?: string;
  budget?: number;
  /** 실행할 step 인덱스. 없으면 전부 */
  steps?: number[];
  runTeardown?: boolean;
  dryRun?: boolean;
  /** 콘솔이 아닌 페이지(픽스처)에 대해 돌릴 때 base URL. goto 는 `${baseUrl}${hash}` 로 해석된다 */
  baseUrl?: string;
  /** 콘솔 제목 형식·SSO 검사를 할지. 기본 true */
  consoleChecks?: boolean;
  /** 사람이 동작을 승인한다. 'yes' 실행, 'no' 이 후보를 빼고 다시 고름, 'quit' 중단 */
  confirm?: (req: ConfirmRequest) => Promise<'yes' | 'no' | 'quit'>;
  log?: (line: string) => void;
}

const DANGER_GROUPS: RegExp[] = [
  /삭제|delete|remove/i,
  /해지|terminate/i,
  /결제|구매|payment|purchase/i,
  /승인|approve/i,
  /초기화|reset/i,
];
const NEVER = /로그아웃|logout|sign\s?out/i;

export function filterCandidates(actions: ObservedAction[], goal: string): ObservedAction[] {
  return actions.filter((a) => {
    if (a.kind === 'scroll' || a.kind === 'wait') return true;
    if (NEVER.test(a.label)) return false;
    for (const group of DANGER_GROUPS) if (group.test(a.label) && !group.test(goal)) return false;
    return true;
  });
}

const FIELD_HINTS: Record<string, RegExp> = {
  name: /이름|\bname\b/i,
  cidr: /cidr|대역|ip\b/i,
  description: /설명|description|desc/i,
  email: /이메일|email/i,
  password: /비밀번호|password/i,
  search: /검색|search/i,
};

export function pickVarForField(label: string, candidates: Record<string, string>): string | null {
  const keys = Object.keys(candidates);
  if (keys.length === 1) return keys[0]!;
  const l = label.toLowerCase();
  const byKey = keys.filter((k) => l.includes(k.toLowerCase()));
  if (byKey.length === 1) return byKey[0]!;
  const byHint = keys.filter((k) => FIELD_HINTS[k]?.test(label));
  if (byHint.length === 1) return byHint[0]!;
  return null;
}

export async function recordScenario(opts: RecordOptions): Promise<Trace> {
  const { scenario, page } = opts;
  const log = opts.log ?? (() => undefined);
  const budget = opts.budget ?? DEFAULT_STEP_BUDGET;
  const consoleChecks = opts.consoleChecks ?? !opts.baseUrl;
  const vars = scenarioVars(scenario, opts.runId);
  const shotDir = path.join(opts.outDir, 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });
  const trace: Trace = {
    scenario: scenario.id,
    file: scenario.file,
    title: scenario.title,
    recorded_at: new Date().toISOString(),
    run_id: vars.run_id!,
    vars,
    base_url: opts.baseUrl ?? null,
    console_checks: consoleChecks,
    steps: [],
    totals: { decisions: 0, actions: 0, cost: 0 },
    status: 'passed',
  };
  const save = () => {
    fs.mkdirSync(opts.outDir, { recursive: true });
    fs.writeFileSync(path.join(opts.outDir, 'trace.json'), JSON.stringify(trace, null, 2) + '\n');
  };
  const firstGoto = scenario.steps.find((s) => s.goto)?.goto;
  const routePrefix = firstGoto ? '/' + firstGoto.replace(/^#?\//, '').split('/')[0] : null;
  const resolveGoto = (route: string) =>
    opts.baseUrl ? `${opts.baseUrl}#${route.replace(/^#/, '')}` : hashUrl(route);

  let aborted = false;
  const runStep = async (phase: 'steps' | 'teardown', index: number, step: Step): Promise<void> => {
    const goal = resolveVars(step.goal, vars);
    const exp = resolveExpectation(step.expect, vars);
    const record: TraceStep = {
      phase,
      index,
      goal: step.goal,
      goal_resolved: goal,
      goto: step.goto ?? null,
      expect: exp,
      actions: [],
      result: 'failed',
      failures: [],
      already_satisfied: false,
      final_url: '',
      final_title: '',
      started_at: new Date().toISOString(),
      ended_at: '',
    };
    trace.steps.push(record);
    const finish = async (result: StepResult, failures: string[] = []) => {
      record.result = result;
      record.failures = failures;
      record.final_url = page.url();
      record.final_title = await page.title().catch(() => '');
      record.ended_at = new Date().toISOString();
      log(`  → ${result}${failures.length ? `: ${failures.join(' / ')}` : ''}`);
      save();
    };
    log(`\n[${phase} ${index}] ${goal}`);
    log(`  완료 조건: ${describeExpectation(exp)}`);

    if (step.goto) {
      const urlBefore = page.url();
      await page.goto(resolveGoto(step.goto), { waitUntil: 'domcontentloaded' });
      if (consoleChecks && (await waitForConsole(page, 60_000)) === 'expired') {
        record.actions.push(
          traceAction(
            0,
            'GOTO',
            'goto',
            null,
            step.goto,
            null,
            urlBefore,
            '',
            page.url(),
            await page.title(),
            null,
          ),
        );
        await finish('error', ['세션 만료: SSO 로그인 페이지로 이동']);
        aborted = true;
        return;
      }
      record.actions.push(
        traceAction(
          0,
          'GOTO',
          'goto',
          null,
          step.goto,
          null,
          urlBefore,
          '',
          page.url(),
          await page.title(),
          null,
        ),
      );
      const failures = await checkExpectation(page, exp, { consoleTitle: consoleChecks });
      await finish(failures.length ? 'failed' : 'passed', failures);
      return;
    }

    const history: HistoryEntry[] = [];
    const rejected = new Set<string>();
    const jevGoal = `${goal}\n[시나리오: ${scenario.title}${phase === 'teardown' ? ' / 정리 단계' : ''}] [완료 조건: ${describeExpectation(exp)}]`;
    const stepVars: Record<string, string> = {};
    for (const k of Object.keys(step.vars ?? {})) stepVars[k] = vars[k]!;
    let staleStreak = 0;
    for (let n = 0; n < budget; n++) {
      let state: PageState;
      try {
        state = await observe(page);
      } catch (err) {
        await finish('error', [`관측 실패: ${err instanceof Error ? err.message : String(err)}`]);
        return;
      }
      if (routePrefix && consoleChecks) {
        const hash = new URL(state.url).hash.replace(/^#/, '');
        if (hash && !hash.startsWith(routePrefix) && !hash.startsWith('/home')) {
          await finish('blocked', [`허용 라우트(${routePrefix}) 를 벗어남: ${hash}`]);
          return;
        }
      }
      const quick = await checkExpectation(
        page,
        { ...exp, timeout: n === 0 ? 1_000 : 2_500 },
        { consoleTitle: consoleChecks },
      );
      if (quick.length === 0) {
        record.already_satisfied = n === 0;
        await finish('passed');
        return;
      }
      const candidates = filterCandidates(state.actions, goal).filter((a) => !rejected.has(a.id));
      let decision: Decision;
      try {
        decision = await choose({ ...state, actions: candidates }, jevGoal, history);
      } catch (err) {
        await finish('error', [`Jev 호출 실패: ${err instanceof Error ? err.message : String(err)}`]);
        aborted = true;
        return;
      }
      trace.totals.decisions++;
      trace.totals.cost += Number((decision.usage as { cost?: number }).cost ?? 0);
      const action = candidates.find((a) => a.id === decision.choice) ?? null;
      const prob = decision.probabilities[decision.choice] ?? null;
      log(
        `  #${n + 1} Jev: ${decision.operation}${action ? ` [${action.id}] ${action.role ?? action.kind} "${action.label}"` : ''} ` +
          `(p=${prob === null ? '-' : prob.toFixed(2)}, conf=${decision.confidence.toFixed(2)}, ${decision.latencyMs}ms)`,
      );

      const observed = summarize(state, candidates);
      if (decision.operation === 'DONE') {
        const failures = await checkExpectation(page, exp, { consoleTitle: consoleChecks });
        record.actions.push({
          ...traceAction(
            n + 1,
            'DONE',
            'wait',
            null,
            'DONE',
            null,
            state.url,
            state.title,
            page.url(),
            await page.title(),
            decision,
          ),
          observed,
        });
        await finish(failures.length ? 'failed' : 'passed', failures);
        return;
      }
      if (decision.operation === 'BLOCKED' || !action) {
        record.actions.push({
          ...traceAction(
            n + 1,
            'BLOCKED',
            'wait',
            null,
            'BLOCKED',
            null,
            state.url,
            state.title,
            page.url(),
            await page.title(),
            decision,
          ),
          observed,
        });
        log(
          `  관측된 요소 ${observed.elements}개 (프레임 ${observed.frames.length}개${observed.frames.some((f) => f.shadow_hosts) ? ', shadow DOM 있음' : ''}):`,
        );
        for (const line of observed.sample.slice(0, 40)) log(`    ${line}`);
        await finish('blocked', ['Jev 가 진행할 동작이 없다고 판단']);
        return;
      }

      let text: string | null = null;
      let textVar: string | null = null;
      if (action.kind === 'fill') {
        const pool = Object.keys(stepVars).length ? stepVars : vars;
        textVar = pickVarForField(action.label, pool);
        if (textVar) text = pool[textVar]!;
        else {
          try {
            const helper = await fieldText(fieldContext(goal, action, state, history, pool));
            text = helper.value;
            textVar = Object.keys(pool).find((k) => pool[k] === helper.value) ?? null;
            log(`  텍스트 헬퍼(${helper.model}, ${helper.latencyMs}ms) 가 고른 값: ${JSON.stringify(text)}`);
          } catch (err) {
            await finish('blocked', [
              `TYPE_TEXT 값을 정하지 못함 (${action.label}): ${err instanceof Error ? err.message : String(err)}`,
            ]);
            return;
          }
        }
        log(`  입력값: ${JSON.stringify(text)}${textVar ? ` (vars.${textVar})` : ''}`);
      }

      if (opts.confirm) {
        const answer = await opts.confirm({ phase, step, decision, action, text });
        if (answer === 'quit') {
          await finish('aborted', ['사람이 중단']);
          aborted = true;
          return;
        }
        if (answer === 'no') {
          rejected.add(action.id);
          log(`  거부됨: [${action.id}] 을 후보에서 빼고 다시 고른다`);
          n--;
          continue;
        }
      }
      const descriptor = await describe(page, state, action).catch(() => null);
      if (opts.dryRun) {
        record.actions.push(
          traceAction(
            n + 1,
            decision.operation,
            action.kind,
            action,
            action.label,
            descriptor,
            state.url,
            state.title,
            state.url,
            state.title,
            decision,
            text,
            textVar,
            'dry-run: 실행하지 않음',
          ),
        );
        await finish('aborted', ['dry-run']);
        aborted = true;
        return;
      }
      try {
        await act(page, action, state, text);
      } catch (err) {
        if (err instanceof StalePage && staleStreak++ < 3) {
          log(`  페이지가 바뀌어 다시 관측 (${err.message})`);
          n--;
          await page.waitForTimeout(300);
          continue;
        }
        await finish('error', [`실행 실패: ${err instanceof Error ? err.message : String(err)}`]);
        return;
      }
      staleStreak = 0;
      trace.totals.actions++;
      await settle(page, action);
      let after: PageState | null = null;
      try {
        after = await observe(page);
      } catch {
        /* 이동 중이면 다음 루프에서 다시 관측 */
      }
      const pageChanged = after ? after.fingerprint !== state.fingerprint : null;
      const shot = path.join(shotDir, `${phase}-${index}-${String(n + 1).padStart(2, '0')}.jpg`);
      await page.screenshot({ path: shot, type: 'jpeg', quality: 60 }).catch(() => undefined);
      const ta = traceAction(
        n + 1,
        decision.operation,
        action.kind,
        action,
        action.label,
        descriptor,
        state.url,
        state.title,
        page.url(),
        await page.title().catch(() => ''),
        decision,
        text,
        textVar,
      );
      ta.observed = observed;
      ta.page_changed = pageChanged;
      ta.screenshot = path.relative(opts.outDir, shot);
      if (action.kind === 'select') ta.select_value = action.value ?? null;
      record.actions.push(ta);
      history.push({ action: action.label, kind: action.kind, text, page_changed: pageChanged });
      save();
      const last = history.slice(-3);
      if (last.length === 3 && last.every((h) => h.page_changed === false && h.kind !== 'wait')) {
        await finish('blocked', ['세 번 연속 화면 변화 없음']);
        return;
      }
    }
    await finish('budget', [`step 동작 예산(${budget}) 소진`]);
  };

  const wanted = (i: number) => !opts.steps || opts.steps.includes(i);
  for (let i = 0; i < scenario.steps.length && !aborted; i++) {
    if (!wanted(i)) continue;
    await runStep('steps', i, scenario.steps[i]!);
    if (trace.steps[trace.steps.length - 1]!.result !== 'passed') break;
  }
  const stepsPassed = trace.steps.filter((s) => s.phase === 'steps').every((s) => s.result === 'passed');
  if ((opts.runTeardown ?? true) && scenario.teardown.length && !aborted) {
    if (!stepsPassed)
      log('\n정리 단계: 앞 단계가 실패했지만 생성된 리소스가 있을 수 있어 teardown 을 실행한다.');
    for (let i = 0; i < scenario.teardown.length && !aborted; i++)
      await runStep('teardown', i, scenario.teardown[i]!);
  }
  trace.status = aborted ? 'aborted' : trace.steps.every((s) => s.result === 'passed') ? 'passed' : 'failed';
  save();
  return trace;
}

function traceAction(
  n: number,
  operation: string,
  kind: ActionKind | 'goto',
  action: ObservedAction | null,
  label: string,
  descriptor: Descriptor | null,
  urlBefore: string,
  titleBefore: string,
  urlAfter: string,
  titleAfter: string,
  decision: Decision | null,
  text: string | null = null,
  textVar: string | null = null,
  note?: string,
): TraceAction {
  const ta: TraceAction = {
    n,
    operation,
    kind,
    action_id: action?.id ?? null,
    label,
    descriptor,
    text,
    text_var: textVar,
    select_value: null,
    url_before: urlBefore,
    title_before: titleBefore,
    url_after: urlAfter,
    title_after: titleAfter,
    page_changed: null,
    probability: decision && action ? (decision.probabilities[action.id] ?? null) : null,
    confidence: decision?.confidence ?? null,
    alternatives: decision ? topAlternatives(decision.probabilities, action?.id) : {},
    latency_ms: decision?.latencyMs ?? null,
    model: decision?.model ?? null,
    cost: decision ? Number((decision.usage as { cost?: number }).cost ?? 0) : null,
    screenshot: null,
  };
  if (note) ta.note = note;
  return ta;
}

function topAlternatives(probabilities: Record<string, number>, chosen?: string): Record<string, number> {
  return Object.fromEntries(
    Object.entries(probabilities)
      .filter(([id, p]) => id !== chosen && p >= 0.05)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, p]) => [id, Number(p.toFixed(3))]),
  );
}
