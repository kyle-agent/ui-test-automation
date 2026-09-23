/**
 * reports/dashboard.html — 브라우저에서 보는 결과 대시보드 (자체 완결 HTML 한 파일, 외부 요청 없음).
 * 입력은 RESULTS.md 와 같다: 실행 기록(RunRecord), 커버리지 요약, 알려진 이슈, 탐색 보고서(recordings/explore/<이름>/report.md).
 * 파일 입출력은 scripts/results.ts 가 한다. 여기는 순수 함수(문자열 → 문자열)만 둔다 (tests/unit/dashboard.spec.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  LEVELS,
  LEVEL_LABEL,
  type CoverageEntry,
  type CoverageLevel,
  type CoverageSummary,
} from './coverage';
import type { KnownIssue } from './known-issues';
import { fmtSeconds, fmtTime, groupBySpec, meanPassSeconds, statusCell } from './results';
import type { RunRecord } from './run-record';

export const EXPLORE_DIR = path.resolve(process.cwd(), 'recordings', 'explore');

/** 탐색 보고서 요약: report.md 머리 부분에서 뽑는다 (src/jev/explorer.ts renderReport 형식) */
export interface ExploreSummary {
  name: string;
  dir: string;
  route: string;
  run_id: string;
  started: string;
  stop_reason: string;
  decisions: number;
  actions: number;
  cost: number;
  anomalies: number;
  infos: number;
}

export function parseExploreReport(markdown: string, dirName: string): ExploreSummary | null {
  const title = markdown.match(/^# 탐색 보고서: (.+)$/m)?.[1]?.trim();
  if (!title) return null;
  const head = markdown.match(/^- 라우트: `([^`]+)` · run_id (\S+) · (\S+)/m);
  const totals = markdown.match(
    /^- 결정 (\d+)회, 동작 (\d+)회, 비용 \$([\d.]+), 이상 (\d+)건, 정보 (\d+)건/m,
  );
  return {
    name: title,
    dir: dirName,
    route: head?.[1] ?? '',
    run_id: head?.[2] ?? '',
    started: head?.[3] ?? '',
    stop_reason: markdown.match(/^- 종료 사유: (.+)$/m)?.[1]?.trim() ?? '',
    decisions: Number(totals?.[1] ?? 0),
    actions: Number(totals?.[2] ?? 0),
    cost: Number(totals?.[3] ?? 0),
    anomalies: Number(totals?.[4] ?? 0),
    infos: Number(totals?.[5] ?? 0),
  };
}

/** recordings/explore/<이름>/report.md 를 최근 순으로 읽는다 */
export function readExploreSummaries(dir = EXPLORE_DIR): ExploreSummary[] {
  if (!fs.existsSync(dir)) return [];
  const out: ExploreSummary[] = [];
  for (const d of fs.readdirSync(dir).sort().reverse()) {
    const file = path.join(dir, d, 'report.md');
    if (!fs.existsSync(file)) continue;
    const s = parseExploreReport(fs.readFileSync(file, 'utf8'), d);
    if (s) out.push(s);
  }
  return out;
}

export interface DashboardInput {
  generated: string;
  records: readonly RunRecord[];
  suiteOrder: readonly string[];
  coverage: CoverageSummary | null;
  coverageErrors: readonly string[];
  entries: readonly CoverageEntry[];
  issues: readonly KnownIssue[];
  explores: readonly ExploreSummary[];
}

const esc = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pct = (n: number, d: number): number => (d === 0 ? 0 : Math.round((n / d) * 100));

function statusClass(r: RunRecord): string {
  return r.status === 'pass' ? 'pass' : r.class === 'environment' ? 'env' : 'fail';
}

function dots(runs: readonly RunRecord[], n = 10): string {
  return runs
    .slice(-n)
    .map(
      (r) =>
        `<span class="dot ${statusClass(r)}" title="${esc(fmtTime(r.started))} ${esc(statusCell(r))} ${esc(fmtSeconds(r.seconds))}"></span>`,
    )
    .join('');
}

function specRows(input: DashboardInput): string {
  const bySpec = groupBySpec(input.records);
  const specs = [
    ...input.suiteOrder,
    ...[...bySpec.keys()].filter((s) => !input.suiteOrder.includes(s)).sort(),
  ];
  return specs
    .map((spec) => {
      const runs = bySpec.get(spec) ?? [];
      const last = runs[runs.length - 1];
      if (!last)
        return `<tr><td class="mono">${esc(spec)}</td><td colspan="5" class="muted">기록 없음</td></tr>`;
      const passes = runs.filter((r) => r.status === 'pass').length;
      return `<tr>
        <td class="mono">${esc(spec)}</td>
        <td><span class="badge ${statusClass(last)}">${esc(statusCell(last))}</span></td>
        <td>${esc(fmtTime(last.started))}</td>
        <td class="num">${esc(fmtSeconds(last.seconds))}</td>
        <td class="dots">${dots(runs)} <span class="muted">${passes}/${runs.length}</span></td>
        <td class="num">${esc(fmtSeconds(meanPassSeconds(runs)))}</td>
      </tr>`;
    })
    .join('\n');
}

function runRows(records: readonly RunRecord[], limit = 40): string {
  return [...records]
    .reverse()
    .slice(0, limit)
    .map((r) => {
      const failedSteps = r.tests.flatMap((t) =>
        t.steps.filter((s) => s.status === 'fail').map((s) => s.title),
      );
      const detail =
        r.status === 'pass' ? '' : `${failedSteps[0] ? `[${failedSteps[0]}] ` : ''}${r.error ?? ''}`;
      const att = (r.attachments ?? [])[0];
      return `<tr class="run ${statusClass(r)}" data-status="${statusClass(r)}">
        <td>${esc(fmtTime(r.started))}</td>
        <td class="mono">${esc(r.spec)}</td>
        <td><span class="badge ${statusClass(r)}">${esc(statusCell(r))}</span></td>
        <td class="num">${esc(fmtSeconds(r.seconds))}</td>
        <td class="mono small">${esc(r.annotations.run_id ?? '')}</td>
        <td class="err">${esc(detail.slice(0, 220))}${att ? ` <span class="muted mono small">${esc(att)}</span>` : ''}</td>
      </tr>`;
    })
    .join('\n');
}

function coverageBlock(input: DashboardInput): string {
  const c = input.coverage;
  if (!c)
    return `<p class="warn">coverage.yaml 검증 실패 ${input.coverageErrors.length}건 — <code>npm run coverage</code></p><ul>${input.coverageErrors
      .map((e) => `<li>${esc(e)}</li>`)
      .join('')}</ul>`;
  const bar = (levels: Record<CoverageLevel, number>, total: number) =>
    `<div class="bar">${LEVELS.map(
      (l) =>
        `<span class="seg l${l}" style="width:${pct(levels[l], total)}%" title="L${l} ${LEVEL_LABEL[l]} ${levels[l]}"></span>`,
    ).join('')}</div>`;
  const cats = c.categories
    .map(
      (cat) => `<tr>
        <td>${esc(cat.category)}</td>
        <td class="num">${cat.resources}</td>
        ${LEVELS.map((l) => `<td class="num">${cat.levels[l] || ''}</td>`).join('')}
        <td class="num">${pct(cat.levels[2] + cat.levels[3] + cat.levels[4], cat.resources)}%</td>
        <td class="barcell">${bar(cat.levels, cat.resources)}</td>
      </tr>`,
    )
    .join('\n');
  const entries = [...input.entries]
    .sort(
      (a, b) => b.level - a.level || a.category.localeCompare(b.category, 'en') || a.key.localeCompare(b.key),
    )
    .map(
      (e) => `<tr class="res" data-level="${e.level}" data-cat="${esc(e.category)}">
        <td><span class="lv l${e.level}">L${e.level}</span></td>
        <td class="mono">${esc(e.key)}</td>
        <td>${esc(e.service)}</td>
        <td>${esc(e.category)}</td>
        <td class="mono small">${e.specs.map((s) => esc(s)).join('<br>')}</td>
        <td>${esc(e.last_pass ?? '')}</td>
        <td class="note">${esc(e.note)}</td>
      </tr>`,
    )
    .join('\n');
  return `
    <div class="cards">
      <div class="card"><div class="k">리소스(모집단)</div><div class="v">${c.resources}</div><div class="s">서비스 ${c.totals.services} · 화면 ${c.totals.screens} · 스모크 진입 ${c.totals.smoke_entries}</div></div>
      <div class="card"><div class="k">L2+ (CRUD 이상)</div><div class="v">${c.at_least_2} <span class="s">/ ${c.resources} · ${pct(c.at_least_2, c.resources)}%</span></div>${bar(c.levels, c.resources)}</div>
      <div class="card"><div class="k">L3+ (동작·통합)</div><div class="v">${c.at_least_3} <span class="s">/ ${c.resources} · ${pct(c.at_least_3, c.resources)}%</span></div><div class="s">${LEVELS.map((l) => `L${l} ${LEVEL_LABEL[l]} ${c.levels[l]}`).join(' · ')}</div></div>
    </div>
    <table>
      <thead><tr><th>카테고리</th><th class="num">리소스</th>${LEVELS.map((l) => `<th class="num">L${l}</th>`).join('')}<th class="num">L2+</th><th></th></tr></thead>
      <tbody>${cats}</tbody>
    </table>
    <details>
      <summary>리소스별 level (${input.entries.length})</summary>
      <div class="filters">level:
        <button data-lv="all" class="on">전체</button>${LEVELS.map((l) => `<button data-lv="${l}">L${l} ${LEVEL_LABEL[l]}</button>`).join('')}
      </div>
      <table id="res"><thead><tr><th>level</th><th>key</th><th>서비스</th><th>카테고리</th><th>specs</th><th>last_pass</th><th>note</th></tr></thead><tbody>${entries}</tbody></table>
    </details>`;
}

function exploreBlock(explores: readonly ExploreSummary[]): string {
  if (!explores.length) return '<p class="muted">탐색 보고서 없음 (npm run explore)</p>';
  const totalCost = explores.reduce((n, e) => n + e.cost, 0);
  const rows = explores
    .map(
      (e) => `<tr>
        <td>${esc(e.started.replace('T', ' '))}</td>
        <td>${esc(e.name)}</td>
        <td class="mono small">${esc(e.route)}</td>
        <td class="num">${e.decisions}/${e.actions}</td>
        <td class="num">${e.anomalies ? `<span class="badge fail">${e.anomalies}</span>` : '0'}</td>
        <td class="num">${e.infos}</td>
        <td class="num">$${e.cost.toFixed(4)}</td>
        <td>${esc(e.stop_reason)}</td>
        <td class="mono small">recordings/explore/${esc(e.dir)}/report.md</td>
      </tr>`,
    )
    .join('\n');
  return `<p class="muted">탐색 ${explores.length}회 · 이상 ${explores.reduce((n, e) => n + e.anomalies, 0)}건 · 정보 ${explores.reduce((n, e) => n + e.infos, 0)}건 · 누적 비용 $${totalCost.toFixed(4)} (Level 5, 커버리지 분모에 넣지 않음)</p>
    <table><thead><tr><th>시각</th><th>이름</th><th>라우트</th><th class="num">결정/동작</th><th class="num">이상</th><th class="num">정보</th><th class="num">비용</th><th>종료 사유</th><th>보고서</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function issuesBlock(input: DashboardInput): string {
  const applied = new Map<string, number>();
  for (const r of input.records)
    if (r.known_issue) applied.set(r.known_issue, (applied.get(r.known_issue) ?? 0) + 1);
  if (!input.issues.length) return '<p class="muted">등록된 알려진 이슈 없음 (data/known-issues.yaml)</p>';
  return `<table><thead><tr><th>id</th><th>kind</th><th>spec</th><th>활성</th><th class="num">적용</th><th>note</th></tr></thead><tbody>${input.issues
    .map(
      (i) =>
        `<tr><td class="mono">${esc(i.id)}</td><td>${esc(i.kind)}</td><td class="mono small">${esc(i.spec)}</td><td>${i.enabled ? '예' : '아니오'}</td><td class="num">${applied.get(i.id) ?? 0}</td><td class="note">${esc(i.note)}</td></tr>`,
    )
    .join('')}</tbody></table>`;
}

export function renderDashboardHtml(input: DashboardInput): string {
  const records = input.records;
  const bySpec = groupBySpec(records);
  const lastOfEach = [...bySpec.values()].map((runs) => runs[runs.length - 1]!);
  const greenNow = lastOfEach.filter((r) => r.status === 'pass').length;
  const specsWithRecords = lastOfEach.length;
  const passTotal = records.filter((r) => r.status === 'pass').length;
  const failClasses = records
    .filter((r) => r.status === 'fail')
    .reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.class]: (acc[r.class] ?? 0) + 1 }), {});
  const lastRun = records[records.length - 1];
  const dayAgg = new Map<string, { pass: number; fail: number }>();
  for (const r of records) {
    const day = fmtTime(r.started).slice(0, 10);
    const d = dayAgg.get(day) ?? { pass: 0, fail: 0 };
    d[r.status]++;
    dayAgg.set(day, d);
  }
  const days = [...dayAgg].slice(-30);
  const maxDay = Math.max(1, ...days.map(([, d]) => d.pass + d.fail));
  const trend = days
    .map(
      ([day, d]) =>
        `<div class="col" title="${esc(day)} 통과 ${d.pass} 실패 ${d.fail}"><div class="stack"><span class="fail" style="height:${(d.fail / maxDay) * 100}%"></span><span class="pass" style="height:${(d.pass / maxDay) * 100}%"></span></div><div class="lbl">${esc(day.slice(5))}</div></div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SCP 콘솔 회귀 대시보드</title>
<style>
  :root { --bg:#f6f7f9; --card:#fff; --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; --pass:#16a34a; --fail:#dc2626; --env:#d97706;
          --l0:#e5e7eb; --l1:#bfdbfe; --l2:#60a5fa; --l3:#2563eb; --l4:#1e3a8a; }
  * { box-sizing:border-box }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 -apple-system,"Segoe UI","Malgun Gothic",Roboto,sans-serif; }
  header { background:#111827; color:#fff; padding:14px 24px; display:flex; gap:16px; align-items:baseline; flex-wrap:wrap }
  header h1 { margin:0; font-size:18px } header .muted { color:#9ca3af }
  main { max-width:1400px; margin:0 auto; padding:16px 24px 48px }
  section { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:16px 20px; margin:16px 0 }
  h2 { margin:0 0 12px; font-size:16px } h2 small { color:var(--muted); font-weight:normal; margin-left:8px }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-bottom:12px }
  .card { border:1px solid var(--line); border-radius:8px; padding:12px 14px; background:#fafafa }
  .card .k { color:var(--muted); font-size:12px } .card .v { font-size:28px; font-weight:600; line-height:1.2 } .card .s { color:var(--muted); font-size:12px }
  table { width:100%; border-collapse:collapse; font-size:13px } th,td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); vertical-align:top }
  th { color:var(--muted); font-weight:600; font-size:12px; white-space:nowrap } .num { text-align:right; white-space:nowrap }
  .mono { font-family:Consolas,"SFMono-Regular",Menlo,monospace; font-size:12px } .small { font-size:11px } .muted { color:var(--muted) } .note { color:#374151; font-size:12px }
  .err { font-family:Consolas,Menlo,monospace; font-size:11px; color:#7f1d1d; word-break:break-all }
  .badge { display:inline-block; padding:1px 8px; border-radius:10px; font-size:11px; font-weight:600; color:#fff; white-space:nowrap }
  .badge.pass { background:var(--pass) } .badge.fail { background:var(--fail) } .badge.env { background:var(--env) }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:2px } .dot.pass{background:var(--pass)} .dot.fail{background:var(--fail)} .dot.env{background:var(--env)}
  .dots { white-space:nowrap }
  .bar { display:flex; height:10px; border-radius:5px; overflow:hidden; background:var(--l0); margin-top:6px; min-width:120px }
  .seg { display:block; height:100% } .l0{background:var(--l0)} .l1{background:var(--l1)} .l2{background:var(--l2)} .l3{background:var(--l3)} .l4{background:var(--l4)}
  .lv { display:inline-block; min-width:28px; text-align:center; border-radius:4px; font-size:11px; font-weight:600; padding:1px 4px; color:#111 } .lv.l3,.lv.l4{color:#fff}
  .barcell { width:160px }
  .filters { margin:8px 0 } .filters button { border:1px solid var(--line); background:#fff; border-radius:4px; padding:2px 8px; margin-right:4px; cursor:pointer; font-size:12px } .filters button.on { background:#111827; color:#fff; border-color:#111827 }
  .trend { display:flex; gap:6px; align-items:flex-end; height:110px; padding:4px 0 } .col { flex:0 0 32px; text-align:center }
  .stack { display:flex; flex-direction:column-reverse; height:80px; justify-content:flex-start } .stack span { display:block; width:100% } .stack .pass{background:var(--pass)} .stack .fail{background:var(--fail)}
  .lbl { font-size:10px; color:var(--muted) }
  details summary { cursor:pointer; color:#2563eb; margin:8px 0 }
  .warn { color:var(--fail) }
  .legend span { display:inline-block; margin-right:12px; font-size:12px } .legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:middle }
  @media (max-width:800px) { main{padding:8px 16px} .barcell{display:none} th:nth-child(6),td:nth-child(6){display:none} }
</style>
</head>
<body>
<header>
  <h1>SCP 콘솔 회귀 대시보드</h1>
  <span class="muted">생성 ${esc(input.generated)} · 실행 기록 ${records.length}건 · 마지막 실행 ${lastRun ? esc(fmtTime(lastRun.started)) + ' ' + esc(lastRun.spec) : '없음'}</span>
  <span class="muted">원본: reports/runs/*.json · service-map/coverage.yaml · data/known-issues.yaml · recordings/explore/*/report.md — <code>npm run results</code> 로 재생성</span>
</header>
<main>
<section>
  <h2>요약</h2>
  <div class="cards">
    <div class="card"><div class="k">현재 녹색 spec</div><div class="v">${greenNow} <span class="s">/ ${specsWithRecords} (스위트 ${input.suiteOrder.length})</span></div><div class="s">각 spec 의 마지막 실행 기준</div></div>
    <div class="card"><div class="k">통과율(전체 기록)</div><div class="v">${pct(passTotal, records.length)}% <span class="s">${passTotal}/${records.length}</span></div><div class="s">실패 분류: ${esc(
      Object.entries(failClasses)
        .map(([k, v]) => `${k} ${v}`)
        .join(' · ') || '없음',
    )}</div></div>
    <div class="card"><div class="k">커버리지 L2+</div><div class="v">${input.coverage ? `${pct(input.coverage.at_least_2, input.coverage.resources)}%` : '-'} <span class="s">${input.coverage ? `${input.coverage.at_least_2}/${input.coverage.resources} 리소스` : '검증 실패'}</span></div><div class="s">L3+ ${input.coverage?.at_least_3 ?? '-'} · 탐색 ${input.explores.length}회</div></div>
  </div>
  <div class="trend">${trend || '<span class="muted">기록 없음</span>'}</div>
  <div class="legend"><span><i style="background:var(--pass)"></i>통과</span><span><i style="background:var(--fail)"></i>실패</span><span><i style="background:var(--env)"></i>환경(세션·브라우저)</span></div>
</section>

<section>
  <h2>spec 별 최근 상태 <small>실행 순서 = src/report/suite.ts</small></h2>
  <table><thead><tr><th>spec</th><th>결과</th><th>마지막 실행</th><th class="num">소요</th><th>최근 10회</th><th class="num">통과 평균</th></tr></thead>
  <tbody>${specRows(input)}</tbody></table>
</section>

<section>
  <h2>실행 기록 <small>최신 ${Math.min(40, records.length)}건</small></h2>
  <div class="filters">보기:
    <button data-st="all" class="on">전체</button><button data-st="fail">실패</button><button data-st="env">환경</button><button data-st="pass">통과</button>
  </div>
  <table id="runs"><thead><tr><th>시작</th><th>spec</th><th>결과</th><th class="num">소요</th><th>run_id</th><th>실패 단계 · 오류 · 첨부</th></tr></thead>
  <tbody>${runRows(records)}</tbody></table>
</section>

<section>
  <h2>커버리지 <small>service-map/coverage.yaml · level 0 없음 · 1 진입 · 2 CRUD · 3 동작 · 4 통합</small></h2>
  <div class="legend">${LEVELS.map((l) => `<span><i class="l${l}"></i>L${l} ${LEVEL_LABEL[l]}</span>`).join('')}</div>
  ${coverageBlock(input)}
</section>

<section>
  <h2>탐색(Level 5, Jev) <small>recordings/explore</small></h2>
  ${exploreBlock(input.explores)}
</section>

<section>
  <h2>알려진 이슈 <small>data/known-issues.yaml</small></h2>
  ${issuesBlock(input)}
</section>
</main>
<script>
  document.querySelectorAll('.filters').forEach(function (box) {
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      box.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
      if (b.dataset.st !== undefined) document.querySelectorAll('#runs tr.run').forEach(function (tr) { tr.style.display = b.dataset.st === 'all' || tr.dataset.status === b.dataset.st ? '' : 'none'; });
      if (b.dataset.lv !== undefined) document.querySelectorAll('#res tr.res').forEach(function (tr) { tr.style.display = b.dataset.lv === 'all' || tr.dataset.level === b.dataset.lv ? '' : 'none'; });
    });
  });
</script>
</body>
</html>
`;
}
