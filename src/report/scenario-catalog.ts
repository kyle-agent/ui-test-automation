/**
 * 상품별 시나리오 목록: 회귀 spec(tests/regression/*.spec.ts)이 읽는 시나리오(scenarios/**.yaml)를 상품·카테고리로 묶는다.
 * 시나리오마다 단계 목표(goal)와 지나가는 화면(goto·expect.url)을 뽑고, 최근 실행 결과를 붙인다(대시보드 "상품별 시나리오").
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadScenario, type Scenario } from '../scenario/schema';
import type { RunRecord } from './run-record';

export interface CatalogStep {
  goal: string;
  route?: string;
  teardown?: boolean;
}

export interface CatalogSpec {
  spec: string;
  title: string;
  file: string;
  category: string;
  service: string;
  screens: string[];
  steps: CatalogStep[];
  last?: { status: 'pass' | 'fail'; started: string; seconds: number };
  runs: number;
  passes: number;
}

const REGRESSION_DIR = path.resolve(process.cwd(), 'tests', 'regression');

/** spec 파일에서 시나리오 경로를 찾는다: loadScenario('…') 또는 팩토리 옵션 scenario: '…' */
export function scenarioPathOf(specSource: string): string | null {
  return (
    specSource.match(/loadScenario\(\s*['"]([^'"]+\.ya?ml)['"]/)?.[1] ??
    specSource.match(/scenario:\s*['"]([^'"]+\.ya?ml)['"]/)?.[1] ??
    null
  );
}

const routeOf = (s: { goto?: string; expect?: { url?: string } }): string | undefined => {
  const r = s.goto ?? s.expect?.url;
  return r ? r.replace(/^#/, '').split('?')[0] : undefined;
};

export function catalogFromScenario(spec: string, sc: Scenario, runs: readonly RunRecord[]): CatalogSpec {
  const steps: CatalogStep[] = [
    ...sc.steps.map((s) => ({ goal: s.goal, route: routeOf(s as never) })),
    ...sc.teardown.map((s) => ({ goal: s.goal, route: routeOf(s as never), teardown: true })),
  ];
  const screens = [...new Set(steps.map((s) => s.route).filter((r): r is string => !!r))];
  const last = runs[runs.length - 1];
  return {
    spec,
    title: sc.title,
    file: sc.file,
    category: sc.category ?? spec.split('.')[0]!,
    service: sc.service,
    screens,
    steps,
    last: last ? { status: last.status, started: last.started, seconds: last.seconds } : undefined,
    runs: runs.length,
    passes: runs.filter((r) => r.status === 'pass').length,
  };
}

export function readScenarioCatalog(records: readonly RunRecord[], dir = REGRESSION_DIR): CatalogSpec[] {
  if (!fs.existsSync(dir)) return [];
  const bySpec = new Map<string, RunRecord[]>();
  for (const r of records) bySpec.set(r.spec, [...(bySpec.get(r.spec) ?? []), r]);
  const out: CatalogSpec[] = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.spec.ts')).sort()) {
    const spec = f.replace(/\.spec\.ts$/, '');
    const p = scenarioPathOf(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (!p || !fs.existsSync(path.resolve(process.cwd(), p))) continue;
    try {
      out.push(catalogFromScenario(spec, loadScenario(p), bySpec.get(spec) ?? []));
    } catch {
      // 깨진 시나리오는 목록에서 뺀다(npm run check 가 잡는다)
    }
  }
  return out.sort((a, b) => a.category.localeCompare(b.category, 'en') || a.service.localeCompare(b.service, 'en') || a.spec.localeCompare(b.spec));
}
