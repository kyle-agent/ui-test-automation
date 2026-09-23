/**
 * Jev 탐색 모드 (Level 5). 이미 확보된 화면(폼)에서 "아직 눌러보지 않은 컨트롤" 을 Jev 가 골라 동작시키고,
 * 판정(src/explore/oracles.ts)·입력값 변형(src/explore/values.ts)·안전장치·예산·보고서는 코드가 맡는다.
 *
 * 안전장치
 *  - 레코더의 후보 필터(삭제·해지·결제·승인·초기화·로그아웃 제외)에 더해, 리전/계정/설정/요금·구매·신청/바로가기(화면 이탈) 라벨과
 *    이름 없는 컨트롤("button")을 후보에서 뺀다. 라우트 접두어를 벗어나면 되돌린다.
 *  - 이름류 입력값은 정리 스크립트가 알아보는 규칙(<종류>-MMDD-HHMM-xxxx)으로 만든다 → 실제로 생성돼도 `npm run stacks:cleanup` 이 지운다.
 *  - 예산: 결정 수, 비용(USD), 시간. 치명 판정(세션 상실·빈 화면)이면 즉시 멈춘다.
 *  - 같은 컨트롤(역할+라벨+프레임)은 한 번만(입력란은 변형 수만큼) 시도한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { gotoRoute } from '../console/expect';
import { settleConsole } from '../console/overlays';
import { allBodyText } from '../console/frames';
import { visibleModal } from '../console/ui';
import { attachCollectors, checkPage, type Finding } from '../explore/oracles';
import { resourceKind, variationsFor, type Variation } from '../explore/values';
import { StalePage, act, observe, settle } from './browser';
import { choose, type HistoryEntry, type ObservedAction, type PageState } from './decide';
import { filterCandidates } from './recorder';

export interface ExploreOptions {
  page: Page;
  /** 목록 라우트 (예: #/vpc/vpc/list). 라우트의 첫 구간이 허용 접두어가 된다 */
  route: string;
  /** 목록에서 누를 버튼 (예: "서비스 생성"). 없으면 목록 화면 자체를 탐색 */
  open?: string;
  name: string;
  runId: string;
  outDir: string;
  budget?: number;
  costCapUsd?: number;
  timeCapMs?: number;
  log?: (line: string) => void;
}

export interface ExploreStep {
  n: number;
  operation: string;
  label: string;
  role: string | null;
  text: string | null;
  why: string | null;
  probability: number | null;
  confidence: number;
  url_before: string;
  url_after: string;
  title_after: string;
  page_changed: boolean | null;
  modal: string | null;
  findings: Finding[];
  screenshot: string | null;
  cost: number;
}

export interface ExploreReport {
  name: string;
  route: string;
  run_id: string;
  started_at: string;
  ended_at: string;
  stop_reason: string;
  steps: ExploreStep[];
  totals: { decisions: number; actions: number; cost: number; anomalies: number; infos: number };
  untried: string[];
  names_used: string[];
}

const FORBID =
  /요금|결제|구매|신청|바로가기|로그아웃|logout|리전|region|한국 서부|계정|account|설정|setting|언어|language|질문하기|copilot|x-icons|검색|search|새로고침|refresh/i;
const NO_CHANGE_LIMIT = 5;

const GOAL = (route: string, opened: string | null) =>
  `[탐색] ${opened ? `"${opened}" 으로 연 화면` : route} 을(를) 탐색한다. 아직 시도하지 않은 컨트롤을 하나 골라 동작시켜라. ` +
  `입력란이면 값을 넣고, 드롭다운은 열어 다른 항목을 골라라. 모달이 뜨면 내용을 확인한 뒤 "취소" 로 닫아라. ` +
  `현재 화면 안에 머물러라 (목록으로 돌아가거나 다른 메뉴로 가지 마라). 더 시도할 것이 없으면 DONE.`;

/** 컨트롤 서명. 모달이 떠 있을 때의 "취소/확인" 은 폼의 같은 라벨과 다른 컨트롤이므로 모달 여부를 넣는다. */
const sig = (a: ObservedAction, inModal = false) =>
  `${inModal ? 'modal' : 'page'}|${a.frame ?? 0}|${a.role ?? a.kind}|${a.label}`;

export async function exploreScreen(opts: ExploreOptions): Promise<ExploreReport> {
  const { page, route } = opts;
  const log = opts.log ?? (() => undefined);
  const budget = opts.budget ?? 30;
  const costCap = opts.costCapUsd ?? 0.05;
  const timeCap = opts.timeCapMs ?? 20 * 60_000;
  const prefix = '/' + route.replace(/^#?\//, '').split('/')[0];
  const kind = resourceKind(route);
  const shotDir = path.join(opts.outDir, 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });
  const collectors = attachCollectors(page);
  const report: ExploreReport = {
    name: opts.name,
    route,
    run_id: opts.runId,
    started_at: new Date().toISOString(),
    ended_at: '',
    stop_reason: '',
    steps: [],
    totals: { decisions: 0, actions: 0, cost: 0, anomalies: 0, infos: 0 },
    untried: [],
    names_used: [],
  };
  const save = () =>
    fs.writeFileSync(path.join(opts.outDir, 'trace.json'), JSON.stringify(report, null, 2) + '\n');

  await gotoRoute(page, route);
  let opened: string | null = null;
  if (opts.open) {
    await page.getByRole('button', { name: opts.open, exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    opened = opts.open;
  }
  const homeUrl = page.url();
  const goal = GOAL(route, opened);
  const tried = new Map<string, number>(); // signature → 시도 횟수
  const history: HistoryEntry[] = [];
  const started = Date.now();
  let noChange = 0;
  let blocked = 0;
  let staleStreak = 0;
  let lastState: PageState | null = null;
  let inModal = false;

  const stop = (reason: string) => {
    report.stop_reason = reason;
    report.ended_at = new Date().toISOString();
    report.untried = lastState
      ? filterCandidates(lastState.actions, goal)
          .filter(
            (a) =>
              a.kind !== 'scroll' &&
              a.kind !== 'wait' &&
              !tried.has(sig(a, inModal)) &&
              !FORBID.test(a.label),
          )
          .map((a) => `${a.role ?? a.kind} "${a.label}"`)
      : [];
    save();
    log(
      `탐색 종료: ${reason} (결정 ${report.totals.decisions}, 동작 ${report.totals.actions}, $${report.totals.cost.toFixed(4)}, 이상 ${report.totals.anomalies}, 정보 ${report.totals.infos})`,
    );
    return report;
  };

  for (let n = 0; n < budget; n++) {
    if (Date.now() - started > timeCap) return stop('시간 예산 소진');
    if (report.totals.cost > costCap) return stop('비용 예산 소진');
    await settleConsole(page, { appearGraceMs: 500 });
    // 허용 라우트를 벗어났으면 되돌린다
    if (!page.url().includes(`#${prefix}`)) {
      log(`  라우트 이탈 (${page.url().slice(-60)}) → 되돌림`);
      await page.goto(homeUrl, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
    }
    let state: PageState;
    try {
      state = await observe(page);
    } catch (err) {
      return stop(`관측 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
    lastState = state;
    inModal = await visibleModal(page)
      .isVisible()
      .catch(() => false);
    const beforeText = await allBodyText(page).catch(() => '');
    // 후보: 안전 필터 + 미시도 (입력란은 변형이 남은 동안)
    const candidates = filterCandidates(state.actions, goal).filter((a) => {
      if (a.kind === 'scroll' || a.kind === 'wait') return true;
      if (FORBID.test(a.label) || a.label === a.role || a.label === 'button' || a.label === 'link')
        return false;
      const count = tried.get(sig(a, inModal)) ?? 0;
      if (a.kind === 'fill') return count < variationsFor(a.label, '', opts.runId, kind).length;
      return count === 0;
    });
    if (candidates.filter((a) => a.kind !== 'scroll' && a.kind !== 'wait').length === 0)
      return stop('시도할 컨트롤이 더 없음');

    let decision;
    try {
      decision = await choose({ ...state, actions: candidates }, goal, history.slice(-6));
    } catch (err) {
      return stop(`Jev 호출 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
    report.totals.decisions++;
    report.totals.cost += Number((decision.usage as { cost?: number }).cost ?? 0);
    const action = candidates.find((a) => a.id === decision.choice) ?? null;
    const prob = decision.probabilities[decision.choice] ?? null;
    log(
      `  #${n + 1} Jev: ${decision.operation}${action ? ` [${action.id}] ${action.role ?? action.kind} "${action.label}"` : ''} (p=${prob === null ? '-' : prob.toFixed(2)}, conf=${decision.confidence.toFixed(2)})`,
    );
    if (decision.operation === 'DONE') return stop('Jev 가 DONE');
    if (decision.operation === 'BLOCKED' || !action) {
      if (++blocked >= 2) return stop('Jev 가 두 번 연속 BLOCKED');
      await page.waitForTimeout(1_000);
      continue;
    }
    blocked = 0;

    // 입력값: 라벨 아래 힌트를 읽어 변형 순서대로
    let text: string | null = null;
    let why: string | null = null;
    if (action.kind === 'fill') {
      const hint = await fieldHint(page, action.label);
      const vars = variationsFor(action.label, hint, opts.runId, kind);
      const v: Variation = vars[Math.min(tried.get(sig(action, inModal)) ?? 0, vars.length - 1)]!;
      text = v.value;
      why = `${v.why}${v.expectAccept ? '' : ' (거부 기대)'}`;
      if (v.expectAccept && text.startsWith(`${kind}-`)) report.names_used.push(text);
      log(`     입력값 ${JSON.stringify(text)} — ${why}`);
    }

    const urlBefore = page.url();
    try {
      await act(page, action, state, text);
    } catch (err) {
      if (err instanceof StalePage && staleStreak++ < 3) {
        log(`     페이지가 바뀌어 다시 관측 (${err.message})`);
        n--;
        continue;
      }
      return stop(`실행 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
    staleStreak = 0;
    tried.set(sig(action, inModal), (tried.get(sig(action, inModal)) ?? 0) + 1);
    report.totals.actions++;
    await settle(page, action);
    await page.waitForTimeout(700);

    const findings = [...collectors.drain(), ...(await checkPage(page, beforeText))];
    const modal = visibleModal(page);
    const modalText = (await modal.isVisible().catch(() => false))
      ? (await modal.innerText()).replace(/\s+/g, ' ').slice(0, 300)
      : null;
    let after: PageState | null = null;
    try {
      after = await observe(page);
    } catch {
      /* 이동 중 */
    }
    const pageChanged = after ? after.fingerprint !== state.fingerprint : null;
    const shot = path.join(shotDir, `${String(n + 1).padStart(2, '0')}.jpg`);
    await page.screenshot({ path: shot, type: 'jpeg', quality: 50 }).catch(() => undefined);
    const step: ExploreStep = {
      n: n + 1,
      operation: decision.operation,
      label: action.label,
      role: action.role ?? null,
      text,
      why,
      probability: prob,
      confidence: decision.confidence,
      url_before: urlBefore,
      url_after: page.url(),
      title_after: await page.title().catch(() => ''),
      page_changed: pageChanged,
      modal: modalText,
      findings,
      screenshot: path.relative(opts.outDir, shot),
      cost: Number((decision.usage as { cost?: number }).cost ?? 0),
    };
    report.steps.push(step);
    report.totals.anomalies += findings.filter((f) => f.severity !== 'info').length;
    report.totals.infos += findings.filter((f) => f.severity === 'info').length;
    for (const f of findings)
      log(
        `     ${f.severity === 'info' ? '정보' : f.severity === 'fatal' ? '치명' : '이상'}: ${f.kind} — ${f.detail.slice(0, 120)}`,
      );
    if (modalText) log(`     모달: ${modalText.slice(0, 120)}`);
    history.push({ action: action.label, kind: action.kind, text, page_changed: pageChanged });
    save();
    if (findings.some((f) => f.severity === 'fatal')) return stop('치명 판정');
    noChange = pageChanged === false ? noChange + 1 : 0;
    if (noChange >= NO_CHANGE_LIMIT) return stop(`${NO_CHANGE_LIMIT}회 연속 화면 변화 없음`);
  }
  return stop('결정 예산 소진');
}

/** 라벨이 든 폼 그룹의 안내 문구 (예: "영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요.") */
async function fieldHint(page: Page, label: string): Promise<string> {
  const expr = `((label) => {
    const groups = [...document.querySelectorAll('.scp-form-group-label')];
    const g = groups.find((el) => (el.innerText || '').replace(/\\s+/g, ' ').trim().startsWith(label));
    if (!g) return '';
    const wrap = g.nextElementSibling;
    return ((g.innerText || '') + ' ' + (wrap ? wrap.innerText || '' : '')).replace(/\\s+/g, ' ').slice(0, 300);
  })(${JSON.stringify(label)})`;
  return ((await page.evaluate(expr).catch(() => '')) as string) || '';
}

/** 사람이 읽을 보고서 (Markdown) */
export function renderReport(r: ExploreReport): string {
  const lines: string[] = [];
  lines.push(`# 탐색 보고서: ${r.name}`);
  lines.push('');
  lines.push(
    `- 라우트: \`${r.route}\` · run_id ${r.run_id} · ${r.started_at.slice(0, 16)} ~ ${r.ended_at.slice(11, 16)}`,
  );
  lines.push(`- 종료 사유: ${r.stop_reason}`);
  lines.push(
    `- 결정 ${r.totals.decisions}회, 동작 ${r.totals.actions}회, 비용 $${r.totals.cost.toFixed(4)}, 이상 ${r.totals.anomalies}건, 정보 ${r.totals.infos}건`,
  );
  if (r.names_used.length)
    lines.push(
      `- 사용한 리소스 이름(생성됐을 수 있음, \`npm run stacks:cleanup\` 으로 정리): ${[...new Set(r.names_used)].join(', ')}`,
    );
  lines.push('');
  lines.push('## 이상·정보 판정');
  const flagged = r.steps.filter((s) => s.findings.length);
  if (!flagged.length) lines.push('- 없음');
  for (const s of flagged)
    for (const f of s.findings)
      lines.push(
        `- #${s.n} ${f.severity === 'info' ? '정보' : f.severity === 'fatal' ? '치명' : '이상'} **${f.kind}** — ${f.detail} (동작: ${s.role ?? ''} "${s.label}"${s.text !== null ? ` = ${JSON.stringify(s.text)}` : ''}, [스크린샷](${s.screenshot}))`,
      );
  lines.push('');
  lines.push('## 단계');
  lines.push('| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of r.steps)
    lines.push(
      `| ${s.n} | ${s.operation} ${s.role ?? ''} "${s.label}" | ${s.text === null ? '' : JSON.stringify(s.text)} | ${s.why ?? ''} | ${s.probability === null ? '-' : s.probability.toFixed(2)} | ${s.page_changed === null ? '?' : s.page_changed ? '예' : '아니오'} | ${(s.modal ?? '').slice(0, 60)} |`,
    );
  lines.push('');
  lines.push('## 시도하지 않은 컨트롤');
  if (!r.untried.length) lines.push('- 없음');
  for (const u of r.untried) lines.push(`- ${u}`);
  lines.push('');
  return lines.join('\n');
}
