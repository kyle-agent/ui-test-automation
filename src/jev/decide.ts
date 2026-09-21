/**
 * Jev(TypeSafe 결정 모델) 호출부. 저장소에서 LLM 을 부르는 곳은 이 파일뿐이다.
 *
 * browser-use/jev-ultrafast 의 model.py(MIT) 를 TypeScript 로 옮기고:
 *  - 기본 엔드포인트를 OpenRouter decisions API 로, 키는 TYPESAFE_API_KEY → OPENROUTER_API_KEY 순으로 쓴다.
 *  - criteria/instructions 는 항상 문자열로 보낸다 (OpenRouter 가 구조체를 거부한다).
 * 모델 출력은 관측된 요소 인덱스와 동작 이름으로만 해석한다. 셀렉터·좌표·코드는 절대 모델에서 받지 않는다.
 */
import { spawnSync } from 'node:child_process';
import { EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch, type Dispatcher } from 'undici';
import { NEXT_ACTION, TARGET, TEXT_VALUE } from './questions';

export const DEFAULT_DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';
export const DEFAULT_MODEL = 'typesafe/jev-1.13';

export type ActionKind = 'click' | 'fill' | 'select' | 'scroll' | 'wait';

/** snapshot.js 가 만든 관측 동작 하나. node 는 페이지 안 요소 캐시의 정수 id. */
export interface ObservedAction {
  id: string;
  kind: ActionKind;
  node?: number;
  role?: string;
  label: string;
  value?: string;
  current_value?: string;
  checked?: string;
  selected?: string;
  expanded?: string;
  rect?: { x: number; y: number; w: number; h: number };
  delta?: number;
  pointer?: boolean;
  /** 요소가 있는 프레임 인덱스 (0 = 메인). browser.ts 가 채운다 */
  frame?: number;
}

export interface PageState {
  url: string;
  title: string;
  w: number;
  h: number;
  text: string;
  scroll: { y: number; height: number };
  actions: ObservedAction[];
  marker: unknown;
  page_key: unknown;
  guards: Record<string, unknown>;
  omitted_actions: number;
  fingerprint: string;
  /** 관측에 포함된 프레임 (메인 + micro-app iframe) */
  frames?: import('./browser').FrameInfo[];
}

export interface HistoryEntry {
  action: string;
  kind: ActionKind;
  text: string | null;
  page_changed: boolean | null;
}

export interface Decision {
  choice: string;
  operation: string;
  target: string | null;
  confidence: number;
  probabilities: Record<string, number>;
  operationProbabilities: Record<string, number>;
  targetProbabilities: Record<string, number>;
  rawAnswers: unknown;
  model: string | undefined;
  usage: Record<string, unknown>;
  latencyMs: number;
  request: unknown;
}

type Raw = Record<string, unknown>;

export function decisionKey(): string {
  const key = process.env.TYPESAFE_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key)
    throw new Error(
      'TYPESAFE_API_KEY 또는 OPENROUTER_API_KEY 가 필요합니다 (기록/치유 단계에서만). .env 에 넣으세요.',
    );
  return key;
}

// ---------------------------------------------------------------------------
// HTTP: Node 내장 fetch 는 프록시 환경 변수를 읽지 않는다. undici 로 HTTPS_PROXY(.env 포함) 또는 npm 의 proxy 설정을 따른다.
// TLS 는 Node 설정(NODE_OPTIONS 의 OpenSSL 설정, NODE_USE_SYSTEM_CA, NODE_EXTRA_CA_CERTS)을 그대로 쓴다.
// ---------------------------------------------------------------------------

let dispatcher: Dispatcher | undefined | null = null;
let proxyMode: 'auto' | 'direct' = 'auto';

/** 'direct' 는 환경 변수·npm 프록시를 무시하고 직접 연결한다 (진단용). */
export function setProxyMode(mode: 'auto' | 'direct'): void {
  proxyMode = mode;
  dispatcher = null;
}

function npmProxy(): string | undefined {
  for (const key of ['https-proxy', 'proxy']) {
    try {
      const out = spawnSync(`npm config get ${key}`, {
        shell: true,
        encoding: 'utf8',
        timeout: 15_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const v = (out.stdout ?? '').trim();
      if (v && v !== 'null' && v !== 'undefined') return v;
    } catch {
      /* npm 이 없거나 실패 */
    }
  }
  return undefined;
}

export function proxyDispatcher(): { dispatcher: Dispatcher | undefined; source: string } {
  if (dispatcher !== null) return { dispatcher, source: dispatcherSource };
  if (proxyMode === 'direct') {
    dispatcher = undefined;
    dispatcherSource = '직접 연결 (프록시 무시)';
    return { dispatcher, source: dispatcherSource };
  }
  const env =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (env) {
    dispatcher = new EnvHttpProxyAgent();
    dispatcherSource = `환경 변수 프록시 (${env})`;
  } else {
    const fromNpm = npmProxy();
    dispatcher = fromNpm ? new ProxyAgent(fromNpm) : undefined;
    dispatcherSource = fromNpm ? `npm 설정 프록시 (${fromNpm})` : '직접 연결';
  }
  return { dispatcher, source: dispatcherSource };
}
let dispatcherSource = '';

export async function postJson(url: string, key: string, body: unknown): Promise<Raw> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      const { dispatcher: d } = proxyDispatcher();
      response = await undiciFetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
        ...(d ? { dispatcher: d } : {}),
      });
    } catch (err) {
      const cause = (err as { cause?: { code?: string; message?: string } }).cause;
      const why = cause?.code
        ? `${cause.code}${cause.message ? `: ${cause.message}` : ''}`
        : err instanceof Error
          ? err.message
          : String(err);
      throw new Error(
        `모델 연결 실패 (${why}; 경로: ${proxyDispatcher().source}); 동작을 실행하지 않았습니다. ` +
          `인증서 오류면 docs/windows-node-proxy.md 의 NODE_OPTIONS/NODE_USE_SYSTEM_CA, 연결/DNS 오류면 .env 에 HTTPS_PROXY=http://프록시:포트 를 넣으세요.`,
      );
    }
    if ([429, 503, 529].includes(response.status) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    if (!response.ok) {
      let detail = '';
      try {
        const j = (await response.json()) as { error?: { message?: string } };
        if (j.error?.message) detail = `: ${j.error.message.slice(0, 300)}`;
      } catch {
        /* 본문 없음 */
      }
      throw new Error(`모델 제공자 HTTP ${response.status}${detail}; 동작을 실행하지 않았습니다.`);
    }
    return (await response.json()) as Raw;
  }
  throw new Error('모델을 사용할 수 없습니다.');
}

/** criteria 값과 instructions 는 문자열로 보낸다. 구조체는 JSON 으로 직렬화한다. */
export function asText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export interface ChoiceAnswer {
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export function validateChoice(answer: unknown, ids: string[]): ChoiceAnswer {
  const a = answer as Partial<ChoiceAnswer> | undefined;
  const probs = a?.probabilities;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
  const valid =
    !!a &&
    typeof a.choice === 'string' &&
    ids.includes(a.choice) &&
    !!probs &&
    Object.keys(probs).length === ids.length &&
    ids.every((id) => id in probs) &&
    Object.values(probs).every(finite) &&
    finite(a.confidence) &&
    Math.abs(Object.values(probs).reduce((s, p) => s + p, 0) - 1) < 0.02 &&
    probs[a.choice]! >= Math.max(...Object.values(probs)) - 1e-6;
  if (!valid) throw new Error('모델 응답이 유효하지 않습니다; 동작을 실행하지 않았습니다.');
  return a as ChoiceAnswer;
}

export interface ActionSpace {
  elements: Raw[];
  targets: Record<string, Record<string, ObservedAction>>;
  controls: Record<string, ObservedAction>;
}

/** 관측 요소당 인덱스 하나. 동작별로 유효한 대상 후보를 따로 만든다. */
export function actionSpace(actions: ObservedAction[]): ActionSpace {
  const elements: Raw[] = [];
  const indices = new Map<number, string>();
  const targets: ActionSpace['targets'] = {};
  const controls: ActionSpace['controls'] = {};
  const operations: Record<string, string> = { click: 'CLICK', fill: 'TYPE_TEXT', select: 'SELECT' };
  for (const action of actions) {
    const operation = operations[action.kind];
    if (!operation) {
      controls[action.id.toUpperCase()] = action;
      continue;
    }
    const node = action.node!;
    if (!indices.has(node)) {
      const index = String(elements.length + 1);
      indices.set(node, index);
      const element: Raw = {};
      for (const k of ['role', 'value', 'checked', 'selected', 'expanded'] as const)
        if (action[k] !== undefined) element[k] = action[k];
      element.index = index;
      element.label = action.label.split(' → ')[0];
      element.operations = [];
      if (action.kind === 'select') {
        element.value = action.current_value ?? '';
        element.options = [];
      }
      elements.push(element);
    }
    const index = indices.get(node)!;
    const group = (targets[operation] ??= {});
    const element = elements[Number(index) - 1]!;
    const ops = element.operations as string[];
    if (!ops.includes(operation)) ops.push(operation);
    let target = index;
    if (action.kind === 'select') {
      const options = element.options as Raw[];
      target = `${index}:${options.length + 1}`;
      options.push({ index: target, label: action.label, value: action.value });
    }
    group[target] = action;
  }
  return { elements, targets, controls };
}

export interface BuiltRequest {
  body: Raw;
  operations: Record<string, string>;
  targets: ActionSpace['targets'];
  controls: ActionSpace['controls'];
}

export function buildRequest(state: PageState, goal: string, history: HistoryEntry[]): BuiltRequest {
  const { elements, targets, controls } = actionSpace(state.actions);
  const labels: Record<string, string> = {
    CLICK: 'Click an element, button, menu option, autocomplete suggestion, or calendar day.',
    TYPE_TEXT:
      'Enter or replace text in an editable field. The value comes from the scenario or a text helper.',
    SELECT: 'Select an observed dropdown value.',
  };
  const operations: Record<string, string> = {};
  for (const key of Object.keys(targets)) operations[key] = labels[key]!;
  for (const [key, value] of Object.entries(controls)) operations[key] = value.label;
  operations.DONE = 'Every requirement is visibly satisfied.';
  operations.BLOCKED = 'No supported operation can progress.';

  const questions: Raw = {
    operation: {
      type: 'choice',
      criteria: Object.fromEntries(Object.entries(operations).map(([k, v]) => [k, asText(v)])),
      instructions: asText({ goal, rules: NEXT_ACTION }),
    },
  };
  for (const [operation, candidates] of Object.entries(targets)) {
    questions[`${operation.toLowerCase()}_target`] = {
      type: 'choice',
      criteria: Object.fromEntries(
        Object.entries(candidates).map(([index, a]) => {
          const c: Raw = {
            element: `[${index}] ${a.label}`,
            current_value: a.current_value ?? a.value ?? '',
          };
          for (const k of ['role', 'checked', 'selected', 'expanded'] as const)
            if (a[k] !== undefined) c[k] = a[k];
          return [index, asText(c)];
        }),
      ),
      instructions: asText({ goal, operation, rules: [NEXT_ACTION, TARGET] }),
    };
  }
  const body: Raw = {
    model: process.env.TYPESAFE_MODEL || DEFAULT_MODEL,
    state: {
      page: { url: state.url, title: state.title, text: state.text },
      elements,
      recent_actions: history
        .slice(-10)
        .map((h) => ({ action: h.action, kind: h.kind, text: h.text, page_changed: h.page_changed })),
    },
    questions,
  };
  return { body, operations, targets, controls };
}

export function interpret(result: Raw, built: BuiltRequest): Omit<Decision, 'latencyMs' | 'request'> {
  const answers = (result.answers ?? {}) as Record<string, unknown>;
  const operationAnswer = validateChoice(answers.operation, Object.keys(built.operations));
  const operation = operationAnswer.choice;
  let target: string | null = null;
  let targetAnswer: ChoiceAnswer | null = null;
  let choice: string;
  let probabilities: Record<string, number> = {};
  if (operation in built.targets) {
    // 선택된 동작의 대상 헤드만 검증한다. 쓰이지 않는 헤드는 동작을 일으킬 수 없다.
    const candidates = built.targets[operation]!;
    targetAnswer = validateChoice(answers[`${operation.toLowerCase()}_target`], Object.keys(candidates));
    target = targetAnswer.choice;
    choice = candidates[target]!.id;
    probabilities = Object.fromEntries(
      Object.entries(candidates).map(([index, a]) => [a.id, targetAnswer!.probabilities[index]!]),
    );
  } else {
    choice = operation in built.controls ? built.controls[operation]!.id : operation;
    probabilities[choice] = operationAnswer.probabilities[operation]!;
  }
  return {
    choice,
    operation,
    target,
    confidence: operationAnswer.confidence,
    probabilities,
    operationProbabilities: operationAnswer.probabilities,
    targetProbabilities: targetAnswer?.probabilities ?? {},
    rawAnswers: result.answers,
    model: typeof result.model === 'string' ? result.model : undefined,
    usage: (result.usage as Raw | undefined) ?? {},
  };
}

export async function choose(state: PageState, goal: string, history: HistoryEntry[]): Promise<Decision> {
  const built = buildRequest(state, goal, history);
  const started = performance.now();
  const url = process.env.TYPESAFE_API_URL || DEFAULT_DECISIONS_URL;
  const result = await postJson(url, decisionKey(), built.body);
  return {
    ...interpret(result, built),
    latencyMs: Math.round(performance.now() - started),
    request: built.body,
  };
}

// ---------------------------------------------------------------------------
// TYPE_TEXT 값: 시나리오 vars 에서 못 정할 때만 소형 텍스트 모델에 "허용 값 중 하나" 를 고르게 한다.
// ---------------------------------------------------------------------------

export interface FieldContext {
  goal: string;
  field: { label: string; role?: string; value?: string };
  page: { title: string; text: string };
  recent_actions: { action: string; text: string | null }[];
  allowed_values?: Record<string, string>;
}

export function fieldContext(
  goal: string,
  action: ObservedAction,
  page: PageState,
  history: HistoryEntry[],
  allowedValues?: Record<string, string>,
): FieldContext {
  const ctx: FieldContext = {
    goal,
    field: { label: action.label, role: action.role, value: action.value },
    page: { title: page.title, text: page.text.slice(0, 6000) },
    recent_actions: history.slice(-6).map((h) => ({ action: h.action, text: h.text })),
  };
  if (allowedValues && Object.keys(allowedValues).length) ctx.allowed_values = allowedValues;
  return ctx;
}

export async function fieldText(
  context: FieldContext,
): Promise<{ value: string; model: string; latencyMs: number; usage: unknown }> {
  const key = process.env.TEXT_MODEL_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key)
    throw new Error(
      'TYPE_TEXT 값을 정할 수 없습니다: step.vars 를 채우거나 TEXT_MODEL_API_KEY 를 설정하세요.',
    );
  const base = (process.env.TEXT_MODEL_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const model = process.env.TEXT_MODEL || 'inception/mercury-2.5';
  const reasoning =
    (process.env.TEXT_MODEL_REASONING ?? 'none') === 'none'
      ? { reasoning: { enabled: false } }
      : { reasoning: { effort: 'low' } };
  const started = performance.now();
  const result = await postJson(`${base}/chat/completions`, key, {
    model,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    ...reasoning,
    messages: [
      { role: 'system', content: TEXT_VALUE },
      { role: 'user', content: JSON.stringify(context) },
    ],
  });
  let value: unknown;
  try {
    const content = (result as { choices: { message: { content: string } }[] }).choices[0]!.message.content;
    const output = JSON.parse(content) as Record<string, unknown>;
    value = output.text;
    if (Object.keys(output).length !== 1 || typeof value !== 'string' || !value.trim() || value.length > 2000)
      throw new Error();
  } catch {
    throw new Error('텍스트 헬퍼가 유효한 값을 주지 않았습니다; 아무것도 입력하지 않았습니다.');
  }
  const allowed = context.allowed_values;
  if (allowed && !Object.values(allowed).includes(value as string)) {
    throw new Error('텍스트 헬퍼가 허용 값 밖의 문자열을 냈습니다; 아무것도 입력하지 않았습니다.');
  }
  return {
    value: value as string,
    model,
    latencyMs: Math.round(performance.now() - started),
    usage: result.usage,
  };
}
