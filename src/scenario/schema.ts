/**
 * scenarios/**\/*.yaml 로더. 형식은 scenarios/_FORMAT.md 참조.
 * expect 는 코드로 판정 가능한 것만 허용한다: url(부분 일치) / title(정확히) / text / not_text / count.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface Expectation {
  url?: string;
  title?: string;
  text?: string[];
  not_text?: string[];
  /** 예: { "table row": ">=1" } → getByRole('row') 개수 */
  count?: Record<string, string>;
}

export interface Step {
  goal: string;
  vars?: Record<string, string>;
  expect?: Expectation;
}

export interface Precondition {
  session?: 'root' | 'iam' | 'none';
  region?: string;
  language?: string;
  cleanup?: boolean;
}

export interface LinkCheck {
  text: string;
  href: string;
}

export interface Scenario {
  id: string;
  title: string;
  service: string;
  category?: string;
  tags: string[];
  precondition: Precondition;
  steps: Step[];
  teardown: Step[];
  links: LinkCheck[];
  /** 저장소 루트 기준 상대 경로 */
  file: string;
}

const cache = new Map<string, Scenario>();

export function loadScenario(file: string): Scenario {
  const abs = path.resolve(process.cwd(), file);
  const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
  const cached = cache.get(rel);
  if (cached) return cached;
  const raw: unknown = parseYaml(fs.readFileSync(abs, 'utf8'));
  const scenario = validateScenario(raw, rel);
  cache.set(rel, scenario);
  return scenario;
}

export function loadScenarios(dir: string): Scenario[] {
  const abs = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => /\.ya?ml$/.test(f) && !f.startsWith('_'))
    .sort()
    .map((f) => loadScenario(path.join(dir, f)));
}

export function validateScenario(raw: unknown, file: string): Scenario {
  const fail = (msg: string): never => {
    throw new Error(`${file}: ${msg}`);
  };
  if (!isRecord(raw)) return fail('최상위가 객체가 아닙니다');
  const id = str(raw.id) ?? fail('id 가 없습니다');
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(id)) fail(`id 형식 오류: ${id}`);
  const title = str(raw.title) ?? fail('title 이 없습니다');
  const service = str(raw.service) ?? fail('service 가 없습니다');
  const tags = strList(raw.tags, 'tags', fail);
  const steps = stepList(raw.steps, 'steps', fail);
  if (steps.length === 0) fail('steps 가 비어 있습니다');
  const precondition = isRecord(raw.precondition) ? (raw.precondition as Precondition) : {};
  if (precondition.session && !['root', 'iam', 'none'].includes(precondition.session)) {
    fail(`precondition.session 값 오류: ${String(precondition.session)}`);
  }
  const links: LinkCheck[] = [];
  if (raw.links !== undefined) {
    if (!Array.isArray(raw.links)) fail('links 는 배열이어야 합니다');
    for (const l of raw.links as unknown[]) {
      const rec = isRecord(l) ? l : fail('links 항목은 객체여야 합니다');
      const text = str(rec.text);
      const href = str(rec.href);
      if (!text || !href) fail('links 항목에는 text 와 href 가 필요합니다');
      links.push({ text: text!, href: href! });
    }
  }
  return {
    id,
    title,
    service,
    category: str(raw.category),
    tags,
    precondition,
    steps,
    teardown: raw.teardown === undefined ? [] : stepList(raw.teardown, 'teardown', fail),
    links,
    file,
  };
}

function stepList(value: unknown, field: string, fail: (m: string) => never): Step[] {
  if (!Array.isArray(value)) return fail(`${field} 는 배열이어야 합니다`);
  return value.map((s: unknown, i: number) => {
    if (!isRecord(s)) return fail(`${field}[${i}] 가 객체가 아닙니다`);
    const goal = str(s.goal) ?? fail(`${field}[${i}].goal 이 없습니다`);
    const step: Step = { goal };
    if (s.vars !== undefined) {
      if (!isRecord(s.vars)) fail(`${field}[${i}].vars 는 객체여야 합니다`);
      step.vars = Object.fromEntries(Object.entries(s.vars).map(([k, v]) => [k, String(v)]));
    }
    if (s.expect !== undefined) {
      if (!isRecord(s.expect)) fail(`${field}[${i}].expect 는 객체여야 합니다`);
      const e = s.expect;
      const known = new Set(['url', 'title', 'text', 'not_text', 'count']);
      for (const k of Object.keys(e))
        if (!known.has(k))
          fail(
            `${field}[${i}].expect.${k} 는 지원하지 않는 기대값입니다 (url/title/text/not_text/count 만 가능)`,
          );
      const expect: Expectation = {};
      if (e.url !== undefined)
        expect.url = str(e.url) ?? fail(`${field}[${i}].expect.url 은 문자열이어야 합니다`);
      if (e.title !== undefined)
        expect.title = str(e.title) ?? fail(`${field}[${i}].expect.title 은 문자열이어야 합니다`);
      if (e.text !== undefined) expect.text = strList(e.text, `${field}[${i}].expect.text`, fail);
      if (e.not_text !== undefined)
        expect.not_text = strList(e.not_text, `${field}[${i}].expect.not_text`, fail);
      if (e.count !== undefined) {
        if (!isRecord(e.count)) fail(`${field}[${i}].expect.count 는 객체여야 합니다`);
        expect.count = {};
        for (const [k, v] of Object.entries(e.count)) {
          const cond = String(v).trim();
          if (!/^(>=|<=|==|=|>|<)?\s*\d+$/.test(cond))
            fail(`${field}[${i}].expect.count["${k}"] 형식 오류: ${cond}`);
          expect.count[k] = cond;
        }
      }
      step.expect = expect;
    }
    return step;
  });
}

// ---------------------------------------------------------------------------
// 변수 치환: {{run_id}} 는 실행마다 고유, 나머지는 step.vars 에서.
// ---------------------------------------------------------------------------

/** 리소스 이름에 안전한 짧은 실행 ID (소문자·숫자·하이픈). 예: 0921-1305-k3f9 */
export function newRunId(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').slice(0, 4);
  return `${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}-${rand}`;
}

export function resolveVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key: string) => {
    const v = vars[key];
    if (v === undefined) throw new Error(`정의되지 않은 변수 {{${key}}} (템플릿: ${template})`);
    return v;
  });
}

/** 시나리오 전체의 vars 를 run_id 기준으로 한 번에 풀어 돌려준다 (teardown 이 같은 이름을 참조할 수 있게). */
export function scenarioVars(scenario: Scenario, runId = newRunId()): Record<string, string> {
  const vars: Record<string, string> = { run_id: runId };
  for (const step of [...scenario.steps, ...scenario.teardown]) {
    for (const [k, v] of Object.entries(step.vars ?? {})) vars[k] = resolveVars(v, vars);
  }
  return vars;
}

export function resolveExpectation(exp: Expectation | undefined, vars: Record<string, string>): Expectation {
  if (!exp) return {};
  const r = (s: string) => resolveVars(s, vars);
  const out: Expectation = {};
  if (exp.url !== undefined) out.url = r(exp.url);
  if (exp.title !== undefined) out.title = r(exp.title);
  if (exp.text) out.text = exp.text.map(r);
  if (exp.not_text) out.not_text = exp.not_text.map(r);
  if (exp.count) out.count = exp.count;
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined;
}

function strList(v: unknown, field: string, fail: (m: string) => never): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return fail(`${field} 는 배열이어야 합니다`);
  return v.map((x: unknown) => {
    const s = str(x);
    if (s === undefined) fail(`${field} 항목이 비어 있거나 문자열이 아닙니다`);
    return s!;
  });
}
