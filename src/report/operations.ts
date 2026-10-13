/**
 * 동작 단위 커버리지: API 자동화 카탈로그의 "쓰기 동작"(생성·삭제·수정·시작·중지·연결·해제 …)을 모수로,
 * 화면 회귀 시나리오가 그중 몇 개를 실제로 해 보는지 센다. 리소스 레벨(coverage.yaml L0–L4)은 L4 에서 포화되므로
 * (예: SKE 클러스터 L4 에 노드 풀 스케일·버전 업그레이드를 더해도 안 보임) 상품마다 "동작 UI x/m · API y/m" 으로 깊이를 견준다.
 *
 * 모수 규칙(isWriteOp) — data/ui-operations.yaml 머리말과 같다:
 *   쓰기 동작 = HTTP 메서드가 POST·PUT·PATCH·DELETE 이고, 이름(서비스 접두어를 뗀 것, 예 mysqllistclusters → listclusters)이
 *   읽기 동사 list·show·check·get·query·validate·detail·download 로 시작하지 않는 것. GET 은 모두 읽기.
 * 자료:
 *   - data/api-coverage.json 의 services[].ops (scripts/import-api-coverage.ts) — 동작 이름·메서드·API 검증 여부
 *   - data/ui-operations.yaml — 사람이 고치는 대응표: API 서비스 → 동작 이름 → 그 동작을 하는 회귀 spec id
 */
import fs from 'node:fs';
import path from 'node:path';
import { API_CATEGORY, API_SERVICE, type ApiCoverageSnapshot, type ApiOp } from './api-coverage';

export const UI_OPERATIONS_FILE = path.resolve(process.cwd(), 'data', 'ui-operations.yaml');

/** 읽기 동사(이름 앞머리). 이걸로 시작하면 메서드가 POST 여도 읽기로 본다(예 querypolicy, showsecretsmanagersecretvalue) */
export const READ_VERB = /^(list|show|check|get|query|validate|detail|download)/;

/** API_SERVICE 가 null(화면 장부에 없음)이어도 서비스 맵에는 상품이 있는 것 — 동작 지표에서만 쓴다 */
export const OPS_PRODUCT_EXTRA: Record<string, string> = {
  'aimlops-platform': 'AI&MLOps Platform',
  'cloud-ml': 'CloudML',
  'data-flow': 'Data Flow',
  'data-ops': 'Data Ops',
  'quick-query': 'Quick Query',
  billingplan: 'Planned Compute',
  budget: 'Cost Management',
  costexplorer: 'Cost Management',
  costnavigator: 'Cost Management',
  pricing: 'Cost Management',
  cloudcontrol: 'Cloud Control',
  cloudmonitoring: 'Cloud Monitoring',
  'network-logging': 'Network Logging',
  quota: 'Quota Service',
  resourceoptimizer: 'Resource Optimizer',
  servicewatch: 'ServiceWatch',
  support: 'Support Center',
};

/** API 서비스 slug → 화면 상품 이름(동작 지표용). 대응 상품이 없으면 null */
export function opsProductOf(service: string): string | null {
  return API_SERVICE[service] ?? OPS_PRODUCT_EXTRA[service] ?? null;
}

/** 쓰기 동작인가 (모수 규칙, 파일 머리말 참고) */
export function isWriteOp(service: string, op: Pick<ApiOp, 'name' | 'method'>): boolean {
  if (op.method.toUpperCase() === 'GET') return false;
  const prefix = service.replace(/-/g, '');
  const verb =
    op.name.startsWith(prefix) && op.name.length > prefix.length ? op.name.slice(prefix.length) : op.name;
  return !READ_VERB.test(verb);
}

export interface UiOpMapping {
  specs: string[];
  /** 줄 주석에 "확인 필요" 가 있으면 true */
  uncertain: boolean;
}

/** 서비스 slug → 동작 이름 → 대응 */
export type UiOperations = Map<string, Map<string, UiOpMapping>>;

/**
 * data/ui-operations.yaml 파서(사람이 고치기 쉬운 부분 YAML, 주석 유지 목적의 줄 단위):
 *   ske:                                   ← 서비스 slug (들여쓰기 0)
 *     createcluster: container.ske-cluster ← 동작: spec id 쉼표 구분 (들여쓰기 있음)
 *     setnodepool: a.b, c.d  # 확인 필요   ← "확인 필요" 주석이면 불확실 표시
 * spec 이 비어 있으면(동작: 만 쓰면) 무시한다. 같은 동작이 두 번 나오면 spec 을 합친다.
 */
export function parseUiOperations(text: string): UiOperations {
  const out: UiOperations = new Map();
  let cur: Map<string, UiOpMapping> | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const hash = raw.indexOf('#');
    const line = hash >= 0 ? raw.slice(0, hash) : raw;
    const comment = hash >= 0 ? raw.slice(hash) : '';
    if (!line.trim()) continue;
    const sec = line.match(/^([a-z0-9][a-z0-9-]*):\s*$/);
    if (sec) {
      cur = out.get(sec[1]!) ?? new Map();
      out.set(sec[1]!, cur);
      continue;
    }
    const op = line.match(/^\s+([a-z0-9]+):\s*(.*?)\s*$/);
    if (!op || !cur) continue;
    const specs = op[2]!
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    if (!specs.length) continue;
    const prev = cur.get(op[1]!);
    cur.set(op[1]!, {
      specs: [...new Set([...(prev?.specs ?? []), ...specs])],
      uncertain: (prev?.uncertain ?? false) || /확인 필요/.test(comment),
    });
  }
  return out;
}

export function readUiOperations(file = UI_OPERATIONS_FILE): UiOperations {
  return fs.existsSync(file) ? parseUiOperations(fs.readFileSync(file, 'utf8')) : new Map();
}

export interface OpRow {
  service: string;
  name: string;
  method: string;
  api: boolean;
  /** 이 동작을 하는 회귀 spec (없으면 빈 배열) */
  ui: string[];
  uncertain: boolean;
}

export interface ProductOperations {
  product: string;
  category: string;
  services: string[];
  /** 쓰기 동작만 (모수) */
  ops: OpRow[];
  opsTotal: number;
  apiVerified: number;
  uiCovered: number;
  /** 모수 제외 사유 */
  excluded?: string;
}

export interface OperationsSummary {
  products: ProductOperations[];
  /** 대응표에 있지만 카탈로그에 없거나 읽기 동작인 이름("서비스/동작") — 오타·읽기 동작 점검용 */
  unknown: string[];
  /** 대응표에 있지만 스냅샷에 없는 서비스 */
  unknownServices: string[];
  /** 대응표에 적혔지만 회귀 spec 목록(specIds)에 없는 spec id */
  unknownSpecs: string[];
}

/** API 스냅샷(동작 목록) × 대응표 → 상품별 쓰기 동작 커버리지 */
export function productOperations(
  api: ApiCoverageSnapshot | null,
  mapping: UiOperations,
  specIds?: ReadonlySet<string>,
  /** 한 번이라도 통과한 spec. 주면 통과 기록이 없는 spec 은 UI 커버로 세지 않는다(작성만 된 spec 이 숫자를 부풀리지 않게) */
  passedSpecs?: ReadonlySet<string>,
  exclusions: ReadonlyMap<string, string> = new Map(),
): OperationsSummary {
  const byProduct = new Map<string, ProductOperations>();
  const unknown: string[] = [];
  const known = new Set<string>();
  for (const s of api?.services ?? []) {
    known.add(s.service);
    const writes = (s.ops ?? []).filter((o) => isWriteOp(s.service, o));
    const m = mapping.get(s.service) ?? new Map<string, UiOpMapping>();
    const writeNames = new Set(writes.map((o) => o.name));
    for (const name of m.keys()) if (!writeNames.has(name)) unknown.push(`${s.service}/${name}`);
    const product = opsProductOf(s.service);
    if (!product || !writes.length) continue;
    const category = API_CATEGORY[s.category] ?? s.category;
    const p = byProduct.get(product) ?? {
      product,
      category,
      services: [],
      ops: [],
      opsTotal: 0,
      apiVerified: 0,
      uiCovered: 0,
    };
    p.services.push(s.service);
    for (const o of writes) {
      const ui = m.get(o.name);
      p.ops.push({
        service: s.service,
        name: o.name,
        method: o.method,
        api: o.verified,
        ui: (ui?.specs ?? []).filter((id) => !passedSpecs || passedSpecs.has(id)),
        uncertain: ui?.uncertain ?? false,
      });
    }
    p.opsTotal = p.ops.length;
    p.apiVerified = p.ops.filter((o) => o.api).length;
    p.uiCovered = p.ops.filter((o) => o.ui.length).length;
    byProduct.set(product, p);
  }
  for (const p of byProduct.values()) if (exclusions.has(p.product)) p.excluded = exclusions.get(p.product);
  const unknownServices = [...mapping.keys()].filter((s) => !known.has(s));
  const products = [...byProduct.values()].sort(
    (a, b) => a.category.localeCompare(b.category, 'en') || a.product.localeCompare(b.product, 'en'),
  );
  const unknownSpecs = specIds
    ? [...new Set([...mapping.values()].flatMap((m) => [...m.values()].flatMap((x) => x.specs)))]
        .filter((id) => !specIds.has(id))
        .sort()
    : [];
  return { products, unknown: unknown.sort(), unknownServices, unknownSpecs };
}

/** 카테고리별 합계 */
export function operationsByCategory(
  products: readonly ProductOperations[],
): Map<string, { opsTotal: number; apiVerified: number; uiCovered: number }> {
  const m = new Map<string, { opsTotal: number; apiVerified: number; uiCovered: number }>();
  for (const p of products) {
    if (p.excluded) continue;
    const c = m.get(p.category) ?? { opsTotal: 0, apiVerified: 0, uiCovered: 0 };
    c.opsTotal += p.opsTotal;
    c.apiVerified += p.apiVerified;
    c.uiCovered += p.uiCovered;
    m.set(p.category, c);
  }
  return m;
}

// ───────── 콘솔 전용 쓰기 동작 (2026-10-14, 사용자 결정) ─────────
// 화면이 보낸 쓰기 요청(RunRecord.api_writes, 통과한 실행만) 중 API 카탈로그(ops[].path)에 없는 경로.
// 모수 881 에는 넣지 않고 따로 센다 — "API 자동화 대비" 비교 가능성을 지키면서 콘솔에만 있는 동작을 드러낸다.

export interface ConsoleOnlyWrite {
  method: string;
  /** 콘솔 접두어(/console/api/<서비스>)를 뗀 경로. 예 /v1/firewalls/rules/bulk */
  path: string;
  /** 콘솔 경로의 서비스 세그먼트 */
  service: string;
  /** 서비스 → 화면 상품(없으면 서비스 slug 그대로) */
  product: string;
  /** 이 요청을 보낸 spec(통과한 실행 기준) */
  specs: string[];
  /** 마지막으로 본 실행 시작 시각 */
  last_seen: string;
  /**
   * true: 카탈로그 경로의 {…} 자리에 콘솔이 {id} 가 아닌 글자 세그먼트(예 bulk)를 보냈을 때만 맞는다 — 콘솔 전용(일괄 처리 등)일 가능성이 커 목록에 "?" 로 올린다.
   * false: 어떤 카탈로그 경로와도 맞지 않는다.
   */
  loose: boolean;
  /**
   * write: 콘솔 전용 쓰기 동작으로 센다.
   * read-like: 경로에 조회 낱말(search·query·analysis·list·check …)이 있어 POST 로 보내는 조회로 본다(콘솔 홈 예산 위젯 POST /cost-analysis/budget 등). 접힌 목록에만 둔다.
   */
  kind: 'write' | 'read-like';
}

/** POST 지만 조회로 보이는 경로 낱말(세그먼트 어디든). 콘솔은 목록·검색·통계를 POST 로 자주 보낸다 */
export const READ_LIKE_PATH =
  /(search|query|queries|list|analysis|analytics|statistic|summary|summaries|count|check|validat|duplicat|export|download|preview|estimat|price|pricing|usage|history|histories|log|metric|chart|graph|report)/i;

/** `METHOD /console/api/<svc>/v1/…` → { method, service, path }. 콘솔 API 가 아니면 null */
export function splitConsoleWrite(write: string): { method: string; service: string; path: string } | null {
  const m = /^([A-Z]+) \/console\/api\/([^/]+)(\/.*)$/.exec(write);
  return m ? { method: m[1]!, service: m[2]!, path: m[3]! } : null;
}

/**
 * 카탈로그 경로 `/v1/vpcs/{vpc_id}` 와 화면 경로 `/v1/vpcs/{id}` 가 같은가.
 * strict(기본): 카탈로그 {…} 는 콘솔 {id} 와만 맞고 나머지는 글자 그대로. loose: {…} 가 아무 세그먼트와 맞는다(bulk 같은 글자가 id 자리에 온 경우까지).
 */
export function pathMatches(
  catalogPath: string,
  consolePath: string,
  mode: 'strict' | 'loose' = 'strict',
): boolean {
  const a = catalogPath.split('/').filter(Boolean);
  const b = consolePath.split('/').filter(Boolean);
  if (a.length !== b.length) return false;
  const isParam = (seg: string) => /^\{.*\}$/.test(seg);
  return a.every((seg, i) => {
    const c = b[i]!;
    if (isParam(seg)) return mode === 'loose' || isParam(c);
    return seg.toLowerCase() === c.toLowerCase();
  });
}

export function consoleOnlyWrites(
  api: ApiCoverageSnapshot | null,
  records: readonly { spec: string; status: string; started: string; api_writes?: string[] }[],
): ConsoleOnlyWrite[] {
  // 메서드별 카탈로그 경로(읽기 동작 포함 — POST 조회가 카탈로그에 있으면 콘솔 전용이 아니다)
  const byMethod = new Map<string, string[]>();
  for (const s of api?.services ?? [])
    for (const o of s.ops ?? []) {
      if (!o.path) continue;
      const k = o.method.toUpperCase();
      byMethod.set(k, [...(byMethod.get(k) ?? []), o.path]);
    }
  if (!byMethod.size) return [];
  const out = new Map<string, ConsoleOnlyWrite>();
  for (const r of records) {
    if (r.status !== 'pass' || !r.api_writes?.length) continue;
    for (const w of r.api_writes) {
      const c = splitConsoleWrite(w);
      if (!c) continue;
      const candidates = byMethod.get(c.method) ?? [];
      if (candidates.some((p) => pathMatches(p, c.path, 'strict'))) continue;
      const loose = candidates.some((p) => pathMatches(p, c.path, 'loose'));
      const key = `${c.method} ${c.service} ${c.path}`;
      const row =
        out.get(key) ??
        ({
          method: c.method,
          path: c.path,
          service: c.service,
          product: opsProductOf(c.service) ?? c.service,
          specs: [],
          last_seen: r.started,
          loose,
          kind: c.method === 'POST' && READ_LIKE_PATH.test(c.path) ? 'read-like' : 'write',
        } satisfies ConsoleOnlyWrite);
      if (!row.specs.includes(r.spec)) row.specs.push(r.spec);
      if (r.started > row.last_seen) row.last_seen = r.started;
      out.set(key, row);
    }
  }
  return [...out.values()].sort(
    (a, b) =>
      a.product.localeCompare(b.product, 'en') ||
      a.path.localeCompare(b.path) ||
      a.method.localeCompare(b.method),
  );
}
