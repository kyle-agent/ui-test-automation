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
  judgeParity,
  type Cause,
  type FailureView,
  type ParityJudged,
  type ParityRow,
  type SuiteView,
  type CoveragePoint,
  type Finding,
} from './insights';
import type { ApiCoverageSnapshot, CategoryRow, ProductRow } from './api-coverage';
import {
  operationsByCategory,
  type ConsoleOnlyWrite,
  type OperationsSummary,
  type ProductOperations,
} from './operations';
import type { ProductMatrix } from './product-matrix';
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
  /** 탐색 발견 사항(recordings/explore + data/findings.yaml) */
  findings?: readonly Finding[];
  /** 날짜별 커버리지(coverage.yaml git 이력) */
  coverageHistory?: readonly CoveragePoint[];
  /** 상품·카테고리별 화면 vs API (src/report/api-coverage.ts productComparison) */
  products?: { products: readonly ProductRow[]; categories: readonly CategoryRow[] };
  apiSnapshot?: ApiCoverageSnapshot | null;
  /** 상품별 화면 판단표(src/report/product-matrix.ts) */
  matrix?: readonly ProductMatrix[];
  /** 상품별 쓰기 동작 커버리지(src/report/operations.ts productOperations) */
  operations?: OperationsSummary;
  /** 콘솔 전용 쓰기 동작: 통과한 실행이 보낸 쓰기 요청 중 API 카탈로그 경로에 없는 것(src/report/operations.ts consoleOnlyWrites) */
  consoleOnly?: readonly ConsoleOnlyWrite[];
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
      const failedSteps = r.tests.flatMap((t) =>
        t.steps.filter((s) => s.status === 'fail').map((s) => s.title),
      );
      const detail =
        r.status === 'pass' ? '' : `${failedSteps[0] ? `[${failedSteps[0]}] ` : ''}${r.error ?? ''}`;
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

/** 모수 제외 상품을 뺀 쓰기 동작 합계(작업 단위 커버리지의 분모·분자) */
function opsTotalsOf(operations?: OperationsSummary): {
  opsTotal: number;
  apiVerified: number;
  uiCovered: number;
} {
  return (operations?.products ?? [])
    .filter((p) => !p.excluded)
    .reduce(
      (n, c) => ({
        opsTotal: n.opsTotal + c.opsTotal,
        apiVerified: n.apiVerified + c.apiVerified,
        uiCovered: n.uiCovered + c.uiCovered,
      }),
      { opsTotal: 0, apiVerified: 0, uiCovered: 0 },
    );
}

const localDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString('en-CA');
};

function consoleOnlyBlock(all: readonly ConsoleOnlyWrite[], anyRecorded: boolean): string {
  if (!anyRecorded)
    return '<p class="muted">아직 쓰기 요청을 기록한 실행이 없음 — 2026-10-14 이후 실행부터 모든 spec 이 기록한다(src/fixtures/test.ts).</p>';
  const rows = all.filter((r) => r.kind === 'write');
  const readLike = all.filter((r) => r.kind === 'read-like');
  const readLikeBlock = readLike.length
    ? `<details><summary>POST 지만 조회로 보이는 경로 ${readLike.length}개(세지 않음 · 경로에 search·query·analysis·list·check 등)</summary><ul class="small mono">${readLike
        .map(
          (r) =>
            `<li>${esc(r.method)} ${esc(r.path)} <span class="muted">— ${esc(r.product)} · ${r.specs.map(esc).join(', ')}</span></li>`,
        )
        .join('')}</ul></details>`
    : '';
  if (!rows.length)
    return `<p class="muted">없음 — 기록된 쓰기 요청이 모두 API 카탈로그 경로와 맞음.</p>${readLikeBlock}`;
  const byProduct = new Map<string, ConsoleOnlyWrite[]>();
  for (const r of rows) byProduct.set(r.product, [...(byProduct.get(r.product) ?? []), r]);
  const body = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.product)}</td><td class="small muted">${esc(r.method)}</td><td class="mono small">${esc(r.path)}${r.loose ? ' <span class="tag warn" title="카탈로그 경로의 {…} 자리에 글자 세그먼트 — 일괄 처리 등 콘솔 전용으로 보이나 확인 필요">?</span>' : ''}</td><td class="small">${r.specs.map((s) => `<span class="mono">${esc(s)}</span>`).join(' · ')}</td><td class="small muted">${esc(localDate(r.last_seen))}</td></tr>`,
    )
    .join('');
  return `<p>${rows.length}개 · 상품 ${byProduct.size}개: ${[...byProduct].map(([p, l]) => `${esc(p)} ${l.length}`).join(' · ')}</p>
    <table class="compact"><thead><tr><th>상품</th><th>메서드</th><th>경로(콘솔 접두어 제외)</th><th>spec</th><th>마지막</th></tr></thead><tbody>${body}</tbody></table>${readLikeBlock}`;
}

const PARITY_MARK: Record<ParityJudged['effective'], string> = {
  done: '✅',
  broken: '⚠',
  unverified: '❔',
  wip: '🔧',
  skip: '⏭',
};

function parityBlock(rows: readonly ParityJudged[]): string {
  if (!rows.length) return '<p class="muted">대응표 없음 (docs/api-ui-parity.md)</p>';
  const cats = [...new Set(rows.map((r) => r.category))];
  const count = (list: readonly ParityJudged[], s: ParityJudged['effective']) =>
    list.filter((r) => r.effective === s).length;
  const num = (n: number, cls = '') => `<td class="num${cls ? ` ${cls}` : ''}">${n || ''}</td>`;
  const catRows = cats
    .map((cat) => {
      const list = rows.filter((r) => r.category === cat);
      return `<tr><td>${esc(cat)}</td>${num(count(list, 'done'))}${num(count(list, 'broken'), count(list, 'broken') ? 'fail' : '')}${num(count(list, 'unverified'))}${num(count(list, 'wip'))}${num(count(list, 'skip'))}</tr>`;
    })
    .join('');
  const checkedCell = (r: ParityJudged) =>
    r.status !== 'done'
      ? ''
      : r.checked.length
        ? r.checked
            .map(
              (c) =>
                `<span class="mono">${esc(c.spec)}</span> ${c.last === 'pass' ? '통과' : '<span class="fail">실패</span>'}`,
            )
            .join(' · ')
        : '<span class="muted">실행 기록이 있는 spec 없음</span>';
  const detail = rows
    .map(
      (r) =>
        `<tr${r.effective === 'broken' ? ' class="fail"' : ''}><td title="표 표시: ${r.status}">${PARITY_MARK[r.effective]}</td><td>${esc(r.category)}</td><td class="small">${esc(r.api)}</td><td class="small">${esc(r.ui)}</td><td class="small">${checkedCell(r)}</td></tr>`,
    )
    .join('');
  return `<table class="compact"><thead><tr><th>분류</th><th class="num">✅ 통과 확인</th><th class="num">⚠ 깨짐</th><th class="num">❔ 미확인</th><th class="num">🔧 진행</th><th class="num">⏭ 제외</th></tr></thead><tbody>${catRows}</tbody></table>
    <details><summary>항목별 (${rows.length})</summary><table><thead><tr><th></th><th>분류</th><th>API 리소스</th><th>UI spec · 비고</th><th>마지막 실행</th></tr></thead><tbody>${detail}</tbody></table></details>`;
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

function trendBlock(points: readonly CoveragePoint[]): string {
  if (points.length < 2) return '';
  const w = 640;
  const h = 150;
  const pad = 30;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const series = (key: 'at_least_2' | 'at_least_3') =>
    points.map((p, i) => `${x(i).toFixed(1)},${y(pct(p[key], p.resources)).toFixed(1)}`).join(' ');
  const labels = points
    .map(
      (p, i) =>
        `<text x="${x(i).toFixed(1)}" y="${h - 8}" text-anchor="middle" class="tl">${esc(p.date.slice(5))}</text>` +
        `<text x="${x(i).toFixed(1)}" y="${(y(pct(p.at_least_2, p.resources)) - 6).toFixed(1)}" text-anchor="middle" class="tv">${pct(p.at_least_2, p.resources)}%</text>`,
    )
    .join('');
  const last = points[points.length - 1]!;
  return `<div class="trendbox"><svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px" role="img" aria-label="커버리지 추세">
    <line x1="${pad}" y1="${y(0)}" x2="${w - pad}" y2="${y(0)}" class="ax"/><line x1="${pad}" y1="${y(50)}" x2="${w - pad}" y2="${y(50)}" class="grid"/><line x1="${pad}" y1="${y(100)}" x2="${w - pad}" y2="${y(100)}" class="grid"/>
    <polyline points="${series('at_least_2')}" class="s2"/><polyline points="${series('at_least_3')}" class="s3"/>${labels}
  </svg><div class="legend"><span><i style="background:var(--l2)"></i>L2+ (최근 ${last.at_least_2}/${last.resources})</span><span><i style="background:var(--l4)"></i>L3+ (최근 ${last.at_least_3}/${last.resources})</span><span class="muted">날짜별 마지막 coverage.yaml 기준. 09-28 에 모집단이 80 → 112 로 바뀜</span></div></div>`;
}

function findingsBlock(findings: readonly Finding[]): string {
  if (!findings.length) return '<p class="muted">발견 사항 없음</p>';
  const by = (k: (f: Finding) => string) => {
    const m = new Map<string, number>();
    for (const f of findings) m.set(k(f), (m.get(k(f)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const statusOrder = ['검토 전', '결함', '정상', '무시'];
  const counts = by((f) => f.status);
  const kinds = by((f) => `${f.severity} ${f.kind}`);
  const rows = findings
    .map(
      (f) => `<tr class="fd" data-st="${esc(f.status)}" data-sev="${esc(f.severity)}">
        <td><span class="badge ${f.severity === '이상' ? 'fail' : 'info'}">${esc(f.severity)}</span></td>
        <td class="mono small">${esc(f.kind)}</td>
        <td>${esc(f.explore)}</td>
        <td class="note">${esc(f.text.slice(0, 220))}${f.text.length > 220 ? '…' : ''}</td>
        <td class="small">${esc(f.action)}</td>
        <td>${esc(f.status)}${f.note ? ` <span class="muted small">${esc(f.note)}</span>` : ''}</td>
        <td>${f.screenshot ? `<a class="att" href="../${esc(f.screenshot)}">화면</a>` : ''}</td>
        <td class="mono small">${esc(f.id)}</td>
      </tr>`,
    )
    .join('\n');
  return `<p class="muted">${findings.length}건 · ${statusOrder.map((st) => `${st} ${counts.find(([k]) => k === st)?.[1] ?? 0}`).join(' · ')} · 종류: ${kinds.map(([k, n]) => `${esc(k)} ${n}`).join(' · ')}</p>
    <div class="filters">상태: <button data-fs="all" class="on">전체</button>${statusOrder.map((st) => `<button data-fs="${st}">${st}</button>`).join('')}</div>
    <details ${findings.some((f) => f.severity === '이상') ? 'open' : ''}><summary>목록 (${findings.length})</summary>
    <table id="fd-t"><thead><tr><th>구분</th><th>종류</th><th>탐색</th><th>내용</th><th>동작</th><th>상태</th><th>화면</th><th>id</th></tr></thead><tbody>${rows}</tbody></table></details>`;
}

function dualBar(uiPct: number | null, apiPct: number | null): string {
  const seg = (v: number | null, cls: string) =>
    v === null
      ? '<div class="pb none"></div>'
      : `<div class="pb"><span class="${cls}" style="width:${v}%"></span></div>`;
  return `<div class="dual">${seg(uiPct, 'ui')}${seg(apiPct, 'api')}</div>`;
}

function productsBlock(
  data: { products: readonly ProductRow[]; categories: readonly CategoryRow[] } | undefined,
  api: ApiCoverageSnapshot | null,
  operations?: OperationsSummary,
): string {
  if (!data) return '<p class="muted">자료 없음</p>';
  const opsByCat = operationsByCategory(operations?.products ?? []);
  const opsByProduct = new Map((operations?.products ?? []).map((o) => [o.product, o]));
  const opsCell = (o: { opsTotal: number; apiVerified: number; uiCovered: number } | undefined) =>
    o && o.opsTotal
      ? `<td class="num" title="쓰기 동작: 화면 ${o.uiCovered} · API ${o.apiVerified} / ${o.opsTotal}">${o.uiCovered}/${o.opsTotal} <span class="muted">(${pct(o.uiCovered, o.opsTotal)}%)</span></td>`
      : '<td class="num muted">—</td>';
  const opsTot = [...opsByCat.values()].reduce(
    (n, c) => ({
      opsTotal: n.opsTotal + c.opsTotal,
      apiVerified: n.apiVerified + c.apiVerified,
      uiCovered: n.uiCovered + c.uiCovered,
    }),
    { opsTotal: 0, apiVerified: 0, uiCovered: 0 },
  );
  const uiCell = (u: { resources: number; l2: number; l3: number } | null) =>
    u && u.resources
      ? `<td class="num">${u.l2}/${u.resources} <span class="muted">(${pct(u.l2, u.resources)}%)</span></td><td class="num">${u.l3} <span class="muted">(${pct(u.l3, u.resources)}%)</span></td>`
      : '<td class="num muted">—</td><td class="num muted">—</td>';
  const apiCell = (a: { total: number; verified: number } | null) =>
    a && a.total
      ? `<td class="num">${a.verified}/${a.total} <span class="muted">(${pct(a.verified, a.total)}%)</span></td>`
      : '<td class="num muted">—</td>';
  const gap = (
    u: { resources: number; l2: number } | null,
    a: { total: number; verified: number } | null,
  ) => {
    if (!u || !u.resources || !a || !a.total) return '<td></td>';
    const d = pct(u.l2, u.resources) - pct(a.verified, a.total);
    return `<td class="num ${d < -20 ? 'warn' : d > 20 ? 'good' : 'muted'}">${d > 0 ? '+' : ''}${d}p</td>`;
  };
  const tot = data.categories.reduce(
    (n, c) => ({
      r: n.r + c.ui.resources,
      l2: n.l2 + c.ui.l2,
      l3: n.l3 + c.ui.l3,
      t: n.t + c.api.total,
      v: n.v + c.api.verified,
    }),
    { r: 0, l2: 0, l3: 0, t: 0, v: 0 },
  );
  const catRows = data.categories
    .map(
      (c) => `<tr>
        <td><a href="#cat-${esc(c.category)}">${esc(c.category)}</a></td>
        ${uiCell(c.ui)}${opsCell(opsByCat.get(c.category))}${apiCell(c.api)}${gap(c.ui, c.api)}
        <td class="barcell">${dualBar(c.ui.resources ? pct(c.ui.l2, c.ui.resources) : null, c.api.total ? pct(c.api.verified, c.api.total) : null)}</td>
      </tr>`,
    )
    .join('\n');
  const byCat = new Map<string, ProductRow[]>();
  for (const p of data.products) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
  const prodRows = [...byCat]
    .map(
      ([cat, list]) =>
        `<tr class="cathead" id="cat-${esc(cat)}"><td colspan="7">${esc(cat)}</td></tr>` +
        list
          .map(
            (p) => `<tr${p.excluded ? ' class="excl"' : ''}>
        <td>${esc(p.product)}${p.excluded ? ` <span class="st st-excl" title="${esc(p.excluded)}">모수 제외</span>` : ''}${p.api && p.api.services.length ? ` <span class="muted small mono">${esc(p.api.services.join(', '))}</span>` : ''}</td>
        ${uiCell(p.ui)}${opsCell(opsByProduct.get(p.product))}${apiCell(p.api)}${gap(p.ui, p.api)}
        <td class="barcell">${dualBar(p.ui && p.ui.resources ? pct(p.ui.l2, p.ui.resources) : null, p.api && p.api.total ? pct(p.api.verified, p.api.total) : null)}</td>
      </tr>`,
          )
          .join('\n'),
    )
    .join('\n');
  return `${api ? '' : '<p class="warn">data/api-coverage.json 없음 — npx tsx scripts/import-api-coverage.ts --repo &lt;api 저장소&gt;</p>'}
    <div class="legend"><span><i style="background:var(--l2)"></i>화면 L2+ 비율</span><span><i style="background:#f59e0b"></i>API 검증 비율</span><span class="muted">차이 = 화면 L2+% − API%. 화면이 20%p 이상 낮으면 빨강</span></div>
    <table><thead><tr><th>카테고리</th><th class="num">화면 L2+</th><th class="num">화면 L3+</th><th class="num" title="API 쓰기 동작 중 화면 회귀 시나리오가 하는 것 (data/ui-operations.yaml)">동작(UI)</th><th class="num">API 검증</th><th class="num">차이</th><th></th></tr></thead>
    <tbody>${catRows}<tr class="total"><td>전체</td>${uiCell({ resources: tot.r, l2: tot.l2, l3: tot.l3 })}${opsCell(opsTot)}${apiCell({ total: tot.t, verified: tot.v })}${gap({ resources: tot.r, l2: tot.l2 }, { total: tot.t, verified: tot.v })}<td class="barcell">${dualBar(pct(tot.l2, tot.r), pct(tot.v, tot.t))}</td></tr></tbody></table>
    <details open><summary>상품별 (${data.products.length})</summary>
    <table id="prod-t"><thead><tr><th>상품 <span class="muted small">(API 서비스)</span></th><th class="num">화면 L2+</th><th class="num">화면 L3+</th><th class="num">동작(UI)</th><th class="num">API 검증</th><th class="num">차이</th><th></th></tr></thead><tbody>${prodRows}</tbody></table>
    <p class="muted small">— = 그쪽 장부에 없음. 화면 장부는 리소스 키가 있는 목록 화면만 센다(하위 화면·설정 화면은 빠짐). "(API) …" 는 화면 장부에 대응 상품이 없는 API 서비스. 동작(UI) = API 쓰기 동작(POST·PUT·PATCH·DELETE, 읽기 동사 제외) 중 회귀 시나리오가 하는 것(data/ui-operations.yaml). API 검증 열은 읽기 포함 엔드포인트 전체 기준.</p></details>`;
}

const opsLine = (o: { opsTotal: number; apiVerified: number; uiCovered: number }): string =>
  `동작 UI ${o.uiCovered}/${o.opsTotal} · API ${o.apiVerified}/${o.opsTotal}`;

/** 상품 하나의 쓰기 동작 표: API ✓/· · UI ✓/· · 그 동작을 하는 spec */
function opsTable(o: ProductOperations): string {
  const mark = (v: boolean) => (v ? '<span class="good">✓</span>' : '<span class="muted">·</span>');
  const spec = (x: string) => `<span class="mono">${esc(x)}</span>`;
  const specs = (ids: string[]) =>
    ids.length > 3
      ? `${ids.slice(0, 3).map(spec).join(', ')} <span class="muted" title="${esc(ids.slice(3).join(', '))}">외 ${ids.length - 3}</span>`
      : ids.map(spec).join(', ');
  const rows = o.ops
    .map(
      (r) =>
        `<tr${r.ui.length ? '' : ' class="op-gap"'}><td class="mono small">${esc(r.name)}${o.services.length > 1 ? ` <span class="muted">${esc(r.service)}</span>` : ''}</td><td class="small muted">${esc(r.method)}</td><td>${mark(r.api)}</td><td>${mark(r.ui.length > 0)}${r.uncertain ? ' <span class="tag warn" title="data/ui-operations.yaml: 확인 필요">?</span>' : ''}</td><td class="small">${specs(r.ui)}</td></tr>`,
    )
    .join('');
  return `<details class="ops"><summary>쓰기 동작 ${o.opsTotal} — UI ${o.uiCovered} (${pct(o.uiCovered, o.opsTotal)}%) · API ${o.apiVerified} (${pct(o.apiVerified, o.opsTotal)}%)</summary>
    <table class="mx ops-t"><thead><tr><th>동작 <span class="muted small">(API 카탈로그)</span></th><th>메서드</th><th>API</th><th>UI</th><th>spec</th></tr></thead><tbody>${rows}</tbody></table></details>`;
}

function matrixBlock(
  matrix: readonly ProductMatrix[],
  products: readonly ProductRow[],
  operations?: OperationsSummary,
): string {
  if (!matrix.length) return '<p class="muted">서비스 맵 없음</p>';
  const opsOf = (svc: string) => operations?.products.find((p) => p.product === svc);
  const opsAll = opsTotalsOf(operations);
  const opsWarn = operations
    ? [
        ...operations.unknown.map((x) => `카탈로그에 없거나 읽기 동작: ${x}`),
        ...operations.unknownServices.map((x) => `스냅샷에 없는 서비스: ${x}`),
        ...operations.unknownSpecs.map((x) => `없는 spec: ${x}`),
      ]
    : [];
  const stateCls: Record<string, string> = {
    시나리오: 'st-ok',
    스모크만: 'st-smoke',
    제외: 'st-ex',
    홈: 'st-home',
  };
  const apiOf = (svc: string) => products.find((p) => p.product === svc)?.api ?? null;
  const all = matrix.flatMap((m) => m.screens);
  const count = (st: string) => all.filter((r) => r.state === st).length;
  const decided = all.filter((r) => r.decision).length;
  const byCat = new Map<string, ProductMatrix[]>();
  for (const m of matrix) byCat.set(m.category, [...(byCat.get(m.category) ?? []), m]);
  const body = [...byCat]
    .map(([cat, list]) => {
      const prods = list
        .map((m) => {
          const c = (st: string) => m.screens.filter((r) => r.state === st).length;
          const gaps = c('스모크만');
          const api = apiOf(m.service);
          const ops = opsOf(m.service);
          const dec = m.screens.filter((r) => r.decision);
          const rows = m.screens
            .map(
              (r) => `<tr>
              <td>${esc(r.name)}</td><td class="mono small">${esc(r.route)}</td>
              <td><span class="st ${stateCls[r.state] ?? ''}">${esc(r.state)}</span>${r.level !== undefined ? ` <span class="lv l${r.level}">L${r.level}</span>` : ''}</td>
              <td class="small">${r.specs.map((x) => `<span class="mono">${esc(x.spec)}</span> <span class="muted">${x.steps}단계</span>${x.status ? ` <span class="badge ${x.status}">${x.status === 'pass' ? 'PASS' : 'FAIL'}</span>` : ''}`).join('<br>')}</td>
              <td class="note">${esc(r.reason ?? '')}</td>
              <td>${r.decision ? `<b>${esc(r.decision.decision)}</b>${r.decision.note ? ` <span class="muted small">${esc(r.decision.note)}</span>` : ''}` : ''}</td>
            </tr>`,
            )
            .join('');
          const scen = m.specs
            .map(
              (
                sp,
              ) => `<li><span class="mono">${esc(sp.spec)}</span> — ${esc(sp.title)} ${sp.last ? `<span class="badge ${sp.last.status}">${sp.last.status === 'pass' ? 'PASS' : 'FAIL'}</span> <span class="muted small">${esc(fmtTime(sp.last.started))} · ${sp.passes}/${sp.runs}</span>` : '<span class="muted small">기록 없음</span>'}
                <ol class="steps">${sp.steps.map((st) => `<li class="${st.teardown ? 'td' : ''}">${st.teardown ? '<span class="muted">[정리]</span> ' : ''}${esc(st.goal)}${st.route ? ` <span class="muted mono small">${esc(st.route)}</span>` : ''}</li>`).join('')}</ol></li>`,
            )
            .join('');
          return `<details class="prod${m.excluded ? ' excl' : ''}" data-gap="${gaps && !m.excluded ? 1 : 0}" data-dec="${dec.length ? 1 : 0}"><summary><b>${esc(m.service)}</b>${m.excluded ? ` <span class="st st-excl" title="${esc(m.excluded)}">모수 제외</span> <span class="muted small">${esc(m.excluded)}</span>` : ''}
              <span class="muted">화면 ${m.screens.length} · </span><span class="st st-ok">시나리오 ${c('시나리오')}</span> <span class="st st-smoke">스모크만 ${gaps}</span> <span class="st st-ex">제외 ${c('제외')}</span>
              <span class="muted"> · spec ${m.specs.length}${api && api.total ? ` · API ${api.verified}/${api.total} (${pct(api.verified, api.total)}%)` : ''}${dec.length ? ` · 판단 ${dec.length}` : ''}</span>${ops ? ` <span class="opsum">${opsLine(ops)}</span>` : ''}</summary>
              <table class="mx"><thead><tr><th>화면</th><th>route</th><th>상태</th><th>시나리오(단계 수·최근)</th><th>제외 사유</th><th>판단</th></tr></thead><tbody>${rows}</tbody></table>
              ${ops ? opsTable(ops) : ''}
              ${scen ? `<div class="scen"><b>시나리오</b><ul>${scen}</ul></div>` : '<p class="muted small">이 상품을 다루는 회귀 시나리오 없음</p>'}
            </details>`;
        })
        .join('');
      return `<h3 class="cat">${esc(cat)}</h3>${prods}`;
    })
    .join('');
  return `<p class="muted">상품 ${matrix.length} · 화면 ${all.length}: <span class="st st-ok">시나리오 ${count('시나리오')}</span> <span class="st st-smoke">스모크만 ${count('스모크만')}</span> <span class="st st-ex">제외 ${count('제외')}</span> <span class="st st-home">홈 ${count('홈')}</span> · 판단 기록 ${decided}${opsAll.opsTotal ? ` · <b>${opsLine(opsAll)}</b>` : ''}</p>
    <p class="muted small">시나리오 = 회귀 spec 의 단계가 그 화면(목록·상세·생성)을 지남 · 스모크만 = 진입 확인뿐(판단 필요) · 제외 = 장부 메모의 사유 · 홈 = Service Home · 동작 UI x/m · API y/m = API 카탈로그의 쓰기 동작 m 개(POST·PUT·PATCH·DELETE 중 list·show·check·get·query·validate·detail·download 로 시작하는 것 제외) 가운데 화면 회귀 시나리오가 하는 것 x(data/ui-operations.yaml, ? = 확인 필요) · API 자동화가 검증한 것 y</p>${opsWarn.length ? `<p class="warn small">data/ui-operations.yaml 점검: ${opsWarn.map(esc).join(' · ')}</p>` : ''}
    <div class="filters">보기: <button data-mx="all" class="on">전체</button><button data-mx="gap">스모크만 화면이 있는 상품</button><button data-mx="dec">판단 기록 있는 상품</button></div>
    <div id="mx">${body}</div>`;
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
  // API 대응표: 손 표시 ✅ 를 UI 칸의 spec 마지막 실행과 맞춰 다시 판정(깨짐 ⚠ · 미확인 ❔). 2026-10-14 사용자 결정
  const parity = judgeParity(input.parity ?? [], (spec) => bySpec.get(spec)?.at(-1)?.status);
  const parityCount = (e: ParityJudged['effective']) => parity.filter((r) => r.effective === e).length;
  const parityDone = parityCount('done');
  const parityDenom = parity.filter((r) => r.effective !== 'skip').length;
  // 작업(쓰기 동작) 단위: 모수 제외 상품을 뺀 카탈로그 합계
  const opsAll = opsTotalsOf(input.operations);
  const consoleOnly = input.consoleOnly ?? [];

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
  for (const r of parity.filter((p) => p.effective === 'broken'))
    actions.push(
      `<li class="act c-product"><span class="tag fail">⚠ 대응표</span> ✅ 로 적혀 있지만 spec 마지막 실행이 실패: ${esc(r.category)} · ${esc(r.api)} <span class="mono small">(${esc(
        r.checked
          .filter((c) => c.last === 'fail')
          .map((c) => c.spec)
          .join(', '),
      )})</span></li>`,
    );
  for (const r of parity.filter((p) => p.effective === 'wip'))
    actions.push(`<li class="act">🔧 API 대응 진행 중: ${esc(r.category)} · ${esc(r.api)}</li>`);

  // 실패 묶음(최근 14일)
  const groups = groupBySignature(
    views.filter((v) => now.getTime() - Date.parse(v.record.started) < 14 * DAY),
  ).slice(0, 25);
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
  .badge.info { background:#64748b }
  .st-excl { background:#e5e7eb; color:#6b7280; border:1px dashed #9ca3af } tr.excl td, details.prod.excl { color:#9ca3af; background:#f9fafb } tr.excl td .pb span, details.prod.excl .st:not(.st-excl) { filter:grayscale(1); opacity:.5 }
  .st { display:inline-block; padding:0 6px; border-radius:4px; font-size:11px; font-weight:600 } .st-ok { background:#dcfce7; color:#166534 } .st-smoke { background:#fef3c7; color:#92400e } .st-ex { background:#e5e7eb; color:#374151 } .st-home { background:#f3f4f6; color:#9ca3af }
  details.prod { border:1px solid var(--line); border-radius:6px; padding:4px 10px; margin:4px 0 } details.prod summary { color:var(--ink); margin:4px 0 } h3.cat { font-size:13px; margin:14px 0 4px; color:#374151 }
  table.mx td, table.mx th { padding:4px 6px } .opsum { font-size:12px; color:#1d4ed8; margin-left:4px } details.ops { margin:6px 0 } details.ops summary { font-size:12px } table.ops-t { width:auto; min-width:520px } tr.op-gap td { color:#6b7280 } .scen ul { margin:4px 0 8px; padding-left:18px } ol.steps { margin:2px 0 6px; padding-left:20px; font-size:12px; color:#374151 } ol.steps li.td { color:#6b7280 }
  .dual { display:flex; flex-direction:column; gap:2px; min-width:140px } .pb { height:7px; background:#eef2f7; border-radius:4px; overflow:hidden } .pb.none { background:repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 4px,#fff 4px,#fff 8px) } .pb span { display:block; height:100% } .pb .ui { background:var(--l2) } .pb .api { background:#f59e0b }
  tr.cathead td { background:#f3f4f6; font-weight:600; font-size:12px } tr.total td { font-weight:600; border-top:2px solid var(--line) } .good { color:var(--pass) }
  .trendbox svg .ax { stroke:#9ca3af } .trendbox svg .grid { stroke:#e5e7eb; stroke-dasharray:3 3 } .trendbox svg .s2 { fill:none; stroke:var(--l2); stroke-width:2.5 } .trendbox svg .s3 { fill:none; stroke:var(--l4); stroke-width:2.5 } .trendbox svg .tl { font-size:10px; fill:#6b7280 } .trendbox svg .tv { font-size:10px; fill:#1e40af; font-weight:600 }
  .trendbox { margin:8px 0 16px }
  @media (max-width:800px) { main{padding:8px 16px} .barcell{display:none} }
</style>
</head>
<body>
<header>
  <div class="top">
    <h1>SCP 콘솔 회귀 대시보드</h1>
    <span class="muted">${lastSuite ? `마지막 스위트 ${esc(lastSuite.suite_id)} · ${esc(fmtTime(lastSuite.started))} · ${lastSuite.specs} spec · 탭 ${lastSuite.max_tabs} · ${lastSuite.wall_minutes}분` : '스위트 요약 없음'} · 마지막 실행 ${lastRun ? esc(fmtTime(lastRun.started)) + ' ' + esc(lastRun.spec) : '없음'} · 생성 ${esc(input.generated)}</span>
  </div>
  <nav><a href="#summary">요약</a><a href="#actions">조치 필요</a><a href="#specs">spec 상태</a><a href="#failures">실패 분류</a><a href="#suites">스위트 이력</a><a href="#coverage">커버리지</a><a href="#matrix">상품별 판단표</a><a href="#products">화면 vs API</a><a href="#parity">API 대응</a><a href="#explore">탐색</a><a href="#findings">발견 사항</a><a href="#runs">실행 기록</a><a href="#issues">알려진 이슈</a></nav>
</header>
<main>
<section id="summary">
  <h2>요약 <small>원본: reports/runs · reports/suites · service-map/coverage.yaml · docs/api-ui-parity.md — <code>npm run results</code> 로 재생성</small></h2>
  <div class="cards">
    ${kpi('현재 녹색 spec', `${greenNow} <span class="s">/ ${input.suiteOrder.length}</span>`, `스위트 spec 의 마지막 실행 기준 · 기록 없음 ${input.suiteOrder.length - suiteLasts.length}`, greenNow < suiteLasts.length ? 'alert' : '')}
    ${kpi(
      '마지막 스위트 첫 시도 <span class="s">(spec 별 첫 결과)</span>',
      lastSuite
        ? `${pct(lastSuite.first_pass, lastSuite.specs)}% <span class="s">${lastSuite.first_pass}/${lastSuite.specs}</span>`
        : '-',
      lastSuite
        ? `최종 ${lastSuite.final_pass}/${lastSuite.specs}${lastSuite.attempts > 1 ? ` · 시도 ${lastSuite.attempts}회 합산` : ''}${lastSuite.synthesized_attempts.length ? ` · ${lastSuite.synthesized_attempts.map((a) => `a${a}`).join(',')} 는 요약 파일 없이 실행 기록으로 채움` : ''}`
        : '병렬 스위트(npm run test:suite) 기록부터',
    )}
    ${kpi('최근 7일 실패 <span class="s">(개발 중 재실행 포함)</span>', `${weekViews.length} <span class="s">/ 실행 ${weekRuns.length}</span>`, `<span class="causes">${weekCauses.map(([k, n]) => `<span class="c-${k}">${esc(CAUSE_LABEL[k])} ${n}</span>`).join('') || '없음'}</span>`, weekViews.some((v) => v.cause === 'product' || v.cause === 'unclassified') ? 'alert' : '')}
    ${kpi('불안정 spec', hasSuiteRuns ? String(flakySpecs.length) : '-', hasSuiteRuns ? '스위트 실행 최근 10회에 실패가 섞이고 마지막은 통과' : '스위트 실행 기록이 쌓이면 표시(2026-10-02~)')}
    ${kpi('커버리지 L2+', c ? `${pct(c.at_least_2, c.resources)}% <span class="s">${c.at_least_2}/${c.resources}</span>` : '-', c ? `L3+ ${c.at_least_3}/${c.resources} (${pct(c.at_least_3, c.resources)}%)` : '검증 실패')}
    ${kpi(
      'API 대응 <span class="s">(리소스 단위 · 실행 연동)</span>',
      parityDenom
        ? `${pct(parityDone, parityDenom)}% <span class="s">${parityDone}/${parityDenom}</span>`
        : '-',
      parity.length
        ? `API 로 생성·삭제가 검증된 리소스 종류 중 UI spec 마지막 실행이 통과한 것 · 깨짐 ${parityCount('broken')} · 미확인 ${parityCount('unverified')} · 진행 ${parityCount('wip')} · 제외 ${parityCount('skip')}`
        : 'docs/api-ui-parity.md 없음',
      parityCount('broken') ? 'alert' : '',
    )}
    ${kpi(
      'UI 쓰기 동작 <span class="s">(작업 단위 · API 대비)</span>',
      opsAll.opsTotal
        ? `${opsAll.apiVerified ? pct(opsAll.uiCovered, opsAll.apiVerified) : 0}% <span class="s">${opsAll.uiCovered}/${opsAll.apiVerified}</span>`
        : '-',
      opsAll.opsTotal
        ? `API 카탈로그 쓰기 동작 ${opsAll.opsTotal} 중 UI ${opsAll.uiCovered} (${pct(opsAll.uiCovered, opsAll.opsTotal)}%) · API 자동화 ${opsAll.apiVerified} (${pct(opsAll.apiVerified, opsAll.opsTotal)}%) · 통과한 spec 만 집계 · <a href="#console-only">콘솔 전용 +${consoleOnly.filter((r) => r.kind === 'write').length}</a>(모수 밖)`
        : 'data/api-coverage.json · data/ui-operations.yaml 없음',
    )}
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
  <tbody>${input.suiteOrder
    .map((s) => {
      const runs = bySpec.get(s) ?? [];
      const last = runs[runs.length - 1];
      return specRow(s, runs, last ? causeByRecord.get(last) : undefined);
    })
    .join('\n')}</tbody></table>
  ${
    otherSpecs.length
      ? `<details><summary>스위트에 없는 spec (제외·이름 바뀜) ${otherSpecs.length}개</summary><table><tbody>${otherSpecs
          .map((s) => {
            const runs = bySpec.get(s) ?? [];
            const last = runs[runs.length - 1];
            return specRow(s, runs, last ? causeByRecord.get(last) : undefined);
          })
          .join('\n')}</tbody></table></details>`
      : ''
  }
</section>

<section id="failures">
  <h2>실패 분류 <small>최근 14일 · 오류 첫 줄의 숫자·이름을 지워 같은 원인끼리 묶음</small></h2>
  ${groupRows ? `<table><thead><tr><th>원인</th><th class="num">건수</th><th>오류 시그니처</th><th>spec</th><th>최근</th><th>첨부</th></tr></thead><tbody>${groupRows}</tbody></table>` : '<p class="muted">최근 14일 실패 없음</p>'}
</section>

<section id="suites">
  <h2>스위트 이력 <small>reports/suites(요약 파일이 없는 시도는 reports/runs 로 채움) · 첫 시도 = spec 별로 그 스위트에서 처음 나온 결과가 통과 · 최종 = 같은 묶음의 재실행 포함</small></h2>
  ${suiteRows ? `<table><thead><tr><th>스위트</th><th>시작</th><th class="num">첫 시도</th><th class="num">최종</th><th class="num">벽시계</th><th>남은 리소스</th><th>여전히 실패</th></tr></thead><tbody>${suiteRows}</tbody></table>` : '<p class="muted">아직 없음 — 2026-10-02 이후 <code>npm run test:suite</code> 부터 기록됩니다.</p>'}
</section>

<section id="coverage">
  <h2>커버리지 <small>service-map/coverage.yaml · level 0 없음 · 1 진입 · 2 CRUD · 3 동작 · 4 통합</small></h2>
  ${c ? `<div class="cards">${kpi('리소스(모집단)', String(c.resources), `서비스 ${c.totals.services} · 화면 ${c.totals.screens} · 스모크 진입 ${c.totals.smoke_entries}${c.excluded?.length ? ` · <span class="st st-excl">모수 제외 ${c.excluded.map((x) => `${esc(x.service)} ${x.resources}`).join(', ')}</span>` : ''}`)}${kpi('L2+ (CRUD 이상)', `${c.at_least_2} <span class="s">/ ${c.resources} · ${pct(c.at_least_2, c.resources)}%</span>`, LEVELS.map((l) => `L${l} ${c.levels[l]}`).join(' · '))}${kpi('L3+ (동작·통합)', `${c.at_least_3} <span class="s">/ ${c.resources} · ${pct(c.at_least_3, c.resources)}%</span>`, LEVELS.map((l) => `L${l} ${LEVEL_LABEL[l]}`).join(' · '))}</div>` : ''}
  <div class="legend">${LEVELS.map((l) => `<span><i class="l${l}"></i>L${l} ${LEVEL_LABEL[l]}</span>`).join('')}</div>
  ${trendBlock(input.coverageHistory ?? [])}
  ${coverageBlock(input)}
</section>

<section id="matrix">
  <h2>상품별 판단표 — 화면·시나리오·제외 사유 <small>서비스 맵의 상품·화면 전체 기준. 판단은 data/coverage-decisions.yaml 에 "&lt;route&gt;: 해라|제외|보류 | 메모"</small></h2>
  ${matrixBlock(input.matrix ?? [], input.products?.products ?? [], input.operations)}
</section>

<section id="products">
  <h2>상품·카테고리별 커버리지 — 화면 vs API <small>화면 = 목록 화면 리소스(coverage.yaml) L2+·L3+ 비율 · API = 엔드포인트 검증 비율(data/api-coverage.json${input.apiSnapshot ? ` · ${esc(input.apiSnapshot.source_commit)} · ${esc(input.apiSnapshot.source_date)}` : ''}). 단위가 달라 비율끼리만 비교</small></h2>
  ${productsBlock(input.products, input.apiSnapshot ?? null, input.operations)}
  <h3 id="console-only">콘솔 전용 쓰기 동작 <small>통과한 실행이 보낸 쓰기 요청(실행 기록 api_writes, 2026-10-14~) 중 API 카탈로그 경로(data/api-coverage.json ops[].path)에 없는 것 · 모수 ${opsAll.opsTotal} 에는 넣지 않고 따로 센다 · {id} 세그먼트는 카탈로그의 {…} 와 맞춘다 · ? = {…} 자리에 글자(bulk 등)가 온 느슨한 일치, 확인 필요</small></h3>
  ${consoleOnlyBlock(
    consoleOnly,
    records.some((r) => r.api_writes?.length),
  )}
</section>

<section id="parity">
  <h2>API 자동화 대비 화면 자동화 <small>리소스 단위 · docs/api-ui-parity.md 의 ✅ 를 UI spec 마지막 실행과 맞춰 다시 판정 — ✅ 통과 확인 · ⚠ 깨짐(spec 마지막 실행 실패) · ❔ 미확인(실행 기록 있는 spec 없음) · 🔧 진행 · ⏭ 제외(이유는 항목별 표). 작업 단위는 위 "화면 vs API"</small></h2>
  ${parityBlock(parity)}
</section>

<section id="findings">
  <h2>탐색 발견 사항 <small>recordings/explore/*/report.md 의 "이상·정보 판정" · 검토 상태는 data/findings.yaml 에 "&lt;id&gt;: 결함|정상|무시 | 메모"</small></h2>
  ${findingsBlock(input.findings ?? [])}
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
      if (b.dataset.fs !== undefined) document.querySelectorAll('#fd-t tr.fd').forEach(function (tr) { tr.style.display = b.dataset.fs === 'all' || tr.dataset.st === b.dataset.fs ? '' : 'none'; });
      if (b.dataset.mx !== undefined) document.querySelectorAll('#mx details.prod').forEach(function (d) { d.style.display = b.dataset.mx === 'all' || (b.dataset.mx === 'gap' && d.dataset.gap === '1') || (b.dataset.mx === 'dec' && d.dataset.dec === '1') ? '' : 'none'; });
      if (b.dataset.lv !== undefined) document.querySelectorAll('#res tr.res').forEach(function (tr) { tr.style.display = b.dataset.lv === 'all' || tr.dataset.level === b.dataset.lv ? '' : 'none'; });
    });
  });
</script>
</body>
</html>
`;
}
