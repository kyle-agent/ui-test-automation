/**
 * reports/dashboard.html — 브라우저에서 보는 결과 대시보드 (자체 완결 HTML 한 파일, 외부 요청 없음).
 * 입력: 실행 기록(RunRecord), 스위트 요약(reports/suites), 커버리지 요약, API 대응표, 알려진 이슈, 탐색 보고서(recordings/explore/<이름>/report.md).
 * 첫 화면은 "마지막 스위트 · 핵심 지표 · 조치 필요" (대시보드 1단계, 2026-10-02). 파생 지표는 src/report/insights.ts.
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
import {
  CAUSE_LABEL,
  CAUSE_ORDER,
  failureViews,
  groupBySignature,
  isFlakySpec,
  type Cause,
  type FailureView,
  type ParityRow,
  type SuiteView,
} from './insights';
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
  /** reports/suites 요약(최근 순). 없으면 스위트 카드·이력이 비어 보인다 */
  suites?: readonly SuiteView[];
  /** docs/api-ui-parity.md 의 행 */
  parity?: readonly ParityRow[];
  /** 7일·14일 창의 기준 시각(테스트용). 기본 지금 */
  now?: Date;
}

const esc = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pct = (n: number, d: number): number => (d === 0 ? 0 : Math.round((n / d) * 100));

const DAY = 86_400_000;

function statusClass(r: RunRecord): string {
  return r.status === 'pass' ? 'pass' : r.class === 'environment' ? 'env' : 'fail';
}

/** 첨부 중 그 spec 자신의 것만: 공유 CDP 브라우저에서 Playwright 의 test-failed-N.png 는 다른 탭(다른 spec)을 찍는다(2026-09-30 확인) */
function ownAttachments(list: readonly string[] | undefined): string[] {
  const own = (list ?? []).filter((p) => !/\/test-failed-\d+\.png$/.test(p));
  const rank = (p: string) => (/screenshot-/.test(p) ? 0 : /trace\.zip$/.test(p) ? 1 : 2);
  return [...own].sort((a, b) => rank(a) - rank(b));
}

/** reports/dashboard.html 기준 상대 링크 (첨부는 저장소 루트 기준 경로로 기록됨) */
function attachmentLink(p: string): string {
  const name = p.split('/').pop() ?? p;
  return `<a class="att" href="../${esc(p)}" title="${esc(p)}">${esc(name)}</a>`;
}

function causeBadge(c: Cause): string {
  return `<span class="cause c-${c}">${esc(CAUSE_LABEL[c])}</span>`;
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

function specRow(spec: string, runs: readonly RunRecord[], causeOfLast: Cause | undefined): string {
  const suiteRuns = runs.filter((r) => r.suite_id);
  const last = runs[runs.length - 1];
  if (!last) return `<tr><td class="mono">${esc(spec)}</td><td colspan="5" class="muted">기록 없음</td></tr>`;
  const recent = runs.slice(-10);
  const passes = recent.filter((r) => r.status === 'pass').length;
  const flaky = isFlakySpec(suiteRuns);
  return `<tr>
        <td class="mono">${esc(spec)}${flaky ? ' <span class="tag warn">불안정</span>' : ''}</td>
        <td><span class="badge ${statusClass(last)}">${esc(statusCell(last))}</span>${last.status === 'fail' && causeOfLast ? ' ' + causeBadge(causeOfLast) : ''}</td>
        <td>${esc(fmtTime(last.started))}</td>
        <td class="num">${esc(fmtSeconds(last.seconds))}</td>
        <td class="dots">${dots(runs)} <span class="muted">${passes}/${recent.length}</span></td>
        <td class="num">${esc(fmtSeconds(meanPassSeconds(runs)))}</td>
      </tr>`;
}

function runRows(records: readonly RunRecord[], causes: Map<RunRecord, Cause>, limit = 60): string {
  return [...records]
    .reverse()
    .slice(0, limit)
    .map((r) => {
      const failedSteps = r.tests.flatMap((t) => t.steps.filter((s) => s.status === 'fail').map((s) => s.title));
      const detail = r.status === 'pass' ? '' : `${failedSteps[0] ? `[${failedSteps[0]}] ` : ''}${r.error ?? ''}`;
      const cause = causes.get(r);
      const att = ownAttachments(r.attachments).slice(0, 3).map(attachmentLink).join(' ');
      return `<tr class="run ${statusClass(r)}" data-status="${r.status === 'pass' ? 'pass' : (cause ?? 'unclassified')}">
        <td>${esc(fmtTime(r.started))}</td>
        <td class="mono">${esc(r.spec)}</td>
        <td><span class="badge ${statusClass(r)}">${esc(statusCell(r))}</span>${cause ? ' ' + causeBadge(cause) : ''}</td>
        <td class="num">${esc(fmtSeconds(r.seconds))}</td>
        <td class="mono small">${esc(r.suite_id ? `${r.suite_id}${r.attempt && r.attempt > 1 ? ` #${r.attempt}` : ''}` : '')}</td>
        <td class="err"><details><summary>${esc(detail.slice(0, 140) || '')}</summary>${esc(detail)}</details>${att ? `<div>${att}</div>` : ''}</td>
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
    .sort((a, b) => b.level - a.level || a.category.localeCompare(b.category, 'en') || a.key.localeCompare(b.key))
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

function parityBlock(rows: readonly ParityRow[]): string {
  if (!rows.length) return '<p class="muted">대응표 없음 (docs/api-ui-parity.md)</p>';
  const cats = [...new Set(rows.map((r) => r.category))];
  const count = (list: readonly ParityRow[], s: ParityRow['status']) => list.filter((r) => r.status === s).length;
  const catRows = cats
    .map((cat) => {
      const list = rows.filter((r) => r.category === cat);
      return `<tr><td>${esc(cat)}</td><td class="num">${count(list, 'done')}</td><td class="num">${count(list, 'wip') || ''}</td><td class="num">${count(list, 'skip') || ''}</td></tr>`;
    })
    .join('');
  const mark = { done: '✅', wip: '🔧', skip: '⏭' } as const;
  const detail = rows
    .map(
      (r) =>
        `<tr><td>${mark[r.status]}</td><td>${esc(r.category)}</td><td class="small">${esc(r.api)}</td><td class="small">${esc(r.ui)}</td></tr>`,
    )
    .join('');
  return `<table class="compact"><thead><tr><th>분류</th><th class="num">✅ 화면 자동화</th><th class="num">🔧 진행</th><th class="num">⏭ 제외</th></tr></thead><tbody>${catRows}</tbody></table>
    <details><summary>항목별 (${rows.length})</summary><table><thead><tr><th></th><th>분류</th><th>API 리소스</th><th>UI spec · 비고</th></tr></thead><tbody>${detail}</tbody></table></details>`;
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
        <td class="small"><a href="../recordings/explore/${esc(e.dir)}/report.md">recordings/explore/${esc(e.dir)}/report.md</a></td>
      </tr>`,
    )
    .join('\n');
  return `<p class="muted">탐색 ${explores.length}회 · 이상 ${explores.reduce((n, e) => n + e.anomalies, 0)}건 · 정보 ${explores.reduce((n, e) => n + e.infos, 0)}건 · 누적 비용 $${totalCost.toFixed(4)} (Level 5, 커버리지 분모에 넣지 않음)</p>
    <table><thead><tr><th>시각</th><th>이름</th><th>라우트</th><th class="num">결정/동작</th><th class="num">이상</th><th class="num">정보</th><th class="num">비용</th><th>종료 사유</th><th>보고서</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function issuesBlock(input: DashboardInput): string {
  const applied = new Map<string, number>();
  for (const r of input.records) if (r.known_issue) applied.set(r.known_issue, (applied.get(r.known_issue) ?? 0) + 1);
  if (!input.issues.length) return '<p class="muted">등록된 알려진 이슈 없음 (data/known-issues.yaml)</p>';
  return `<table><thead><tr><th>id</th><th>kind</th><th>spec</th><th>활성</th><th class="num">적용</th><th>note</th></tr></thead><tbody>${input.issues
    .map(
      (i) =>
        `<tr><td class="mono">${esc(i.id)}</td><td>${esc(i.kind)}</td><td class="mono small">${esc(i.spec)}</td><td>${i.enabled ? '예' : '아니오'}</td><td class="num">${applied.get(i.id) ?? 0}</td><td class="note">${esc(i.note)}</td></tr>`,
    )
    .join('')}</tbody></table>`;
}

export function renderDashboardHtml(input: DashboardInput): string {
  const now = input.now ?? new Date();
  const records = input.records;
  const bySpec = groupBySpec(records);
  const suiteSet = new Set(input.suiteOrder);
  const views = failureViews(records);
  const causeByRecord = new Map<RunRecord, Cause>(views.map((v) => [v.record, v.cause]));

  // 현재 녹색: 스위트에 있는 spec 의 마지막 실행 기준(제외·구 spec 은 빼고)
  const suiteLasts = input.suiteOrder.map((s) => bySpec.get(s)?.at(-1)).filter((r): r is RunRecord => !!r);
  const greenNow = suiteLasts.filter((r) => r.status === 'pass').length;
  // 불안정: 병렬 스위트 실행 기록(suite_id 있음)만 본다. 개발 중 고쳐 가며 돌린 실패까지 넣으면 거의 전부가 불안정으로 나온다(2026-10-02)
  const suiteRunsOf = (s: string) => (bySpec.get(s) ?? []).filter((r) => r.suite_id);
  const hasSuiteRuns = records.some((r) => r.suite_id);
  const flakySpecs = input.suiteOrder.filter((s) => isFlakySpec(suiteRunsOf(s)));

  // 최근 7일 실패 원인
  const weekViews = views.filter((v) => now.getTime() - Date.parse(v.record.started) < 7 * DAY);
  const causeCount = (list: readonly FailureView[]) =>
    CAUSE_ORDER.map((c) => [c, list.filter((v) => v.cause === c).length] as const).filter(([, n]) => n > 0);
  const weekCauses = causeCount(weekViews);
  const weekRuns = records.filter((r) => now.getTime() - Date.parse(r.started) < 7 * DAY);

  const suites = input.suites ?? [];
  const lastSuite = suites[0];
  const parity = input.parity ?? [];
  const parityDone = parity.filter((r) => r.status === 'done').length;
  const parityDenom = parity.filter((r) => r.status !== 'skip').length;

  // 조치 필요: 마지막 실행이 실패인 스위트 spec(원인 포함), 정리 실패(7일), 남은 리소스, 불안정, 대응표 진행 중
  const actions: string[] = [];
  for (const s of input.suiteOrder) {
    const last = bySpec.get(s)?.at(-1);
    if (last?.status === 'fail') {
      const c = causeByRecord.get(last) ?? 'unclassified';
      const att = ownAttachments(last.attachments).slice(0, 2).map(attachmentLink).join(' ');
      actions.push(
        `<li class="act c-${c}">${causeBadge(c)} <span class="mono">${esc(s)}</span> <span class="muted">${esc(fmtTime(last.started))}</span> <span class="err">${esc((last.error ?? '').slice(0, 160))}</span> ${att}</li>`,
      );
    }
  }
  if (lastSuite?.leftovers_end?.length)
    actions.push(
      `<li class="act c-cleanup">${causeBadge('cleanup')} 마지막 스위트 뒤 남은 리소스 ${lastSuite.leftovers_end.length}개: <span class="mono small">${esc(lastSuite.leftovers_end.join(', '))}</span> → <code>npm run stacks:cleanup</code></li>`,
    );
  const weekCleanup = weekViews.filter((v) => v.cause === 'cleanup');
  if (weekCleanup.length)
    actions.push(
      `<li class="act c-cleanup">${causeBadge('cleanup')} 최근 7일 정리 실패 ${weekCleanup.length}건 (${esc([...new Set(weekCleanup.map((v) => v.record.spec))].join(', '))}) — 남은 리소스 확인</li>`,
    );
  if (flakySpecs.length)
    actions.push(
      `<li class="act c-flaky"><span class="tag warn">불안정</span> 최근 10회에 실패가 섞인 spec ${flakySpecs.length}개: <span class="mono small">${esc(flakySpecs.join(', '))}</span></li>`,
    );
  for (const r of parity.filter((p) => p.status === 'wip'))
    actions.push(`<li class="act">🔧 API 대응 진행 중: ${esc(r.category)} · ${esc(r.api)}</li>`);

  // 실패 묶음(최근 14일)
  const groups = groupBySignature(views.filter((v) => now.getTime() - Date.parse(v.record.started) < 14 * DAY)).slice(0, 25);
  const groupRows = groups
    .map(
      (g) => `<tr data-cause="${g.cause}">
        <td>${causeBadge(g.cause)}</td>
        <td class="num">${g.count}</td>
        <td class="err">${esc(g.signature)}</td>
        <td class="mono small">${g.specs.map(esc).join('<br>')}</td>
        <td>${esc(fmtTime(g.latest.started))}</td>
        <td>${ownAttachments(g.latest.attachments).slice(0, 2).map(attachmentLink).join(' ')}</td>
      </tr>`,
    )
    .join('\n');

  // 스위트 이력
  const suiteRows = suites
    .slice(0, 10)
    .map(
      (s) => `<tr>
        <td class="mono">${esc(s.suite_id)}</td>
        <td>${esc(fmtTime(s.started))}</td>
        <td class="num">${s.first_pass}/${s.specs} <span class="muted">(${pct(s.first_pass, s.specs)}%)</span></td>
        <td class="num">${s.final_pass}/${s.specs}${s.attempts > 1 ? ` <span class="muted">· ${s.attempts}회</span>` : ''}</td>
        <td class="num">${s.wall_minutes}분 <span class="muted">/ 직렬 ${s.serial_minutes}분 · 탭 ${s.max_tabs}</span></td>
        <td class="small">${s.leftovers_end === null ? '<span class="muted">확인 실패</span>' : s.leftovers_end.length ? `<span class="warn">${s.leftovers_end.length}개</span>` : '0'}</td>
        <td class="mono small">${esc(s.still_failing.join(', '))}</td>
      </tr>`,
    )
    .join('\n');

  // 일별 막대(재실행 포함)
  const dayAgg = new Map<string, { pass: number; fail: number }>();
  for (const r of records) {
    const day = fmtTime(r.started).slice(0, 10);
    const d = dayAgg.get(day) ?? { pass: 0, fail: 0 };
    d[r.status]++;
    dayAgg.set(day, d);
  }
  const days = [...dayAgg].slice(-21);
  const maxDay = Math.max(1, ...days.map(([, d]) => d.pass + d.fail));
  const trend = days
    .map(
      ([day, d]) =>
        `<div class="col" title="${esc(day)} 통과 ${d.pass} 실패 ${d.fail}"><div class="stack"><span class="fail" style="height:${(d.fail / maxDay) * 100}%"></span><span class="pass" style="height:${(d.pass / maxDay) * 100}%"></span></div><div class="lbl">${esc(day.slice(5))}</div></div>`,
    )
    .join('');

  const otherSpecs = [...bySpec.keys()].filter((s) => !suiteSet.has(s)).sort();
  const c = input.coverage;
  const lastRun = records[records.length - 1];

  const kpi = (k: string, v: string, s: string, cls = '') =>
    `<div class="card ${cls}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SCP 콘솔 회귀 대시보드</title>
<style>
  :root { --bg:#f4f5f7; --card:#fff; --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; --pass:#16a34a; --fail:#dc2626; --env:#d97706;
          --c-product:#b91c1c; --c-unclassified:#7c3aed; --c-cleanup:#c2410c; --c-test:#0369a1; --c-flaky:#a16207; --c-environment:#6b7280;
          --l0:#e5e7eb; --l1:#bfdbfe; --l2:#60a5fa; --l3:#2563eb; --l4:#1e3a8a; }
  * { box-sizing:border-box }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 -apple-system,"Segoe UI","Malgun Gothic",Roboto,sans-serif; }
  header { background:#111827; color:#fff; padding:14px 24px 0; }
  header .top { display:flex; gap:16px; align-items:baseline; flex-wrap:wrap }
  header h1 { margin:0; font-size:18px } header .muted { color:#9ca3af; font-size:12px }
  nav { display:flex; gap:2px; flex-wrap:wrap; margin-top:10px } nav a { color:#d1d5db; text-decoration:none; padding:6px 12px; font-size:13px; border-radius:6px 6px 0 0 } nav a:hover { background:#1f2937; color:#fff }
  main { max-width:1400px; margin:0 auto; padding:8px 24px 48px }
  section { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:16px 20px; margin:16px 0; scroll-margin-top:12px }
  h2 { margin:0 0 12px; font-size:16px } h2 small { color:var(--muted); font-weight:normal; margin-left:8px; font-size:12px }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin-bottom:12px }
  .card { border:1px solid var(--line); border-radius:8px; padding:12px 14px; background:#fafafa }
  .card.alert { border-color:#fca5a5; background:#fef2f2 }
  .card .k { color:var(--muted); font-size:12px } .card .v { font-size:26px; font-weight:600; line-height:1.25 } .card .v .s { font-size:13px; font-weight:400 } .card .s { color:var(--muted); font-size:12px }
  table { width:100%; border-collapse:collapse; font-size:13px } th,td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); vertical-align:top }
  table.compact { width:auto; min-width:420px }
  th { color:var(--muted); font-weight:600; font-size:12px; white-space:nowrap } .num { text-align:right; white-space:nowrap }
  .mono { font-family:Consolas,"SFMono-Regular",Menlo,monospace; font-size:12px } .small { font-size:11px } .muted { color:var(--muted) } .note { color:#374151; font-size:12px }
  .err { font-family:Consolas,Menlo,monospace; font-size:11px; color:#7f1d1d; word-break:break-all }
  .err details summary { color:#7f1d1d; margin:0 }
  .badge { display:inline-block; padding:1px 8px; border-radius:10px; font-size:11px; font-weight:600; color:#fff; white-space:nowrap }
  .badge.pass { background:var(--pass) } .badge.fail { background:var(--fail) } .badge.env { background:var(--env) }
  .cause { display:inline-block; padding:0 6px; border-radius:4px; font-size:11px; font-weight:600; border:1px solid currentColor; white-space:nowrap }
  .c-product{color:var(--c-product)} .c-unclassified{color:var(--c-unclassified)} .c-cleanup{color:var(--c-cleanup)} .c-test{color:var(--c-test)} .c-flaky{color:var(--c-flaky)} .c-environment{color:var(--c-environment)}
  .tag { display:inline-block; padding:0 6px; border-radius:4px; font-size:11px; font-weight:600 } .tag.warn { background:#fef3c7; color:#92400e }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:2px } .dot.pass{background:var(--pass)} .dot.fail{background:var(--fail)} .dot.env{background:var(--env)}
  .dots { white-space:nowrap }
  .bar { display:flex; height:10px; border-radius:5px; overflow:hidden; background:var(--l0); margin-top:6px; min-width:120px }
  .seg { display:block; height:100% } .l0{background:var(--l0)} .l1{background:var(--l1)} .l2{background:var(--l2)} .l3{background:var(--l3)} .l4{background:var(--l4)}
  .lv { display:inline-block; min-width:28px; text-align:center; border-radius:4px; font-size:11px; font-weight:600; padding:1px 4px; color:#111 } .lv.l3,.lv.l4{color:#fff}
  .barcell { width:160px }
  .filters { margin:8px 0 } .filters button { border:1px solid var(--line); background:#fff; border-radius:4px; padding:2px 8px; margin-right:4px; cursor:pointer; font-size:12px } .filters button.on { background:#111827; color:#fff; border-color:#111827 }
  .trend { display:flex; gap:6px; align-items:flex-end; height:100px; padding:4px 0 } .col { flex:0 0 30px; text-align:center }
  .stack { display:flex; flex-direction:column-reverse; height:72px; justify-content:flex-start } .stack span { display:block; width:100% } .stack .pass{background:var(--pass)} .stack .fail{background:var(--fail)}
  .lbl { font-size:10px; color:var(--muted) }
  details summary { cursor:pointer; color:#2563eb; margin:8px 0 }
  .warn { color:var(--fail) }
  .legend span { display:inline-block; margin-right:12px; font-size:12px } .legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:middle }
  ul.actions { list-style:none; padding:0; margin:0 } ul.actions li { padding:6px 8px; border-left:3px solid currentColor; margin:4px 0; background:#fafafa; color:var(--ink) }
  ul.actions li.c-product{border-color:var(--c-product)} ul.actions li.c-unclassified{border-color:var(--c-unclassified)} ul.actions li.c-cleanup{border-color:var(--c-cleanup)} ul.actions li.c-flaky{border-color:var(--c-flaky)} ul.actions li.c-environment{border-color:var(--c-environment)} ul.actions li.c-test{border-color:var(--c-test)}
  .causes span { margin-right:10px; white-space:nowrap }
  a.att { font-size:11px; margin-right:6px }
  @media (max-width:800px) { main{padding:8px 16px} .barcell{display:none} }
</style>
</head>
<body>
<header>
  <div class="top">
    <h1>SCP 콘솔 회귀 대시보드</h1>
    <span class="muted">${lastSuite ? `마지막 스위트 ${esc(lastSuite.suite_id)} · ${esc(fmtTime(lastSuite.started))} · ${lastSuite.specs} spec · 탭 ${lastSuite.max_tabs} · ${lastSuite.wall_minutes}분` : '스위트 요약 없음'} · 마지막 실행 ${lastRun ? esc(fmtTime(lastRun.started)) + ' ' + esc(lastRun.spec) : '없음'} · 생성 ${esc(input.generated)}</span>
  </div>
  <nav><a href="#summary">요약</a><a href="#actions">조치 필요</a><a href="#specs">spec 상태</a><a href="#failures">실패 분류</a><a href="#suites">스위트 이력</a><a href="#coverage">커버리지</a><a href="#parity">API 대응</a><a href="#explore">탐색</a><a href="#runs">실행 기록</a><a href="#issues">알려진 이슈</a></nav>
</header>
<main>
<section id="summary">
  <h2>요약 <small>원본: reports/runs · reports/suites · service-map/coverage.yaml · docs/api-ui-parity.md — <code>npm run results</code> 로 재생성</small></h2>
  <div class="cards">
    ${kpi('현재 녹색 spec', `${greenNow} <span class="s">/ ${input.suiteOrder.length}</span>`, `스위트 spec 의 마지막 실행 기준 · 기록 없음 ${input.suiteOrder.length - suiteLasts.length}`, greenNow < suiteLasts.length ? 'alert' : '')}
    ${kpi('마지막 스위트 첫 시도', lastSuite ? `${pct(lastSuite.first_pass, lastSuite.specs)}% <span class="s">${lastSuite.first_pass}/${lastSuite.specs}</span>` : '-', lastSuite ? `최종 ${lastSuite.final_pass}/${lastSuite.specs}${lastSuite.attempts > 1 ? ` (재실행 ${lastSuite.attempts - 1}회)` : ''}` : '병렬 스위트(npm run test:suite) 기록부터')}
    ${kpi('최근 7일 실패 <span class="s">(개발 중 재실행 포함)</span>', `${weekViews.length} <span class="s">/ 실행 ${weekRuns.length}</span>`, `<span class="causes">${weekCauses.map(([k, n]) => `<span class="c-${k}">${esc(CAUSE_LABEL[k])} ${n}</span>`).join('') || '없음'}</span>`, weekViews.some((v) => v.cause === 'product' || v.cause === 'unclassified') ? 'alert' : '')}
    ${kpi('불안정 spec', hasSuiteRuns ? String(flakySpecs.length) : '-', hasSuiteRuns ? '스위트 실행 최근 10회에 실패가 섞이고 마지막은 통과' : '스위트 실행 기록이 쌓이면 표시(2026-10-02~)')}
    ${kpi('커버리지 L2+', c ? `${pct(c.at_least_2, c.resources)}% <span class="s">${c.at_least_2}/${c.resources}</span>` : '-', c ? `L3+ ${c.at_least_3}/${c.resources} (${pct(c.at_least_3, c.resources)}%)` : '검증 실패')}
    ${kpi('API 대응', parityDenom ? `${pct(parityDone, parityDenom)}% <span class="s">${parityDone}/${parityDenom}</span>` : '-', parity.length ? `제외 ${parity.length - parityDenom} · 진행 ${parity.filter((r) => r.status === 'wip').length}` : 'docs/api-ui-parity.md 없음')}
  </div>
  <div class="trend">${trend || '<span class="muted">기록 없음</span>'}</div>
  <div class="legend"><span><i style="background:var(--pass)"></i>통과</span><span><i style="background:var(--fail)"></i>실패</span><span class="muted">일별 실행 기록(디버깅 재실행 포함)</span></div>
</section>

<section id="actions">
  <h2>조치 필요 <small>마지막 실행이 실패한 spec · 남은 리소스 · 정리 실패 · 불안정 · 대응 진행 중</small></h2>
  ${actions.length ? `<ul class="actions">${actions.join('\n')}</ul>` : '<p class="muted">없음 — 스위트 spec 의 마지막 실행이 모두 통과했고 남은 리소스도 없습니다.</p>'}
  <p class="legend">${CAUSE_ORDER.map((k) => `<span>${causeBadge(k)}</span>`).join('')}<span class="muted">제품 결함은 data/known-issues.yaml 에 kind: product 로 등록한 것만. 간헐 = 다음 실행(48시간 안)이 통과.</span></p>
</section>

<section id="specs">
  <h2>spec 상태 <small>실행 순서 = src/report/suite.ts · 최근 10회</small></h2>
  <table><thead><tr><th>spec</th><th>결과</th><th>마지막 실행</th><th class="num">소요</th><th>최근 10회</th><th class="num">통과 평균</th></tr></thead>
  <tbody>${input.suiteOrder.map((s) => {
    const runs = bySpec.get(s) ?? [];
    const last = runs[runs.length - 1];
    return specRow(s, runs, last ? causeByRecord.get(last) : undefined);
  }).join('\n')}</tbody></table>
  ${otherSpecs.length ? `<details><summary>스위트에 없는 spec (제외·이름 바뀜) ${otherSpecs.length}개</summary><table><tbody>${otherSpecs
    .map((s) => {
      const runs = bySpec.get(s) ?? [];
      const last = runs[runs.length - 1];
      return specRow(s, runs, last ? causeByRecord.get(last) : undefined);
    })
    .join('\n')}</tbody></table></details>` : ''}
</section>

<section id="failures">
  <h2>실패 분류 <small>최근 14일 · 오류 첫 줄의 숫자·이름을 지워 같은 원인끼리 묶음</small></h2>
  ${groupRows ? `<table><thead><tr><th>원인</th><th class="num">건수</th><th>오류 시그니처</th><th>spec</th><th>최근</th><th>첨부</th></tr></thead><tbody>${groupRows}</tbody></table>` : '<p class="muted">최근 14일 실패 없음</p>'}
</section>

<section id="suites">
  <h2>스위트 이력 <small>reports/suites · 첫 시도 = 재실행 없이 통과 · 최종 = 같은 묶음의 재실행 포함</small></h2>
  ${suiteRows ? `<table><thead><tr><th>스위트</th><th>시작</th><th class="num">첫 시도</th><th class="num">최종</th><th class="num">벽시계</th><th>남은 리소스</th><th>여전히 실패</th></tr></thead><tbody>${suiteRows}</tbody></table>` : '<p class="muted">아직 없음 — 2026-10-02 이후 <code>npm run test:suite</code> 부터 기록됩니다.</p>'}
</section>

<section id="coverage">
  <h2>커버리지 <small>service-map/coverage.yaml · level 0 없음 · 1 진입 · 2 CRUD · 3 동작 · 4 통합</small></h2>
  ${c ? `<div class="cards">${kpi('리소스(모집단)', String(c.resources), `서비스 ${c.totals.services} · 화면 ${c.totals.screens} · 스모크 진입 ${c.totals.smoke_entries}`)}${kpi('L2+ (CRUD 이상)', `${c.at_least_2} <span class="s">/ ${c.resources} · ${pct(c.at_least_2, c.resources)}%</span>`, LEVELS.map((l) => `L${l} ${c.levels[l]}`).join(' · '))}${kpi('L3+ (동작·통합)', `${c.at_least_3} <span class="s">/ ${c.resources} · ${pct(c.at_least_3, c.resources)}%</span>`, LEVELS.map((l) => `L${l} ${LEVEL_LABEL[l]}`).join(' · '))}</div>` : ''}
  <div class="legend">${LEVELS.map((l) => `<span><i class="l${l}"></i>L${l} ${LEVEL_LABEL[l]}</span>`).join('')}</div>
  ${coverageBlock(input)}
</section>

<section id="parity">
  <h2>API 자동화 대비 화면 자동화 <small>docs/api-ui-parity.md · ✅ 화면 자동화 · 🔧 진행 · ⏭ 제외(이유는 항목별 표)</small></h2>
  ${parityBlock(parity)}
</section>

<section id="explore">
  <h2>탐색(Level 5, Jev) <small>recordings/explore</small></h2>
  ${exploreBlock(input.explores)}
</section>

<section id="runs">
  <h2>실행 기록 <small>최신 ${Math.min(60, records.length)}건 / 전체 ${records.length}건</small></h2>
  <div class="filters">보기:
    <button data-st="all" class="on">전체</button><button data-st="pass">통과</button>${CAUSE_ORDER.map((k) => `<button data-st="${k}">${esc(CAUSE_LABEL[k])}</button>`).join('')}
  </div>
  <table id="runs-t"><thead><tr><th>시작</th><th>spec</th><th>결과</th><th class="num">소요</th><th>스위트</th><th>실패 단계 · 오류 · 첨부</th></tr></thead>
  <tbody>${runRows(records, causeByRecord)}</tbody></table>
</section>

<section id="issues">
  <h2>알려진 이슈 <small>data/known-issues.yaml — 제품 결함으로 확정하려면 여기 등록</small></h2>
  ${issuesBlock(input)}
</section>
</main>
<script>
  document.querySelectorAll('.filters').forEach(function (box) {
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      box.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
      if (b.dataset.st !== undefined) document.querySelectorAll('#runs-t tr.run').forEach(function (tr) { tr.style.display = b.dataset.st === 'all' || tr.dataset.status === b.dataset.st ? '' : 'none'; });
      if (b.dataset.lv !== undefined) document.querySelectorAll('#res tr.res').forEach(function (tr) { tr.style.display = b.dataset.lv === 'all' || tr.dataset.level === b.dataset.lv ? '' : 'none'; });
    });
  });
</script>
</body>
</html>
`;
}
