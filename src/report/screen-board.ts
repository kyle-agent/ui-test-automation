/**
 * 화면 상태판 — 대시보드 첫 화면(2026-10-22). 카테고리 → 상품 → 화면 순서로 서비스 맵의 모든 화면에 "정상 여부" 하나를 붙인다.
 * 시안은 reports/screen-status-dashboard.html(예시 데이터). 여기서는 상품별 판단표(src/report/product-matrix.ts)와 실행 기록으로 실제 값을 만든다.
 *
 * 화면 하나의 상태(ScreenStatus)
 *   pass     정상    이 화면을 지나는 "자기 상품" spec 의 마지막 실행이 모두 통과
 *   fail     실패    자기 상품 spec 중 마지막 실행이 실패한 것이 있음. 자기 상품 spec 이 없고 다른 상품 spec 이 전제 단계로만 지나는 화면은
 *                    그 spec 이 모두 실패했을 때만 실패 (DBaaS spec 이 teardown 에서 실패해도 VPC 화면을 실패로 만들지 않는다, 2026-10-22)
 *   flaky    불안정  마지막은 통과했지만 스위트 실행 최근 10회에 실패가 섞임 (src/report/insights.ts isFlakySpec)
 *   unrun    미실행  시나리오는 있는데 실행 기록이 없음
 *   smoke    진입만  스모크(진입 확인)만 있고 동작을 검증하는 시나리오가 없음 (판단은 data/coverage-decisions.yaml)
 *   excluded 제외    장부 메모의 사유로 제외했거나 상품이 모수 제외
 *   home     홈      Service Home(대시보드 화면). 검증 대상이 아니라 기본으로 숨긴다
 *
 * "자기 상품 spec" = 시나리오 yaml 의 service 가 그 상품인 spec. 다른 상품 spec 은 전제 리소스를 만들며 이 화면을 지나는 것.
 *
 * 화면 하나는 콘솔 관례대로 목록 → 생성 · 상세 의 세 칸(ScreenPart)으로 펼친다(2026-10-22). 서비스 맵은 목록 route 만 가지므로
 * 칸은 시나리오 단계로 판정한다: route 가 …/detail 이면 상세, 목표(goal)가 생성·만든다·등록이면 생성, 그 외는 목록.
 * route 없는 단계(생성 버튼을 누른다 등)는 바로 앞 단계의 화면에 있는 것으로 본다. 수정·삭제는 칸이 아니라 그 spec 의 동작으로 적는다.
 * 어느 spec 도 지나지 않는 칸은 none(미검증) — 점선 빈 칸. 화면 상태는 세 칸을 합친 spec 전체로, 칸 상태는 그 칸을 지나는 spec 만으로 판정.
 *
 * 화면·상태 계산은 순수 함수(buildScreenBoard), 표는 브라우저에서 그린다(필터·검색·상세 패널). 외부 요청 없음.
 */
import { routeMatches, type ProductMatrix, type ScreenRow } from './product-matrix';
import type { CatalogStep } from './scenario-catalog';
import { groupBySpec } from './results';
import type { RunRecord } from './run-record';

export type ScreenStatus = 'pass' | 'fail' | 'flaky' | 'unrun' | 'smoke' | 'excluded' | 'home';

export const SCREEN_STATUS_LABEL: Record<ScreenStatus, string> = {
  pass: '정상',
  fail: '실패',
  flaky: '불안정',
  unrun: '미실행',
  smoke: '진입만',
  excluded: '제외',
  home: '홈',
};

/** 화면 하나를 펼친 세 칸: 목록 화면, 생성 화면, 상세 화면 */
export type ScreenPart = 'list' | 'create' | 'detail';
export const SCREEN_PARTS: readonly ScreenPart[] = ['list', 'create', 'detail'];
export const SCREEN_PART_LABEL: Record<ScreenPart, string> = { list: '목록', create: '생성', detail: '상세' };
/** 칸 상태: 화면 상태 + none(그 칸을 지나는 spec 없음) */
export type PartStatus = ScreenStatus | 'none';

/** 콘솔 "모든 서비스" 화면의 카테고리 순서(service-map/catalog.yaml). 없는 카테고리는 뒤에 이름순 */
export const CATEGORY_ORDER: readonly string[] = [
  'Compute',
  'Storage',
  'Container',
  'Networking',
  'Database',
  'Data Analytics',
  'Application Service',
  'Security',
  'Management',
  'Financial Management',
  'DevOps Tools',
  'AI-ML',
  'Hybrid Cloud',
];

export interface BoardSpec {
  spec: string;
  /** 자기 상품 spec 인가 (false = 다른 상품 spec 이 전제 단계로 지나감) */
  own: boolean;
  /** 이 화면을 지나는 단계 수 */
  steps: number;
  /** 이 화면에서 지나는 칸(목록·생성·상세) */
  parts: ScreenPart[];
  /** 이 화면에서 하는 쓰기 동작(수정·삭제). 생성은 칸으로 보인다 */
  actions: string[];
  status?: 'pass' | 'fail';
  started?: string;
  seconds?: number;
  runs: number;
  passes: number;
  error?: string;
  /** 저장소 루트 기준 경로 */
  attachments: string[];
  flaky: boolean;
}

export interface BoardScreen {
  name: string;
  route: string;
  status: ScreenStatus;
  level?: number;
  /** 제외 사유(장부 메모) */
  reason?: string;
  decision?: { decision: string; note?: string };
  specs: BoardSpec[];
  /** 칸별 상태(목록·생성·상세). 홈 화면은 list 칸 하나만 home, 나머지 none */
  parts: Record<ScreenPart, PartStatus>;
}

export interface BoardProduct {
  id: string;
  category: string;
  name: string;
  /** 모수 제외 사유 */
  excluded?: string;
  screens: BoardScreen[];
}

export interface ScreenBoard {
  categories: { id: string; name: string }[];
  products: BoardProduct[];
}

const slugId = (v: string): string =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'x';

export function judgeScreen(
  row: Pick<ScreenRow, 'state'>,
  specs: readonly BoardSpec[],
  productExcluded: boolean,
): ScreenStatus {
  if (productExcluded || row.state === '제외') return 'excluded';
  if (row.state === '홈') return 'home';
  if (!specs.length) return 'smoke';
  const own = specs.filter((s) => s.own);
  const judged = own.length ? own : specs;
  const ran = judged.filter((s) => s.status);
  if (!ran.length) return 'unrun';
  if (own.length ? ran.some((s) => s.status === 'fail') : !ran.some((s) => s.status === 'pass'))
    return 'fail';
  if (ran.some((s) => s.flaky)) return 'flaky';
  return 'pass';
}

export function orderCategories(names: Iterable<string>): string[] {
  const set = [...new Set(names)];
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i < 0 ? CATEGORY_ORDER.length : i;
  };
  return set.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'en'));
}

/** 첨부 중 그 spec 자신의 것만(공유 브라우저에서 test-failed-N.png 는 다른 탭을 찍는다) */
const ownAttachments = (list: readonly string[] | undefined): string[] =>
  (list ?? []).filter((p) => !/\/test-failed-\d+\.png$/.test(p));

const CREATE_RE = /생성|만든다|만들어|등록|발급|신청/;
const EDIT_RE = /수정|변경|바꿔|바꾼|편집|갱신/;
const DELETE_RE = /삭제|해지|제거|지운다|지우고/;

/** 단계 하나가 어느 칸에 있고 무엇을 하는가. route 가 …/detail(/…) 이면 상세, 목표가 생성이면 생성, 그 외 목록 */
export function classifyStep(goal: string, route: string): { part: ScreenPart; actions: string[] } {
  const actions: string[] = [];
  if (EDIT_RE.test(goal)) actions.push('수정');
  if (DELETE_RE.test(goal)) actions.push('삭제');
  if (/\/detail(\/|$)/.test(route)) return { part: 'detail', actions };
  if (CREATE_RE.test(goal)) return { part: 'create', actions };
  return { part: 'list', actions };
}

/** spec 의 단계들이 이 화면(목록 route)에서 지나는 칸과 동작. route 없는 단계는 바로 앞 단계의 화면에 있는 것으로 본다 */
export function specPartsOnScreen(
  screenRoute: string,
  steps: readonly CatalogStep[],
): { parts: ScreenPart[]; actions: string[] } {
  let current: string | undefined;
  const parts = new Set<ScreenPart>();
  const actions = new Set<string>();
  for (const s of steps) {
    if (s.route) current = s.route;
    const route = s.route ?? current;
    if (!route || !routeMatches(screenRoute, route)) continue;
    const c = classifyStep(s.goal, route);
    parts.add(c.part);
    for (const a of c.actions) actions.add(a);
  }
  return {
    parts: SCREEN_PARTS.filter((p) => parts.has(p)),
    actions: ['수정', '삭제'].filter((a) => actions.has(a)),
  };
}

export function buildScreenBoard(
  matrix: readonly ProductMatrix[],
  records: readonly RunRecord[],
  flakySpecs: ReadonlySet<string> = new Set(),
): ScreenBoard {
  const bySpec = groupBySpec(records);
  // spec → 그 시나리오의 상품 (자기 상품 spec 판정용)
  const specService = new Map<string, string>();
  const specSteps = new Map<string, readonly CatalogStep[]>();
  for (const m of matrix)
    for (const c of m.specs) {
      specService.set(c.spec, c.service);
      specSteps.set(c.spec, c.steps);
    }

  const used = new Set<string>();
  const products: BoardProduct[] = [];
  for (const m of matrix) {
    if (!m.screens.length) continue;
    let id = slugId(m.service);
    for (let n = 2; used.has(id); n++) id = `${slugId(m.service)}-${n}`;
    used.add(id);
    const screens: BoardScreen[] = m.screens.map((row) => {
      const specs: BoardSpec[] = row.specs.map((x) => {
        const runs = bySpec.get(x.spec) ?? [];
        const last = runs[runs.length - 1];
        // 단계 목록이 없는 spec(판단표에 없는 상품의 spec)은 목록 칸만 지난 것으로 본다
        const on = specSteps.has(x.spec)
          ? specPartsOnScreen(row.route, specSteps.get(x.spec)!)
          : { parts: ['list' as ScreenPart], actions: [] };
        return {
          spec: x.spec,
          own: specService.get(x.spec) === m.service,
          steps: x.steps,
          parts: on.parts,
          actions: on.actions,
          status: last?.status,
          started: last?.started,
          seconds: last?.seconds,
          runs: runs.length,
          passes: runs.filter((r) => r.status === 'pass').length,
          error: last?.status === 'fail' ? last.error : undefined,
          attachments: last?.status === 'fail' ? ownAttachments(last.attachments) : [],
          flaky: flakySpecs.has(x.spec),
        };
      });
      // 자기 상품 spec 먼저, 그 다음 전제 단계 spec
      specs.sort((a, b) => Number(b.own) - Number(a.own) || a.spec.localeCompare(b.spec));
      const status = judgeScreen(row, specs, !!m.excluded);
      const partStatus = (part: ScreenPart): PartStatus => {
        if (status === 'excluded') return 'excluded';
        if (status === 'home') return part === 'list' ? 'home' : 'none';
        const sub = specs.filter((s) => s.parts.includes(part));
        if (!sub.length) return status === 'smoke' && part === 'list' ? 'smoke' : 'none';
        return judgeScreen(row, sub, false);
      };
      return {
        name: row.name,
        route: row.route,
        status,
        level: row.level,
        reason: row.reason ?? (m.excluded ? `모수 제외: ${m.excluded}` : undefined),
        decision: row.decision,
        specs,
        parts: { list: partStatus('list'), create: partStatus('create'), detail: partStatus('detail') },
      };
    });
    products.push({ id, category: m.category, name: m.service, excluded: m.excluded, screens });
  }
  const order = orderCategories(products.map((p) => p.category));
  products.sort(
    (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name, 'en'),
  );
  return { categories: order.map((c) => ({ id: slugId(c), name: c })), products };
}

export function countScreenStatuses(board: ScreenBoard): Record<ScreenStatus, number> {
  const n: Record<ScreenStatus, number> = {
    pass: 0,
    fail: 0,
    flaky: 0,
    unrun: 0,
    smoke: 0,
    excluded: 0,
    home: 0,
  };
  for (const p of board.products) for (const s of p.screens) n[s.status]++;
  return n;
}

/** 검증 대상 화면(제외·홈 제외)의 칸 수: 전체 = 화면 × 3, 검증 = 정상·불안정, 실패, 미검증 = 지나는 spec 없음 */
export function countParts(board: ScreenBoard): { total: number; verified: number; fail: number; none: number } {
  const n = { total: 0, verified: 0, fail: 0, none: 0 };
  for (const p of board.products)
    for (const s of p.screens) {
      if (s.status === 'excluded' || s.status === 'home') continue;
      for (const part of SCREEN_PARTS) {
        const st = s.parts[part];
        n.total++;
        if (st === 'pass' || st === 'flaky') n.verified++;
        else if (st === 'fail') n.fail++;
        else if (st === 'none') n.none++;
      }
    }
  return n;
}

const esc = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** <script type="application/json"> 안에 넣어도 안전하게 (</script>, <!-- 를 깨지 않게) */
const jsonForHtml = (v: unknown): string =>
  JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028\u2029]/g, '');

export const SCREEN_BOARD_CSS = `
  #screens { padding:0; overflow:hidden }
  #screens > h2 { padding:16px 20px 0 }
  .sb-sum { display:grid; grid-template-columns:1.9fr repeat(6,1fr); border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:#fff }
  .sb-sum button { border:0; border-left:1px solid var(--line); background:none; text-align:left; padding:12px 16px; font:inherit; color:inherit; cursor:pointer; min-width:0 }
  .sb-sum button:first-child { border-left:0 } .sb-sum button:hover { background:#f9fafb } .sb-sum button.on { background:#eef2ff }
  .sb-sum .k { display:block; font-size:12px; color:var(--muted); white-space:nowrap } .sb-sum .v { font-size:24px; font-weight:650; letter-spacing:-.5px; line-height:1.3; font-variant-numeric:tabular-nums } .sb-sum .v small { font-size:11px; font-weight:400; color:var(--muted); margin-left:3px }
  .sb-sum .x { display:block; font-size:11px; color:var(--muted); margin-top:2px; white-space:nowrap }
  .sb-sum .pass .v { color:#15803d } .sb-sum .fail .v { color:#b91c1c } .sb-sum .flaky .v { color:#a16207 } .sb-sum .smoke .v { color:#6b7280 } .sb-sum .unrun .v { color:#6b7280 } .sb-sum .excluded .v { color:#9ca3af }
  .sb-cats { display:flex; gap:4px; flex-wrap:wrap; padding:12px 20px 0 }
  .sb-cats button { border:1px solid transparent; border-radius:6px; padding:5px 10px; background:transparent; color:#4b5563; font:inherit; font-size:12px; cursor:pointer; display:inline-flex; gap:6px; align-items:center; white-space:nowrap }
  .sb-cats button .n { font-size:11px; color:#9ca3af } .sb-cats button:hover { background:#f3f4f6 } .sb-cats button.on { background:#111827; border-color:#111827; color:#fff } .sb-cats button.on .n { color:#d1d5db }
  .sb-cats .al { width:6px; height:6px; border-radius:50%; background:#dc2626; display:inline-block }
  .sb-tools { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:12px 20px; border-bottom:1px solid var(--line) }
  .sb-tools .t { font-weight:600 } .sb-tools .t span { font-weight:400; color:var(--muted); font-size:12px; margin-left:6px }
  .sb-tools .legend { margin-left:auto } .sb-tools .legend span { font-size:11px; color:#6b7280 }
  .sb-tools input[type=search], .sb-tools select { font:inherit; font-size:12px; border:1px solid var(--line); border-radius:6px; padding:5px 8px; background:#fff; color:var(--ink) }
  .sb-tools input[type=search] { width:200px } .sb-tools label.chk { font-size:12px; color:#4b5563; display:inline-flex; gap:4px; align-items:center }
  .sb-tools button.reset { border:1px solid var(--line); background:#fff; border-radius:6px; padding:4px 8px; font-size:12px; cursor:pointer }
  .sb-wrap { overflow:auto }
  table.sb { table-layout:fixed; font-size:13px } table.sb col.c-cat { width:150px } table.sb col.c-prod { width:200px } table.sb col.c-ratio { width:96px }
  table.sb thead th { background:#f9fafb; padding:8px 14px } table.sb tbody+tbody tr:first-child > * { border-top:2px solid #d1d5db }
  table.sb td, table.sb th { padding:7px 14px; vertical-align:middle }
  table.sb th.cat { background:#fafbfc; border-right:1px solid var(--line); vertical-align:top; padding-top:14px; font-size:12px; color:#374151 }
  table.sb th.cat .d { font-size:11px; font-weight:400; color:#9ca3af; margin-top:4px } table.sb th.cat .d .f { color:#b91c1c }
  table.sb th.prod { font-weight:600; color:#1f2937; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
  table.sb th.prod .m { font-size:11px; font-weight:400; color:#9ca3af; margin-top:2px; white-space:nowrap } .m .f { color:#b91c1c; font-weight:600 } .m .w { color:#a16207 } .m .g { color:#6b7280 } .m .ok { color:#15803d }
  table.sb tr.excl th.prod { color:#9ca3af }
  .sb-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:6px }
  .scr { min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:4px; text-align:left; border:1px solid #dfe5e2; border-radius:6px; padding:6px 8px; background:#fbfdfc; font:inherit; color:#1f2937; cursor:pointer }
  .scr .nm { font-size:12px; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
  .scr:hover { border-color:#6b8fcf; box-shadow:0 0 0 2px #e0e9fa }
  .scr.fail { border-color:#f1b7bc; background:#fff1f2; box-shadow:inset 3px 0 #dc2626 }
  .scr.flaky { border-color:#ead9b0; background:#fffbeb; box-shadow:inset 3px 0 #ca8a04 }
  .scr.smoke { border-color:#e5e7eb; background:#f9fafb; color:#4b5563 }
  .scr.unrun { border-style:dashed; border-color:#cbd5e1; background:#f8fafc; color:#64748b }
  .scr.excluded { border-style:dashed; border-color:#e5e7eb; background:#fff; color:#9ca3af }
  .scr.home { border-color:#e5e7eb; background:#fff; color:#9ca3af }
  .scr.hit { box-shadow:0 0 0 2px #93c5fd }
  /* 화면 하나 = 칸 셋(목록·생성·상세). 칸 색이 그 칸을 지나는 spec 의 상태, 점선 빈 칸은 지나는 spec 없음 */
  .scr .pts { display:inline-flex; gap:2px; flex:none }
  .pt { display:inline-flex; align-items:center; justify-content:center; width:26px; height:19px; font-size:10px; font-style:normal; font-weight:600; letter-spacing:-.5px; border-radius:3px; background:#4ade80; color:#14532d; box-sizing:border-box }
  .pt.fail { background:#dc2626; color:#fff } .pt.flaky { background:#eab308; color:#422006 } .pt.smoke { background:#cbd5e1; color:#334155 }
  .pt.unrun { background:repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 3px,#f1f5f9 3px,#f1f5f9 6px); color:#334155 }
  .pt.none { background:#fff; border:1px dashed #d1d5db; color:#b3bac4; font-weight:400 } .pt.excluded { background:#fff; border:1px dashed #e5e7eb; color:#c4c8cf; font-weight:400 } .pt.home { background:#f3f4f6; color:#9ca3af; width:54px }
  /* 기본 보기: 이름 없이 칸 셋만. 한 화면에 카테고리·상품·화면이 다 보이게 */
  .sb-grid.mini { display:flex; flex-wrap:wrap; gap:3px }
  .mini .scr { padding:1px; gap:0; border-radius:4px; border:1px solid #e5e7eb; background:#fff; box-shadow:none }
  .mini .scr .nm { display:none }
  .mini .scr.fail { border-color:#dc2626 } .mini .scr.flaky { border-color:#ca8a04 } .mini .scr.unrun, .mini .scr.excluded { border-style:dashed }
  .mini .scr:hover, .mini .scr.hit { box-shadow:0 0 0 2px #1d4ed8 }
  table.sb.mini td, table.sb.mini th { padding-top:4px; padding-bottom:4px } table.sb.mini th.cat { padding-top:8px }
  table.sb.mini th.prod { font-size:12px } table.sb.mini th.prod .m { display:inline; margin-left:6px } table.sb.mini td.ratio .mt { display:none }
  table.sb td.ratio { text-align:center; white-space:nowrap; font-variant-numeric:tabular-nums; color:#4b5563 } td.ratio b { color:#15803d } td.ratio .cl { font-size:10px; color:#9ca3af } td.ratio .mt { width:48px; height:4px; background:#eef0f3; border-radius:3px; margin:5px auto 0; overflow:hidden } td.ratio .mt i { display:block; height:100%; background:#4ade80 }
  .sb-foot { display:flex; justify-content:space-between; gap:16px; padding:10px 20px; font-size:11px; color:#6b7280; border-top:1px solid var(--line); flex-wrap:wrap }
  .sb-empty { padding:40px; text-align:center; color:#6b7280 }
  dialog.sb-dlg { padding:0; border:0; position:fixed; inset:0 0 0 auto; margin:0; width:640px; max-width:100%; height:100dvh; max-height:100dvh; box-shadow:-12px 0 48px #1f293733; color:var(--ink); background:#fff; overflow:auto; font-size:13px }
  dialog.sb-dlg::backdrop { background:#1f293740 }
  .dlg-h { padding:20px 24px 16px; border-bottom:1px solid var(--line); background:#fafbfc } .dlg-p { display:flex; align-items:center; gap:6px; font-size:12px; color:#6b7280; margin-bottom:10px } .dlg-p .x { margin-left:auto; border:1px solid var(--line); background:#fff; border-radius:6px; width:28px; height:28px; cursor:pointer; font-size:14px }
  .dlg-h h3 { margin:0; font-size:20px; display:flex; gap:10px; align-items:center; flex-wrap:wrap } .dlg-h .rt { margin-top:6px }
  .sbdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:6px; font-size:12px; font-weight:600; background:#dcfce7; color:#166534 } .sbdg.fail { background:#fee2e2; color:#991b1b } .sbdg.flaky { background:#fef3c7; color:#92400e } .sbdg.smoke,.sbdg.unrun { background:#e5e7eb; color:#374151 } .sbdg.excluded,.sbdg.home { background:#f3f4f6; color:#6b7280 }
  .dlg-b { padding:18px 24px } .dlg-b h4 { margin:16px 0 8px; font-size:13px } .dlg-b h4:first-child { margin-top:0 }
  .why { border:1px solid #e5e7eb; border-left:3px solid #9ca3af; border-radius:6px; padding:10px 12px; background:#f9fafb; line-height:1.7 } .why b { display:block; margin-bottom:2px }
  .why.pass { border-left-color:#16a34a; background:#f0fdf4 } .why.fail { border-left-color:#dc2626; background:#fef2f2 } .why.flaky { border-left-color:#ca8a04; background:#fffbeb }
  table.dlg-t td, table.dlg-t th { padding:5px 6px; font-size:12px } table.dlg-t .err { display:block; margin-top:2px }
  .own { display:inline-block; font-size:10px; padding:0 5px; border-radius:4px; background:#dbeafe; color:#1e40af; font-weight:600 } .own.no { background:#f3f4f6; color:#6b7280 }
  .same { display:flex; gap:6px; flex-wrap:wrap } .same button { border:1px solid var(--line); border-radius:6px; padding:4px 8px; background:#fff; font:inherit; font-size:12px; cursor:pointer; color:#374151 } .same button.on { background:#eef2ff; border-color:#c7d2fe; color:#3730a3 }
  body.demo #screens .sb-foot { display:flex }
  @media (max-width:900px) { .sb-sum { grid-template-columns:repeat(4,1fr) } .sb-sum button:first-child { grid-column:1/-1; border-bottom:1px solid var(--line) } .sb-sum button:nth-child(2) { border-left:0 } table.sb col.c-cat { width:110px } table.sb col.c-prod { width:140px } .sb-tools .legend { display:none } }
`;

/** 대시보드 첫 화면 블록. 표는 브라우저에서 JSON 으로 그린다(필터·검색·상세 패널). */
export function screenBoardBlock(board: ScreenBoard): string {
  const n = countScreenStatuses(board);
  const target = n.pass + n.fail + n.flaky + n.unrun + n.smoke;
  const parts = countParts(board);
  const productCount = board.products.filter((p) => !p.excluded).length;
  const tile = (st: ScreenStatus | 'all', k: string, v: number, extra = '') =>
    `<button class="${st}" data-sb-status="${st}"><span class="k">${k}</span><span class="v">${v}<small>개</small></span>${extra}</button>`;
  return `
  <div class="sb-sum" aria-label="화면 상태 요약">
    ${tile('all', '검증 대상 화면', target, `<span class="x">카테고리 ${board.categories.length} · 상품 ${productCount}${n.home ? ` · Service Home ${n.home}개 숨김` : ''}</span><span class="x">칸 ${parts.total} (목록·생성·상세) · 검증 ${parts.verified} · 실패 ${parts.fail} · 미검증 ${parts.none}</span>`)}
    ${tile('pass', SCREEN_STATUS_LABEL.pass, n.pass)}${tile('fail', SCREEN_STATUS_LABEL.fail, n.fail)}${tile('flaky', SCREEN_STATUS_LABEL.flaky, n.flaky)}${tile('smoke', SCREEN_STATUS_LABEL.smoke, n.smoke)}${tile('unrun', SCREEN_STATUS_LABEL.unrun, n.unrun)}${tile('excluded', SCREEN_STATUS_LABEL.excluded, n.excluded)}
  </div>
  <nav class="sb-cats" id="sb-cats" aria-label="카테고리"></nav>
  <div class="sb-tools">
    <div class="t">상품별 화면 <span id="sb-count"></span></div>
    <input id="sb-q" type="search" placeholder="상품·화면·route 검색" aria-label="상품 또는 화면 검색">
    <select id="sb-st" aria-label="상태로 상품 찾기"><option value="all">모든 상품</option><option value="fail">실패 포함</option><option value="flaky">불안정 포함</option><option value="smoke">진입만 포함</option><option value="unrun">미실행 포함</option><option value="pass">검증 대상 전체 정상</option><option value="none">검증 안 된 상품(정상 0)</option></select>
    <label class="chk"><input type="checkbox" id="sb-names"> 화면 이름 보기</label>
    <label class="chk"><input type="checkbox" id="sb-home"> Service Home 보기</label>
    <label class="chk"><input type="checkbox" id="sb-excl" checked> 제외 화면 보기</label>
    <button class="reset" id="sb-reset">초기화</button>
    <div class="legend"><span><i style="background:#4ade80"></i>정상</span><span><i style="background:#dc2626"></i>실패</span><span><i style="background:#ca8a04"></i>불안정</span><span><i style="background:#9ca3af"></i>진입만·미실행</span><span><i style="background:#fff;border:1px dashed #9ca3af"></i>미검증(지나는 spec 없음)·제외</span></div>
  </div>
  <div class="sb-wrap" id="sb-table"></div>
  <div class="sb-foot"><span><b>네모 하나가 화면 하나, 안의 칸 셋이 목록 · 생성 · 상세</b>입니다. 칸 색은 그 칸을 지나는 spec 의 상태, 점선 빈 칸은 아직 어느 spec 도 지나지 않은 화면. 올리면 이름·칸별 상태, 누르면 그 화면을 지나는 회귀 spec·마지막 실행·실패 내용을 봅니다.</span><span>정상 = 자기 상품 spec 마지막 실행 모두 통과 · 전제 단계로만 지나는 화면은 통과 spec 이 하나라도 있으면 정상 · 불안정 = 최근 10회에 실패 섞임 · 진입만 = 스모크(진입 확인)만 · 정상/대상 의 대상은 제외·홈을 뺀 화면</span></div>
  <dialog class="sb-dlg" id="sb-dlg" aria-labelledby="sb-dlg-title"></dialog>
  <script type="application/json" id="sb-data">${jsonForHtml(board)}</script>
  <script>${SCREEN_BOARD_JS}</script>`;
}

const SCREEN_BOARD_JS = String.raw`
(function(){
'use strict';
var data = JSON.parse(document.getElementById('sb-data').textContent);
var L = ${JSON.stringify(SCREEN_STATUS_LABEL)};
var P = ${JSON.stringify(SCREEN_PART_LABEL)}, PARTS = ${JSON.stringify(SCREEN_PARTS)};
function partLabel(st){ return st === 'none' ? '미검증' : L[st]; }
function partsText(s){ return s.status === 'home' ? 'Service Home' : PARTS.map(function(k){ return P[k]+' '+partLabel(s.parts[k]); }).join(' / '); }
function partsHtml(s){
  if (s.status === 'home') return '<span class="pts"><i class="pt home">홈</i></span>';
  return '<span class="pts">'+PARTS.map(function(k){ var st = s.parts[k]; return '<i class="pt '+st+'" title="'+P[k]+' · '+partLabel(st)+'">'+P[k]+'</i>'; }).join('')+'</span>';
}
var $ = function(s){ return document.querySelector(s); };
var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
var cat = 'all', st = 'all', q = '', showHome = false, showExcl = true, names = false, opener = null;
var TARGET = { pass:1, fail:1, flaky:1, unrun:1, smoke:1 };
function fmt(iso){ if(!iso) return ''; var d = new Date(iso), p = function(n){ return String(n).padStart(2,'0'); }; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()); }
function secs(s){ if(s == null) return ''; var t = Math.round(s), m = Math.floor(t/60); return m ? m+'분 '+(t%60)+'초' : t+'초'; }
function visible(p){ return p.screens.filter(function(s){ return (showHome || s.status !== 'home') && (showExcl || s.status !== 'excluded'); }); }
function counts(list){ var n = {}; list.forEach(function(s){ n[s.status] = (n[s.status]||0)+1; }); return n; }
function matches(p){
  if (cat !== 'all' && p.category !== cat) return false;
  var scr = visible(p); if (!scr.length) return false;
  var n = counts(scr), target = scr.filter(function(s){ return TARGET[s.status]; }).length;
  if (st === 'pass') { if (!target || (n.pass||0) !== target) return false; }
  else if (st === 'none') { if (n.pass) return false; }
  else if (st !== 'all' && !n[st]) return false;
  var k = q.trim().toLowerCase();
  if (k && !(p.name+' '+p.category+' '+scr.map(function(s){ return s.name+' '+s.route; }).join(' ')).toLowerCase().includes(k)) return false;
  return true;
}
function renderCats(){
  var all = [{id:'all',name:'전체'}].concat(data.categories);
  $('#sb-cats').innerHTML = all.map(function(c){
    var list = data.products.filter(function(p){ return c.id === 'all' || p.category === c.name; });
    var fail = c.id !== 'all' && list.some(function(p){ return p.screens.some(function(s){ return s.status === 'fail'; }); });
    var on = c.id === 'all' ? cat === 'all' : cat === c.name;
    return '<button data-sb-cat="'+esc(c.id === 'all' ? 'all' : c.name)+'" class="'+(on?'on':'')+'">'+esc(c.name)+'<span class="n">'+list.length+'</span>'+(fail?'<i class="al" title="실패 있음"></i>':'')+'</button>';
  }).join('');
}
function meta(p, scr){
  var n = counts(scr), target = scr.filter(function(s){ return TARGET[s.status]; }).length;
  if (p.excluded) return '<span class="g">모수 제외</span>';
  if (!target) return '<span class="g">검증 대상 없음</span>';
  if ((n.pass||0) === target) return '<span class="ok">전체 정상</span>';
  var parts = [];
  if (n.fail) parts.push('<span class="f">실패 '+n.fail+'</span>');
  if (n.flaky) parts.push('<span class="w">불안정 '+n.flaky+'</span>');
  if (n.smoke) parts.push('<span class="g">진입만 '+n.smoke+'</span>');
  if (n.unrun) parts.push('<span class="g">미실행 '+n.unrun+'</span>');
  return parts.join(' · ');
}
function renderTable(){
  var shown = data.products.filter(matches);
  var screens = shown.reduce(function(n,p){ return n + visible(p).length; }, 0);
  $('#sb-count').textContent = shown.length+'개 상품 · '+screens+'개 화면';
  if (!shown.length) { $('#sb-table').innerHTML = '<div class="sb-empty">조건에 맞는 상품이 없습니다. <button class="reset" data-sb-reset>초기화</button></div>'; return; }
  var k = q.trim().toLowerCase();
  var groups = data.categories.map(function(c){ return { c:c, list: shown.filter(function(p){ return p.category === c.name; }) }; }).filter(function(g){ return g.list.length; });
  $('#sb-table').innerHTML = '<table class="sb'+(names?'':' mini')+'"><colgroup><col class="c-cat"><col class="c-prod"><col><col class="c-ratio"></colgroup><thead><tr><th>카테고리</th><th>상품</th><th>화면별 정상 여부</th><th style="text-align:center">정상 / 대상</th></tr></thead>'
    + groups.map(function(g){
      var catFail = g.list.reduce(function(n,p){ return n + (counts(visible(p)).fail||0); }, 0);
      return '<tbody>' + g.list.map(function(p, i){
        var scr = visible(p), n = counts(scr), target = scr.filter(function(s){ return TARGET[s.status]; }).length, pass = n.pass||0;
        var cells = 0, cellsOk = 0;
        scr.forEach(function(s){ if (!TARGET[s.status]) return; PARTS.forEach(function(k){ cells++; if (s.parts[k] === 'pass' || s.parts[k] === 'flaky') cellsOk++; }); });
        return '<tr class="'+(p.excluded?'excl':'')+'">'
          + (i === 0 ? '<th class="cat" rowspan="'+g.list.length+'">'+esc(g.c.name)+'<div class="d">'+g.list.length+'개 상품'+(catFail?' · <span class="f">실패 '+catFail+'</span>':'')+'</div></th>' : '')
          + '<th class="prod" title="'+esc(p.name)+'">'+esc(p.name)+'<div class="m">'+meta(p, scr)+'</div></th>'
          + '<td><div class="sb-grid'+(names?'':' mini')+'">' + scr.map(function(s){
              var hit = k && (s.name+' '+s.route).toLowerCase().includes(k);
              return '<button class="scr '+s.status+(hit?' hit':'')+'" data-sb-scr="'+esc(p.id)+'|'+esc(s.route)+'" title="'+esc(s.name)+' · '+L[s.status]+'\n'+esc(partsText(s))+'\n'+esc(s.route)+'" aria-label="'+esc(s.name)+' '+L[s.status]+'"><span class="nm">'+esc(s.name)+'</span>'+partsHtml(s)+'</button>';
            }).join('') + '</div></td>'
          + '<td class="ratio">'+(target ? '<b>'+pass+'</b> / '+target+'<div class="cl" title="칸(목록·생성·상세) 중 검증된 칸">칸 '+cellsOk+'/'+cells+'</div><div class="mt"><i style="width:'+Math.round(pass/target*100)+'%"></i></div>' : '<span class="muted">—</span>')+'</td></tr>';
      }).join('') + '</tbody>';
    }).join('') + '</table>';
}
function why(s){
  var own = s.specs.filter(function(x){ return x.own; }), judged = own.length ? own : s.specs;
  var failed = judged.filter(function(x){ return x.status === 'fail'; });
  switch (s.status) {
    case 'pass': return ['정상 동작 확인', (own.length ? '자기 상품 spec '+own.length+'개' : '전제 단계로 지나는 spec '+s.specs.length+'개')+' 의 마지막 실행이 통과했습니다.'];
    case 'fail': return ['실패 내용', failed.map(function(x){ return x.spec+' ('+fmt(x.started)+')'+(x.error ? ': '+x.error : ''); }).join('\n') || '마지막 실행이 실패했습니다.'];
    case 'flaky': return ['불안정 · 마지막은 통과', '스위트 실행 최근 10회에 실패가 섞였습니다: '+judged.filter(function(x){ return x.flaky; }).map(function(x){ return x.spec; }).join(', ')];
    case 'unrun': return ['미실행', '시나리오는 있지만 실행 기록이 없습니다: '+judged.map(function(x){ return x.spec; }).join(', ')];
    case 'smoke': return ['진입 확인만', '스모크(화면 진입·제목 확인)만 있고 생성·수정·삭제를 검증하는 시나리오가 없습니다. 더 할지는 data/coverage-decisions.yaml 에 적습니다.'];
    case 'excluded': return ['제외', s.reason || '장부 메모의 사유로 제외'];
    default: return ['Service Home', '서비스 대시보드 화면. 검증 대상이 아닙니다.'];
  }
}
function detail(p, s){
  var w = why(s);
  var rows = s.specs.map(function(x){
    var where = x.parts.map(function(k){ return P[k]; }).concat(x.actions).join('·');
    return '<tr><td><span class="mono">'+esc(x.spec)+'</span> <span class="own '+(x.own?'':'no')+'">'+(x.own?'이 상품':'전제 단계')+'</span><br><span class="muted small">'+(where ? where+' · ' : '')+x.steps+'단계 지남 · 통과 '+x.passes+'/'+x.runs+(x.flaky?' · <span class="w">불안정</span>':'')+'</span></td>'
      + '<td>'+(x.status ? '<span class="badge '+x.status+'">'+(x.status==='pass'?'PASS':'FAIL')+'</span><br><span class="muted small">'+fmt(x.started)+' · '+secs(x.seconds)+'</span>' : '<span class="muted">기록 없음</span>')
      + (x.error ? '<span class="err">'+esc(x.error).slice(0,300)+'</span>' : '')
      + (x.attachments.length ? '<br>'+x.attachments.map(function(a){ return '<a class="att" href="../'+esc(a)+'" title="'+esc(a)+'">'+esc(a.split('/').pop())+'</a>'; }).join(' ') : '')
      + '</td></tr>';
  }).join('');
  return '<div class="dlg-h"><div class="dlg-p">'+esc(p.category)+' <span>/</span> '+esc(p.name)+'<button class="x" data-sb-close aria-label="닫기">✕</button></div>'
    + '<h3 id="sb-dlg-title">'+esc(s.name)+' <span class="sbdg '+s.status+'">'+L[s.status]+'</span>'+(s.level != null ? ' <span class="lv l'+s.level+'">L'+s.level+'</span>' : '')+'</h3>'
    + '<div class="rt mono muted">'+esc(s.route)+'</div></div>'
    + '<div class="dlg-b"><div class="why '+s.status+'"><b>'+esc(w[0])+'</b>'+esc(w[1]).replace(/\n/g,'<br>')+'</div>'
    + (s.status === 'home' || s.status === 'excluded' ? '' : '<h4>칸별 상태</h4><div class="same pts-row">'+PARTS.map(function(k){ var st = s.parts[k]; return '<span class="sbdg '+(st === 'none' ? 'unrun' : st)+'">'+P[k]+' · '+partLabel(st)+'</span>'; }).join(' ')+'</div>')
    + (s.decision ? '<h4>판단 (data/coverage-decisions.yaml)</h4><div class="why"><b>'+esc(s.decision.decision)+'</b>'+esc(s.decision.note||'')+'</div>' : '')
    + '<h4>이 화면을 지나는 회귀 spec '+s.specs.length+'개</h4>'
    + (rows ? '<table class="dlg-t"><thead><tr><th>spec</th><th>마지막 실행</th></tr></thead><tbody>'+rows+'</tbody></table>' : '<p class="muted">없음</p>')
    + '<h4>'+esc(p.name)+'의 다른 화면</h4><div class="same">'+p.screens.map(function(o){ return '<button data-sb-scr="'+esc(p.id)+'|'+esc(o.route)+'" class="'+(o.route===s.route?'on':'')+'">'+esc(o.name)+' · '+L[o.status]+'</button>'; }).join('')+'</div></div>';
}
function show(id){
  var i = id.indexOf('|'), p = data.products.find(function(x){ return x.id === id.slice(0,i); }); if (!p) return;
  var s = p.screens.find(function(x){ return x.route === id.slice(i+1); }); if (!s) return;
  var d = $('#sb-dlg'); if (!d.open) opener = document.activeElement;
  d.innerHTML = detail(p, s); if (!d.open) d.showModal(); d.scrollTop = 0;
}
function reset(){ cat='all'; st='all'; q=''; $('#sb-q').value=''; $('#sb-st').value='all'; renderCats(); renderTable(); syncTiles(); }
function syncTiles(){ document.querySelectorAll('.sb-sum button').forEach(function(b){ b.classList.toggle('on', b.dataset.sbStatus === st || (st === 'all' && b.dataset.sbStatus === 'all')); }); }
document.getElementById('screens').addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.sbScr) show(b.dataset.sbScr);
  else if (b.hasAttribute('data-sb-close')) { $('#sb-dlg').close(); if (opener && opener.isConnected) opener.focus(); }
  else if (b.dataset.sbCat !== undefined) { cat = b.dataset.sbCat; renderCats(); renderTable(); }
  else if (b.dataset.sbStatus !== undefined) { var v = b.dataset.sbStatus; st = v === 'excluded' ? 'all' : v; if (v === 'excluded') { showExcl = true; $('#sb-excl').checked = true; } $('#sb-st').value = st; syncTiles(); renderTable(); }
  else if (b.hasAttribute('data-sb-reset') || b.id === 'sb-reset') reset();
});
$('#sb-q').addEventListener('input', function(e){ q = e.target.value; renderTable(); });
$('#sb-st').addEventListener('change', function(e){ st = e.target.value; syncTiles(); renderTable(); });
$('#sb-names').addEventListener('change', function(e){ names = e.target.checked; renderTable(); });
$('#sb-home').addEventListener('change', function(e){ showHome = e.target.checked; renderTable(); });
$('#sb-excl').addEventListener('change', function(e){ showExcl = e.target.checked; renderTable(); });
renderCats(); renderTable(); syncTiles();
})();
`;
