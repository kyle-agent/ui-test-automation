/**
 * 서비스 맵(카테고리 > 서비스 > 화면) 모델.
 *
 * 출처는 둘이다.
 *  1. 콘솔 메뉴 API `GET /console/api/product/v1/menus?page=N&size=100` (scripts/menu-snapshot.ts 가 로그인된 브라우저에서 호출)
 *  2. 사람이 평탄화해 둔 service-map/screens.txt (초기 부트스트랩, scripts/menu-import-txt.ts)
 *
 * 두 출처 모두 같은 ScreenMap 으로 정규화하고, 정규화본을 날짜별 스냅샷으로 저장해 diff 한다.
 */

export interface Screen {
  /** 좌측 메뉴에 보이는 화면명 (한국어 UI 기준) */
  name: string;
  /** hash 라우트. 항상 `/` 로 시작하고 `#` 은 뺀다. */
  route: string;
  /** 메뉴 API 가 주는 리소스 종류 (있을 때만) */
  resource_type?: string;
}

export interface Service {
  category: string;
  name: string;
  /** 모든 서비스 화면에서 서비스를 열었을 때의 진입 라우트 */
  route: string;
  screens: Screen[];
}

export interface ScreenMap {
  generated_at: string;
  source: 'menus-api' | 'screens.txt';
  /** 출처가 API 일 때 원본 항목 수 (파서 불일치 탐지용) */
  raw_count?: number;
  services: Service[];
}

// ---------------------------------------------------------------------------
// screens.txt (사람이 읽는 평탄화 형식) ⇄ ScreenMap
//
//   ## 카테고리 > 서비스 | /진입route
//   화면명 | /route (resource_type)
// ---------------------------------------------------------------------------

export function parseScreensTxt(text: string): ScreenMap {
  const services: Service[] = [];
  let current: Service | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      const m = /^## (.+?) > (.+?) \| (\S+)(?: \[folder\])?$/.exec(line);
      if (!m) throw new Error(`screens.txt 서비스 줄 형식 오류: ${line}`);
      current = { category: m[1]!, name: m[2]!, route: normalizeRoute(m[3]!), screens: [] };
      services.push(current);
      continue;
    }
    if (line.startsWith('#')) continue;
    if (!current) throw new Error(`서비스 헤더 앞에 화면 줄이 있습니다: ${line}`);
    const m = /^(.+?) \| (\S+)(?: \(([^)]+)\))?$/.exec(line);
    if (!m) throw new Error(`screens.txt 화면 줄 형식 오류: ${line}`);
    const screen: Screen = { name: m[1]!, route: normalizeRoute(m[2]!) };
    if (m[3]) screen.resource_type = m[3];
    current.screens.push(screen);
  }
  return { generated_at: new Date().toISOString(), source: 'screens.txt', services: sortServices(services) };
}

export function formatScreensTxt(map: ScreenMap, header?: string): string {
  const lines: string[] = [];
  lines.push(
    header ?? `# service-map/screens.json 에서 생성 (${map.generated_at.slice(0, 10)}). 직접 수정하지 말 것.`,
  );
  lines.push('# 형식: "## 카테고리 > 서비스 | 진입 route" 다음 줄부터 "화면명 | route (resource_type)"');
  for (const s of map.services) {
    lines.push(`## ${s.category} > ${s.name} | ${s.route}`);
    for (const sc of s.screens) {
      lines.push(`${sc.name} | ${sc.route}${sc.resource_type ? ` (${sc.resource_type})` : ''}`);
    }
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// 메뉴 API 원본 → ScreenMap
//
// API 항목의 정확한 키 이름은 아직 확인되지 않았다(`service_menu_ko` 가 좌측 메뉴 JSON 문자열이라는 것만 확인).
// 그래서 후보 키 목록으로 관대하게 읽고, 못 읽은 항목은 `unresolved` 로 돌려준다.
// 첫 실제 스냅샷을 받은 뒤 아래 KEYS 를 실제 응답에 맞게 좁힌다.
// ---------------------------------------------------------------------------

export const KEYS = {
  serviceName: [
    'service_name_ko',
    'service_nm_ko',
    'service_name',
    'name_ko',
    'menu_name_ko',
    'name',
    'title',
  ],
  category: [
    'category_name_ko',
    'category_ko',
    'category_name',
    'category',
    'service_category_ko',
    'service_category',
  ],
  serviceRoute: ['service_route', 'route', 'path', 'url', 'link', 'service_url', 'menu_url'],
  menuJson: ['service_menu_ko', 'service_menu', 'menu_ko', 'menu'],
  nodeName: [
    'name_ko',
    'menu_name_ko',
    'menuNameKo',
    'label_ko',
    'name',
    'menu_name',
    'menuName',
    'label',
    'title',
    'text',
  ],
  nodeRoute: ['route', 'path', 'url', 'link', 'to', 'href', 'menu_url', 'menuUrl'],
  nodeChildren: ['children', 'sub_menus', 'subMenus', 'sub_menu', 'subMenu', 'items', 'menus', 'child'],
  resourceType: ['resource_type', 'resourceType', 'resource'],
} as const;

type Raw = Record<string, unknown>;

export interface NormalizeResult {
  map: ScreenMap;
  /** 이름이나 라우트를 못 읽은 원본 항목 (인덱스와 키 목록) */
  unresolved: { index: number; keys: string[]; reason: string }[];
}

export function normalizeMenusApi(items: unknown[], generatedAt = new Date().toISOString()): NormalizeResult {
  const services: Service[] = [];
  const unresolved: NormalizeResult['unresolved'] = [];
  items.forEach((item, index) => {
    if (!isRecord(item)) {
      unresolved.push({ index, keys: [], reason: '객체가 아님' });
      return;
    }
    const name = pickString(item, KEYS.serviceName);
    const category = pickString(item, KEYS.category) ?? '(미분류)';
    const menu = parseMenuJson(pick(item, KEYS.menuJson));
    const nodes = menu ? collectNodes(menu) : [];
    const route = pickString(item, KEYS.serviceRoute) ?? nodes[0]?.route;
    if (!name || !route) {
      unresolved.push({
        index,
        keys: Object.keys(item),
        reason: !name ? '서비스명 키를 찾지 못함' : '진입 라우트를 찾지 못함',
      });
      return;
    }
    services.push({ category, name, route: normalizeRoute(route), screens: nodes });
  });
  return {
    map: {
      generated_at: generatedAt,
      source: 'menus-api',
      raw_count: items.length,
      services: sortServices(services),
    },
    unresolved,
  };
}

function parseMenuJson(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return value ?? null;
}

/** 메뉴 트리를 깊이 우선으로 훑어 (name, route) 를 가진 노드를 화면으로 수집한다. 폴더(라우트 없음)는 자식만 따라간다. */
export function collectNodes(tree: unknown): Screen[] {
  const out: Screen[] = [];
  const seen = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isRecord(node)) return;
    const name = pickString(node, KEYS.nodeName);
    const route = pickString(node, KEYS.nodeRoute);
    if (name && route && isRouteLike(route)) {
      const r = normalizeRoute(route);
      if (!seen.has(r)) {
        seen.add(r);
        const screen: Screen = { name, route: r };
        const rt = pickString(node, KEYS.resourceType);
        if (rt) screen.resource_type = rt;
        out.push(screen);
      }
    }
    for (const key of KEYS.nodeChildren) {
      if (key in node) walk(node[key]);
    }
  };
  walk(tree);
  return out;
}

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

export interface ScreenChange {
  kind: 'added' | 'removed' | 'renamed' | 'route_changed' | 'resource_type_changed';
  before?: Screen;
  after?: Screen;
}

export interface ServiceDiff {
  category: string;
  name: string;
  changes: ScreenChange[];
  /** 서비스 진입 라우트나 카테고리 변경 */
  meta: { field: 'route' | 'category'; before: string; after: string }[];
}

export interface MapDiff {
  added_services: Service[];
  removed_services: Service[];
  changed_services: ServiceDiff[];
  summary: { services_before: number; services_after: number; screens_before: number; screens_after: number };
}

export function diffScreenMaps(before: ScreenMap, after: ScreenMap): MapDiff {
  const byName = (m: ScreenMap) => new Map(m.services.map((s) => [s.name, s] as const));
  const b = byName(before);
  const a = byName(after);
  const diff: MapDiff = {
    added_services: [...a.values()].filter((s) => !b.has(s.name)),
    removed_services: [...b.values()].filter((s) => !a.has(s.name)),
    changed_services: [],
    summary: {
      services_before: before.services.length,
      services_after: after.services.length,
      screens_before: countScreens(before),
      screens_after: countScreens(after),
    },
  };
  for (const [name, sb] of b) {
    const sa = a.get(name);
    if (!sa) continue;
    const sd: ServiceDiff = {
      category: sa.category,
      name,
      changes: diffScreens(sb.screens, sa.screens),
      meta: [],
    };
    if (sb.route !== sa.route) sd.meta.push({ field: 'route', before: sb.route, after: sa.route });
    if (sb.category !== sa.category)
      sd.meta.push({ field: 'category', before: sb.category, after: sa.category });
    if (sd.changes.length || sd.meta.length) diff.changed_services.push(sd);
  }
  return diff;
}

export function diffScreens(before: Screen[], after: Screen[]): ScreenChange[] {
  const changes: ScreenChange[] = [];
  const bByRoute = new Map(before.map((s) => [s.route, s] as const));
  const aByRoute = new Map(after.map((s) => [s.route, s] as const));
  const unmatchedBefore: Screen[] = [];
  for (const sb of before) {
    const sa = aByRoute.get(sb.route);
    if (!sa) {
      unmatchedBefore.push(sb);
      continue;
    }
    if (sa.name !== sb.name) changes.push({ kind: 'renamed', before: sb, after: sa });
    if ((sa.resource_type ?? '') !== (sb.resource_type ?? '')) {
      changes.push({ kind: 'resource_type_changed', before: sb, after: sa });
    }
  }
  const unmatchedAfter = after.filter((s) => !bByRoute.has(s.route));
  // 같은 이름인데 라우트만 바뀐 경우를 추가/삭제 대신 route_changed 로 묶는다.
  for (const sb of unmatchedBefore) {
    const idx = unmatchedAfter.findIndex((s) => s.name === sb.name);
    if (idx >= 0) {
      changes.push({ kind: 'route_changed', before: sb, after: unmatchedAfter[idx] });
      unmatchedAfter.splice(idx, 1);
    } else {
      changes.push({ kind: 'removed', before: sb });
    }
  }
  for (const sa of unmatchedAfter) changes.push({ kind: 'added', after: sa });
  return changes;
}

export function hasChanges(diff: MapDiff): boolean {
  return (
    diff.added_services.length > 0 || diff.removed_services.length > 0 || diff.changed_services.length > 0
  );
}

export function formatDiffMarkdown(diff: MapDiff, labelBefore: string, labelAfter: string): string {
  const s = diff.summary;
  const lines: string[] = [];
  lines.push(`## 메뉴 변경: ${labelBefore} → ${labelAfter}`);
  lines.push('');
  lines.push(
    `서비스 ${s.services_before} → ${s.services_after}, 화면 ${s.screens_before} → ${s.screens_after}`,
  );
  lines.push('');
  if (!hasChanges(diff)) {
    lines.push('변경 없음');
    return lines.join('\n') + '\n';
  }
  for (const sv of diff.added_services) {
    lines.push(`- 서비스 추가: ${sv.category} > ${sv.name} (${sv.route}, 화면 ${sv.screens.length}개)`);
  }
  for (const sv of diff.removed_services) {
    lines.push(`- 서비스 삭제: ${sv.category} > ${sv.name} (${sv.route})`);
  }
  for (const sd of diff.changed_services) {
    lines.push(`- ${sd.category} > ${sd.name}`);
    for (const m of sd.meta) lines.push(`  - 서비스 ${m.field} 변경: ${m.before} → ${m.after}`);
    for (const c of sd.changes) lines.push(`  - ${describeChange(c)}`);
  }
  return lines.join('\n') + '\n';
}

function describeChange(c: ScreenChange): string {
  switch (c.kind) {
    case 'added':
      return `화면 추가: ${c.after!.name} (${c.after!.route})`;
    case 'removed':
      return `화면 삭제: ${c.before!.name} (${c.before!.route})`;
    case 'renamed':
      return `이름 변경: ${c.before!.name} → ${c.after!.name} (${c.after!.route})`;
    case 'route_changed':
      return `경로 변경: ${c.before!.name} ${c.before!.route} → ${c.after!.route}`;
    case 'resource_type_changed':
      return `리소스 타입 변경: ${c.after!.name} ${c.before!.resource_type ?? '-'} → ${c.after!.resource_type ?? '-'}`;
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function normalizeRoute(route: string): string {
  let r = route.trim();
  if (r.startsWith('#')) r = r.slice(1);
  if (!r.startsWith('/')) r = `/${r}`;
  return r.replace(/\/+$/, '') || '/';
}

function isRouteLike(value: string): boolean {
  const v = value.trim();
  return v.startsWith('/') || v.startsWith('#/');
}

export function countScreens(map: ScreenMap): number {
  return map.services.reduce((n, s) => n + s.screens.length, 0);
}

export function sortServices(services: Service[]): Service[] {
  return [...services].sort(
    (x, y) => x.category.localeCompare(y.category, 'en') || x.name.localeCompare(y.name, 'en'),
  );
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick(obj: Raw, keys: readonly string[]): unknown {
  for (const k of keys) if (k in obj && obj[k] !== null && obj[k] !== undefined) return obj[k];
  return undefined;
}

function pickString(obj: Raw, keys: readonly string[]): string | undefined {
  const v = pick(obj, keys);
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
