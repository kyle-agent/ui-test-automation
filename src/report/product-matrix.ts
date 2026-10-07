/**
 * 상품별 화면 판단표: 서비스 맵(service-map/screens.txt)의 상품·화면 전체를 기준으로, 화면마다
 *   시나리오(어떤 spec·몇 단계) / 스모크만 / 제외(장부 메모의 사유) 를 붙이고, 사람의 판단(data/coverage-decisions.yaml)을 함께 보여 준다.
 * 목적: 모수를 보고 사람이 "이 화면은 더 해라 / 제외 / 보류" 를 정할 수 있게 한다.
 *
 * data/coverage-decisions.yaml 형식(한 줄에 하나, # 주석):
 *   /ske/namespace: 해라 | 네임스페이스·Deployment 까지
 *   /gpuserver/gpuserver/list: 제외 | GPU 비용
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ScreenMap } from '../service-map/screens';
import type { CoverageEntry } from './coverage';
import type { CatalogSpec } from './scenario-catalog';

export type ScreenState = '시나리오' | '스모크만' | '제외' | '홈';
export type Decision = '해라' | '제외' | '보류';

export interface ScreenRow {
  name: string;
  route: string;
  state: ScreenState;
  level?: number;
  specs: { spec: string; steps: number; status?: 'pass' | 'fail' }[];
  reason?: string;
  decision?: { decision: Decision; note?: string };
}

export interface ProductMatrix {
  category: string;
  service: string;
  screens: ScreenRow[];
  specs: CatalogSpec[];
}

export const DECISIONS_FILE = path.resolve(process.cwd(), 'data', 'coverage-decisions.yaml');

export function parseDecisions(text: string): Map<string, { decision: Decision; note?: string }> {
  const m = new Map<string, { decision: Decision; note?: string }>();
  for (const line of text.split(/\r?\n/)) {
    const r = line.match(/^\s*"?(\/[^"\s:]+)"?\s*:\s*(해라|제외|보류)\s*(?:\|\s*(.*))?$/);
    if (r) m.set(r[1]!, { decision: r[2] as Decision, note: r[3]?.trim() || undefined });
  }
  return m;
}

export function readDecisions(file = DECISIONS_FILE): Map<string, { decision: Decision; note?: string }> {
  return fs.existsSync(file) ? parseDecisions(fs.readFileSync(file, 'utf8')) : new Map();
}

/** 화면 route 가 시나리오 단계 route 와 같은 화면인가: 같거나, 목록(/list) 을 뗀 기준 경로의 하위(상세·생성·수정) */
export function routeMatches(screenRoute: string, stepRoute: string): boolean {
  if (screenRoute === stepRoute) return true;
  const base = screenRoute.replace(/\/list$/, '');
  return base.length > 1 && (stepRoute === base || stepRoute.startsWith(`${base}/`));
}

const EXCLUDE_HINT = /건너뜀|불가|제외|약정|요금|권한|라이선스|물리|회선|다운로드|구매|영업|조직 마스터|GPU|deprecate|자원 없음|지원 안/;

export function buildProductMatrix(
  map: ScreenMap,
  entries: readonly CoverageEntry[],
  catalog: readonly CatalogSpec[],
  decisions: Map<string, { decision: Decision; note?: string }>,
): ProductMatrix[] {
  const byRoute = new Map(entries.map((e) => [e.route, e]));
  const out: ProductMatrix[] = [];
  for (const svc of map.services) {
    const rows: ScreenRow[] = svc.screens.map((sc) => {
      const specs = catalog
        .map((c) => ({ c, n: c.steps.filter((s) => s.route && routeMatches(sc.route, s.route)).length }))
        .filter((x) => x.n > 0)
        .map((x) => ({ spec: x.c.spec, steps: x.n, status: x.c.last?.status }));
      const entry = byRoute.get(sc.route);
      const home = sc.name === 'Service Home' || /\/dashboard$/.test(sc.route);
      let state: ScreenState = specs.length ? '시나리오' : home ? '홈' : '스모크만';
      let reason: string | undefined;
      if (!specs.length && entry && entry.level <= 1 && entry.note && EXCLUDE_HINT.test(entry.note)) {
        state = '제외';
        reason = entry.note;
      }
      return { name: sc.name, route: sc.route, state, level: entry?.level, specs, reason, decision: decisions.get(sc.route) };
    });
    const specs = catalog.filter((c) => c.service === svc.name || rows.some((r) => r.specs.some((s) => s.spec === c.spec)));
    out.push({ category: svc.category, service: svc.name, screens: rows, specs });
  }
  return out.sort((a, b) => a.category.localeCompare(b.category, 'en') || a.service.localeCompare(b.service, 'en'));
}
