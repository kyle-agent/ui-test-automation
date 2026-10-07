/**
 * 커버리지 장부(service-map/coverage.yaml) 모델·검증·요약.
 *
 * 모집단은 서비스 맵(service-map/screens.txt)이다. 그중 "리소스 키가 붙은 목록 화면"(`… | /x/y/list (key)`) 하나가 장부의 한 줄이다.
 * 같은 resource_type 이 여러 서비스에 있으므로(volume·image·keypair·user·group·bucket) 장부의 `key` 는
 *   - 맵 전체에서 유일하면 resource_type 그대로 (예: vpc, subnet)
 *   - 겹치면 `<resource_type>@<서비스 slug>` (예: keypair@virtual-server, volume@gpu-server)
 * 로 만든다. 진짜 식별자는 route 이고, 검증도 route 로 맞춘다.
 *
 * level 의 뜻
 *   0 없음            어떤 spec 도 이 화면을 건드리지 않는다
 *   1 진입(스모크)     화면에 들어가 제목·텍스트만 확인 (scenarios/smoke)
 *   2 CRUD            생성 → 확인 → 삭제(teardown 포함) 를 실제 콘솔에서 통과
 *   3 동작            연결/분리, 시작/중지, 크기 변경처럼 상태를 바꾸는 조작까지 통과
 *   4 통합 의존 체인    다른 리소스와 의존관계를 맺는 스택 시나리오 안에서 통과
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { SCREENS_TXT } from '../service-map/io';
import { parseScreensTxt, slug, type ScreenMap } from '../service-map/screens';

export const COVERAGE_YAML = path.resolve(process.cwd(), 'service-map', 'coverage.yaml');

export type CoverageLevel = 0 | 1 | 2 | 3 | 4;
export const LEVELS: readonly CoverageLevel[] = [0, 1, 2, 3, 4];
export const LEVEL_LABEL: Record<CoverageLevel, string> = {
  0: '없음',
  1: '진입',
  2: 'CRUD',
  3: '동작',
  4: '통합',
};

export interface CoverageEntry {
  key: string;
  service: string;
  category: string;
  route: string;
  level: CoverageLevel;
  specs: string[];
  /** YYYY-MM-DD 또는 null */
  last_pass: string | null;
  note: string;
}

export interface CoverageLedger {
  resources: CoverageEntry[];
}

/** 서비스 맵에서 뽑은 "리소스 키가 있는 목록 화면" 한 줄 (장부의 모집단) */
export interface KeyedListScreen {
  key: string;
  resource_type: string;
  service: string;
  category: string;
  route: string;
  name: string;
}

export interface MapTotals {
  services: number;
  screens: number;
  home_screens: number;
  non_home_screens: number;
  /** 스모크가 진입하는 수: 서비스 진입(서비스 수) + Service Home 이 아닌 화면 */
  smoke_entries: number;
  list_screens: number;
  keyed_list_screens: number;
}

export interface CategorySummary {
  category: string;
  resources: number;
  levels: Record<CoverageLevel, number>;
}

export interface CoverageSummary {
  totals: MapTotals;
  resources: number;
  levels: Record<CoverageLevel, number>;
  at_least_2: number;
  at_least_3: number;
  categories: CategorySummary[];
  /** 모수에서 뺀 리소스(data/population-exclusions.yaml) */
  excluded?: { service: string; resources: number; reason: string }[];
}

// ---------------------------------------------------------------------------
// 서비스 맵 읽기
// ---------------------------------------------------------------------------

/**
 * 작업 트리의 screens.txt 를 읽는다. 서비스가 0개(예: 실패한 menu:snapshot 이 덮어쓴 경우)면 커밋된 버전(git HEAD)으로 대신한다.
 * `file` 을 넘기면 그 파일만 읽는다(폴백 없음).
 */
export function loadServiceMap(file?: string, warn: (line: string) => void = console.error): ScreenMap {
  if (file) return parseScreensTxt(fs.readFileSync(file, 'utf8'));
  if (fs.existsSync(SCREENS_TXT)) {
    const map = parseScreensTxt(fs.readFileSync(SCREENS_TXT, 'utf8'));
    if (map.services.length > 0) return map;
    warn('(경고) service-map/screens.txt 에 서비스가 없어 커밋된 버전(git HEAD)을 대신 읽습니다.');
  }
  const text = execFileSync('git', ['show', 'HEAD:service-map/screens.txt'], { encoding: 'utf8' });
  return parseScreensTxt(text);
}

export function isListRoute(route: string): boolean {
  return /\/list$/.test(route);
}

/** 서비스 맵에서 리소스 키가 붙은 화면을 모두 모아 장부 키를 매긴다 (route 순 정렬).
 *  2026-09-28 까지는 `/list` 로 끝나는 화면만 셌으나(80개) SKE 클러스터(`/ske/cluster`)처럼 키가 있어도 `/list` 가 아닌 화면 32개가 빠져 키 있는 화면 전부(112개)로 넓혔다. */
export function keyedListScreens(map: ScreenMap): KeyedListScreen[] {
  const rows = map.services.flatMap((s) =>
    s.screens
      .filter((sc) => sc.resource_type)
      .map((sc) => ({
        resource_type: sc.resource_type!,
        service: s.name,
        category: s.category,
        route: sc.route,
        name: sc.name,
      })),
  );
  const count = new Map<string, number>();
  for (const r of rows) count.set(r.resource_type, (count.get(r.resource_type) ?? 0) + 1);
  return rows
    .map((r) => ({
      key: (count.get(r.resource_type) ?? 0) > 1 ? `${r.resource_type}@${slug(r.service)}` : r.resource_type,
      ...r,
    }))
    .sort((a, b) => a.route.localeCompare(b.route, 'en'));
}

export function mapTotals(map: ScreenMap): MapTotals {
  const all = map.services.flatMap((s) => s.screens);
  const home = all.filter((sc) => sc.name === 'Service Home').length;
  const list = all.filter((sc) => isListRoute(sc.route));
  return {
    services: map.services.length,
    screens: all.length,
    home_screens: home,
    non_home_screens: all.length - home,
    smoke_entries: map.services.length + (all.length - home),
    list_screens: list.length,
    keyed_list_screens: all.filter((sc) => sc.resource_type).length, // 키 있는 화면 전부 (목록 여부 무관)
  };
}

// ---------------------------------------------------------------------------
// 장부 읽기·검증
// ---------------------------------------------------------------------------

export function parseCoverageYaml(text: string, file = 'coverage.yaml'): CoverageLedger {
  const fail = (msg: string): never => {
    throw new Error(`${file}: ${msg}`);
  };
  const raw: unknown = parseYaml(text);
  if (!isRecord(raw) || !Array.isArray(raw.resources)) return fail('최상위에 resources 배열이 필요합니다');
  const resources = (raw.resources as unknown[]).map((item, i): CoverageEntry => {
    if (!isRecord(item)) return fail(`resources[${i}] 가 객체가 아닙니다`);
    const where = `resources[${i}]${typeof item.key === 'string' ? ` (${item.key})` : ''}`;
    const key = str(item.key) ?? fail(`${where}.key 가 없습니다`);
    const service = str(item.service) ?? fail(`${where}.service 가 없습니다`);
    const category = str(item.category) ?? fail(`${where}.category 가 없습니다`);
    const route = str(item.route) ?? fail(`${where}.route 가 없습니다`);
    const level = item.level;
    if (typeof level !== 'number' || !LEVELS.includes(level as CoverageLevel))
      fail(`${where}.level 은 0~4 정수여야 합니다 (현재: ${String(level)})`);
    const specs = item.specs === undefined || item.specs === null ? [] : item.specs;
    if (!Array.isArray(specs) || specs.some((s) => typeof s !== 'string' || !s.trim()))
      fail(`${where}.specs 는 문자열 배열이어야 합니다`);
    let lastPass: string | null = null;
    if (item.last_pass !== undefined && item.last_pass !== null) {
      const d =
        item.last_pass instanceof Date ? item.last_pass.toISOString().slice(0, 10) : String(item.last_pass);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
        fail(`${where}.last_pass 는 YYYY-MM-DD 또는 null 이어야 합니다 (현재: ${d})`);
      lastPass = d;
    }
    const note = item.note === undefined || item.note === null ? '' : String(item.note);
    return {
      key,
      service,
      category,
      route,
      level: level as CoverageLevel,
      specs: specs as string[],
      last_pass: lastPass,
      note,
    };
  });
  return { resources };
}

export function loadCoverageLedger(file = COVERAGE_YAML): CoverageLedger {
  return parseCoverageYaml(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file));
}

/**
 * 장부와 서비스 맵을 맞춰 본다. 문제가 없으면 빈 배열.
 *  - 맵의 키 있는 목록 화면이 장부에 모두 있어야 하고, 장부에 맵에 없는 route/key 가 있으면 안 된다
 *  - key 는 맵에서 매긴 것과 같아야 한다 (겹치는 resource_type 은 `@서비스` 접미)
 *  - level ≥ 1 이면 spec 이 하나 이상, level ≥ 2 이면 last_pass 가 있어야 한다
 *  - specs 의 id 는 `knownSpecIds` 에 있어야 한다 (tests/regression/<id>.spec.ts 또는 시나리오 id)
 */
export function validateCoverage(
  ledger: CoverageLedger,
  map: ScreenMap,
  knownSpecIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  const expected = keyedListScreens(map);
  const byRoute = new Map(expected.map((e) => [e.route, e] as const));
  const seenRoutes = new Set<string>();
  const seenKeys = new Set<string>();
  for (const e of ledger.resources) {
    if (seenKeys.has(e.key)) errors.push(`key 중복: ${e.key}`);
    seenKeys.add(e.key);
    if (seenRoutes.has(e.route)) errors.push(`route 중복: ${e.route}`);
    seenRoutes.add(e.route);
    const m = byRoute.get(e.route);
    if (!m) {
      errors.push(`${e.key}: 서비스 맵에 없는 목록 화면 route 입니다 (${e.route})`);
      continue;
    }
    if (m.key !== e.key) errors.push(`${e.key}: 서비스 맵 기준 key 는 ${m.key} 입니다 (${e.route})`);
    if (m.service !== e.service)
      errors.push(`${e.key}: service 는 ${m.service} 여야 합니다 (현재 ${e.service})`);
    if (m.category !== e.category)
      errors.push(`${e.key}: category 는 ${m.category} 여야 합니다 (현재 ${e.category})`);
    if (e.level >= 1 && e.specs.length === 0)
      errors.push(`${e.key}: level ${e.level} 인데 specs 가 비어 있습니다`);
    if (e.level >= 2 && !e.last_pass) errors.push(`${e.key}: level ${e.level} 인데 last_pass 가 없습니다`);
    for (const id of e.specs) {
      if (!knownSpecIds.has(id))
        errors.push(
          `${e.key}: spec ${id} 가 없습니다 (tests/regression/<id>.spec.ts 또는 시나리오 id 여야 함)`,
        );
    }
  }
  for (const m of expected) {
    if (!seenRoutes.has(m.route))
      errors.push(`장부에 없음: ${m.key} (${m.category} > ${m.service} ${m.route})`);
  }
  return errors;
}

/** 저장소에서 spec id 로 인정하는 것: tests/regression/<id>.spec.ts 와 scenarios/**\/*.yaml 의 id */
export function collectSpecIds(root = process.cwd()): Set<string> {
  const ids = new Set<string>();
  const regDir = path.join(root, 'tests', 'regression');
  if (fs.existsSync(regDir)) {
    for (const f of fs.readdirSync(regDir)) {
      const m = /^(.+)\.spec\.ts$/.exec(f);
      if (m) ids.add(m[1]!);
    }
  }
  const scDir = path.join(root, 'scenarios');
  const walk = (dir: string): void => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(ent.name) && !ent.name.startsWith('_')) {
        const m = /^id:\s*["']?([A-Za-z0-9][A-Za-z0-9.\-_]*)["']?\s*$/m.exec(fs.readFileSync(p, 'utf8'));
        if (m) ids.add(m[1]!);
      }
    }
  };
  if (fs.existsSync(scDir)) walk(scDir);
  return ids;
}

// ---------------------------------------------------------------------------
// 요약
// ---------------------------------------------------------------------------

function emptyLevels(): Record<CoverageLevel, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
}

export function summarizeCoverage(
  ledger: CoverageLedger,
  map: ScreenMap,
  exclusions: ReadonlyMap<string, string> = new Map(),
): CoverageSummary {
  const levels = emptyLevels();
  const cats = new Map<string, CategorySummary>();
  const kept = ledger.resources.filter((e) => !exclusions.has(e.service));
  const excluded = [...exclusions].map(([service, reason]) => ({
    service,
    reason,
    resources: ledger.resources.filter((e) => e.service === service).length,
  }));
  for (const e of kept) {
    levels[e.level]++;
    const c = cats.get(e.category) ?? { category: e.category, resources: 0, levels: emptyLevels() };
    c.resources++;
    c.levels[e.level]++;
    cats.set(e.category, c);
  }
  return {
    totals: mapTotals(map),
    resources: kept.length,
    levels,
    at_least_2: levels[2] + levels[3] + levels[4],
    at_least_3: levels[3] + levels[4],
    categories: [...cats.values()].sort((a, b) => a.category.localeCompare(b.category, 'en')),
    excluded: excluded.filter((x) => x.resources > 0),
  };
}

function pct(n: number, d: number): string {
  return d === 0 ? '-' : `${Math.round((n / d) * 100)}%`;
}

export function formatCoverageText(s: CoverageSummary): string {
  const t = s.totals;
  const lines: string[] = [];
  lines.push(
    `서비스 ${t.services} · 화면 ${t.screens} (Service Home ${t.home_screens}, 그 외 ${t.non_home_screens}) · 스모크 진입 ${t.smoke_entries} · 목록 화면 ${t.list_screens} (리소스 키 있음 ${t.keyed_list_screens})`,
  );
  lines.push(
    `장부 리소스 ${s.resources}개: L0 ${s.levels[0]} · L1 ${s.levels[1]} · L2 ${s.levels[2]} · L3 ${s.levels[3]} · L4 ${s.levels[4]}`,
  );
  lines.push(`level ≥ 2 (CRUD 이상): ${s.at_least_2}/${s.resources} (${pct(s.at_least_2, s.resources)})`);
  lines.push(`level ≥ 3 (동작 이상): ${s.at_least_3}/${s.resources} (${pct(s.at_least_3, s.resources)})`);
  lines.push('');
  const w = Math.max(8, ...s.categories.map((c) => c.category.length));
  lines.push(`${'카테고리'.padEnd(w)}  리소스  L1  L2  L3  L4`);
  for (const c of s.categories) {
    lines.push(
      `${c.category.padEnd(w)}  ${String(c.resources).padStart(6)}  ${String(c.levels[1]).padStart(2)}  ${String(c.levels[2]).padStart(2)}  ${String(c.levels[3]).padStart(2)}  ${String(c.levels[4]).padStart(2)}`,
    );
  }
  return lines.join('\n') + '\n';
}

export function formatCoverageMarkdown(s: CoverageSummary): string {
  const t = s.totals;
  const lines: string[] = [];
  lines.push(
    `- 서비스 ${t.services} · 화면 ${t.screens} (Service Home ${t.home_screens}, 그 외 ${t.non_home_screens}) · 스모크 진입 ${t.smoke_entries}`,
  );
  lines.push(
    `- 목록 화면 ${t.list_screens}, 그중 리소스 키 있음 ${t.keyed_list_screens} = 장부 리소스 ${s.resources}개`,
  );
  lines.push(
    `- level ≥ 2 (CRUD 이상): **${s.at_least_2}/${s.resources}** (${pct(s.at_least_2, s.resources)}) · level ≥ 3 (동작 이상): **${s.at_least_3}/${s.resources}** (${pct(s.at_least_3, s.resources)})`,
  );
  lines.push('');
  lines.push('| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const c of s.categories)
    lines.push(
      `| ${c.category} | ${c.resources} | ${c.levels[1]} | ${c.levels[2]} | ${c.levels[3]} | ${c.levels[4]} |`,
    );
  lines.push(
    `| **합계** | **${s.resources}** | **${s.levels[1]}** | **${s.levels[2]}** | **${s.levels[3]}** | **${s.levels[4]}** |`,
  );
  return lines.join('\n') + '\n';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
