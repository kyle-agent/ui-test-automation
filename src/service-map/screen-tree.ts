/**
 * 화면 트리: 서비스 맵(메뉴 단위 목록 화면)을 콘솔을 돌며 탭·모달·하위 메뉴·상세·생성 화면까지 펼친 것 (2026-10-22).
 * 서비스 맵 `service-map/screens.json` 은 메뉴 API 에서 온 목록 route 뿐이라 "상품 메인 → 리소스 목록 → 상세/생성" 의 실제 모수를 모른다.
 * `scripts/screen-crawl.ts` 가 화면마다 들어가 아래를 모은다. 여기는 브라우저 없이 쓰는 순수 부분(판정·집계·출력)이다.
 *
 *  - 목록 화면: 제목, 탭, 상단 버튼(행 밖), 행 버튼 라벨, 행 수, 왼쪽 메뉴(하위 메뉴 포함)
 *  - 상단 버튼 중 여는 버튼(생성·등록·추가·신청·발급)만 눌러 본다 → 새 화면(route) 또는 모달(제목·컨트롤·버튼) 또는 메뉴(항목)
 *  - 삭제·해지·중지 같은 버튼은 라벨만 적는다(절대 누르지 않는다). 행 선택이 필요해 비활성인 버튼도 라벨만.
 *  - 첫 행을 눌러 상세로 가면 상세의 제목·탭·버튼·수정 아이콘 라벨을 모으고, 탭을 하나씩 눌러 route 가 바뀌는지 본다.
 *  아무것도 입력·저장하지 않는다. 모달은 취소/닫기/Esc 로 닫는다.
 */
import fs from 'node:fs';
import path from 'node:path';

export const SCREEN_TREE_JSON = path.resolve(process.cwd(), 'service-map', 'screen-tree.json');

/** 수집된 화면 트리. 없으면 null (대시보드는 트리 없이도 그린다) */
export function readScreenTree(file = SCREEN_TREE_JSON): ScreenTree | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as ScreenTree;
  } catch {
    return null;
  }
}

export type ButtonKind = 'opens' | 'needs-row' | 'destructive' | 'other';

export interface TreeButton {
  label: string;
  kind: ButtonKind;
  disabled?: boolean;
  /** 눌러 본 결과 (opens 만) */
  opens?: TreeOpened;
}

export interface TreeOpened {
  type: 'page' | 'modal' | 'menu' | 'none';
  route?: string;
  title?: string;
  buttons?: string[];
  /** 입력 컨트롤 수(input·textarea·드롭다운·체크) */
  controls?: number;
  tabs?: string[];
  items?: string[];
}

export interface TreeTab {
  label: string;
  /** 탭을 눌렀을 때 route 가 바뀌면 그 route */
  route?: string;
  buttons?: string[];
  /** 수정 아이콘이 있는 라벨 */
  edits?: string[];
  rows?: number;
}

export interface TreeDetail {
  route: string;
  title: string;
  tabs: TreeTab[];
  buttons: string[];
  edits: string[];
}

export interface TreeScreen {
  name: string;
  route: string;
  title?: string;
  tabs: TreeTab[];
  buttons: TreeButton[];
  rowActions: string[];
  rows?: number;
  detail?: TreeDetail;
  /** 메뉴 API 가 알려 준 상세 route 패턴(행이 없어 상세에 못 들어가도 상세 화면이 있다는 근거) */
  detailPath?: string;
  /** 메뉴 API 가 알려 준 생성 route(상품 단위) */
  requestPath?: string;
  /** 왼쪽 메뉴에 보이는 이 상품의 메뉴(하위 메뉴 포함): "상위 > 하위" */
  menu?: { label: string; route: string }[];
  error?: string;
  crawledAt: string;
}

export interface TreeService {
  category: string;
  name: string;
  screens: TreeScreen[];
}

export interface ScreenTree {
  generatedAt: string;
  services: TreeService[];
}

/** 절대 누르지 않는 버튼 */
export const DANGER_RE =
  /삭제|해지|중지|정지|종료|재시작|재기동|시작|초기화|되돌|해제|제거|강제|반납|회수|탈퇴|복구|복원|롤백|적용|저장|배포|실행|전환|승인|거부|차단|결제|구매|주문|갱신|연장/;
/** 눌러서 다음 화면·모달을 여는 버튼. 저장·실행이 아니라 여는 것만 */
export const OPEN_RE = /생성|등록|추가|만들기|신청|발급|가져오기|업로드|복제|복사|내보내기|다운로드|요청/;
const NO_OPEN_RE = /새로고침|새로 고침|검색|필터|닫기|취소|확인|이전|다음|더보기|더 보기|전체|초기화/;
/** 콘솔 셸(상단 바·도움말) 버튼: 화면의 버튼이 아니다 */
export const CHROME_LABEL_RE =
  /^(질문하기|한국 서부\d?|Global|내 정보|My Info\.?|Overview|How-to guides|API Reference|CLI Reference|서비스 목록|목록 전체보기|\d+개씩 보기)$/;

/** 프로브 버튼 라벨 목록에서 셸 버튼·비활성 표시를 정리한 라벨만 */
export function cleanLabels(raw: readonly string[]): string[] {
  return raw.map((x) => splitLabel(x).label).filter((l) => !CHROME_LABEL_RE.test(l));
}

export function classifyButton(label: string, disabled = false): ButtonKind {
  const l = label.replace(/\s+/g, ' ').trim();
  if (!l) return 'other';
  if (DANGER_RE.test(l)) return 'destructive';
  if (disabled && !/보기|페이지/.test(l)) return 'needs-row';
  if (OPEN_RE.test(l) && !NO_OPEN_RE.test(l)) return 'opens';
  return 'other';
}

/** 브라우저에서 한 번의 evaluate 로 화면을 읽는다. 문자열 표현식: tsx(esbuild) 가 evaluate 안의 함수에 helper 를 끼워 넣어 깨지는 것을 피한다. */
export const PROBE_JS = `(() => {
  const vis = (e) => !e.closest('[aria-hidden="true"],[inert]') && e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const t = (e) => (e.innerText || e.textContent || '').replace(/\\s+/g, ' ').trim();
  const CHROME = 'header,nav,aside,[role="navigation"],[role="banner"],.scp-breadcrumb,.scp-con-header-breadcrumb,.main-layout-lnb,.scp-gnb,.scp-con-header';
  const inChrome = (e) => !!e.closest(CHROME);
  const MODAL = '.scp-modal,[role="dialog"],.modal';
  const modals = [...document.querySelectorAll(MODAL)].filter(vis).filter((m) => !m.classList.contains('notice-info-container'));
  const modal = modals.length ? modals[modals.length - 1] : null;
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  // 행 안은 button 태그만(role=button 은 행 전체를 잡는다). 탭 머리(.scp-tab)는 버튼이 아니다. 숫자만 있는 라벨(페이지 번호)은 뺀다
  const buttonsIn = (root, opts) => uniq([...root.querySelectorAll(opts.tr ? 'button' : 'button,[role="button"],a.btn,a[class*="button"]')]
    .filter(vis)
    .filter((b) => (opts.chrome || !inChrome(b)) && (opts.tr ? !!b.closest('tr') : !b.closest('tr')) && (opts.modal ? true : !b.closest(MODAL)) && !b.closest('.scp-tab,.scp-tabs'))
    .map((b) => { const s = t(b).slice(0, 40); return s && !/^[\\d\\s.,]+$/.test(s) ? s + (b.disabled || b.getAttribute('aria-disabled') === 'true' ? '\\u0000dis' : '') : ''; }));
  const controlsIn = (root) => [...root.querySelectorAll('input:not([type=hidden]),textarea,select,.scp-dropdown,.scp-select,[role="combobox"],[role="radio"],[role="checkbox"],[role="switch"]')].filter(vis).length;
  // 탭: role=tab 이거나, 클래스에 tab(table 제외)이 든 컨테이너 바로 아래의 li/a/button/div
  const isTabClass = (c) => /(^|[\\s_-])tabs?([\\s_-]|$)|tab-(item|list|menu|nav|head|header|btn|button)|(^|[\\s_-])nav-tabs/i.test(c) && !/table/i.test(c);
  const tabEls = [...document.querySelectorAll('[role="tab"],[class]')].filter((e) => {
    if (!vis(e) || inChrome(e) || e.closest(MODAL)) return false;
    if (e.getAttribute('role') === 'tab') return true;
    const tag = e.tagName.toLowerCase();
    if (!['li', 'a', 'button', 'div', 'span'].includes(tag)) return false;
    const own = String(e.className || '');
    const p = e.parentElement; const pc = p ? String(p.className || '') : '';
    const g = p && p.parentElement; const gc = g ? String(g.className || '') : '';
    if (/table|tbody|thead/i.test(own + pc)) return false;
    // 자기 클래스가 tab-item 류이거나, 부모/조부모가 tabs 컨테이너
    return /tab-?(item|btn|button|title|label)/i.test(own) || (isTabClass(pc) && tag !== 'div') || (isTabClass(gc) && tag === 'li');
  });
  // SCP 콘솔 실측(2026-10-22 IAM 사용자 상세): 탭은 .scp-tabs > .tabs-header(.tabs-header-text), 머리는 role=button. 다른 구조는 위 휴리스틱으로
  const scpTabs = [...document.querySelectorAll('.scp-tabs .tabs-header, .scp-tab .tabs-header, .scp-tab .tab-header')].filter(vis).filter((e) => !e.closest(MODAL)).map((e) => { const x = e.querySelector('.tabs-header-text, .tab-header-text'); return t(x || e).slice(0, 40); });
  const tabs = uniq(scpTabs.concat(tabEls.map((e) => t(e).slice(0, 40))).filter((s) => s && s.length <= 40 && !/\\n/.test(s)));
  // 왼쪽 메뉴: 해시 링크. 중첩 깊이는 ul 조상 수
  const menuRoot = document.querySelector('.main-layout-lnb,aside,[class*="lnb"]');
  const menu = menuRoot ? uniq([...menuRoot.querySelectorAll('a[href*="#/"],[data-route]')].filter(vis).map((a) => {
    const href = a.getAttribute('href') || a.getAttribute('data-route') || '';
    const i = href.indexOf('#'); const route = (i >= 0 ? href.slice(i + 1) : href).split('?')[0];
    let depth = 0; let p = a.parentElement; while (p && p !== menuRoot) { if (p.tagName === 'UL') depth++; p = p.parentElement; }
    return route ? JSON.stringify({ label: t(a).slice(0, 40), route, depth }) : '';
  })).map((s) => JSON.parse(s)) : [];
  const edits = uniq([...document.querySelectorAll('.scp-form-group-label')].filter(vis).filter((l) => l.querySelector('i')).map((l) => t(l).slice(0, 40)));
  const rows = [...document.querySelectorAll('tr.scp-body-row')].filter(vis).length;
  const h = document.querySelector('h1,h2,.scp-con-header-title,[class*="page-title"],[class*="title"]');
  return {
    hash: location.hash.replace(/^#/, '').split('?')[0],
    title: document.title,
    heading: h && vis(h) ? t(h).slice(0, 60) : '',
    tabs,
    buttons: buttonsIn(document, { chrome: false, tr: false, modal: false }),
    rowButtons: buttonsIn(document, { chrome: false, tr: true, modal: false }),
    rows,
    edits,
    controls: modal ? 0 : controlsIn(document),
    menu,
    modal: modal ? {
      title: (() => { const x = modal.querySelector('.modal-header,.scp-modal-header,[class*="modal-title"],[class*="header"],h1,h2,h3'); return x ? t(x).slice(0, 80) : t(modal).slice(0, 60); })(),
      buttons: buttonsIn(modal, { chrome: true, tr: false, modal: true }),
      controls: controlsIn(modal),
      text: t(modal).slice(0, 200),
    } : null,
    // 드롭다운 메뉴(생성 버튼이 메뉴를 펼치는 경우)
    menuItems: uniq([...document.querySelectorAll('[role="menu"] [role="menuitem"],.scp-dropdown-menu li,.dropdown-menu li,ul[class*="menu"]:not(aside ul) li')].filter(vis).filter((e) => !inChrome(e)).map((e) => t(e).slice(0, 40))).slice(0, 20),
  };
})()`;

export interface Probe {
  hash: string;
  title: string;
  heading: string;
  tabs: string[];
  /** 라벨, 비활성이면 뒤에 \u0000dis */
  buttons: string[];
  rowButtons: string[];
  rows: number;
  edits: string[];
  controls: number;
  menu: { label: string; route: string; depth: number }[];
  modal: { title: string; buttons: string[]; controls: number; text: string } | null;
  menuItems: string[];
}

export const DIS = '\u0000dis';

export function splitLabel(raw: string): { label: string; disabled: boolean } {
  const disabled = raw.endsWith(DIS);
  return { label: disabled ? raw.slice(0, -DIS.length) : raw, disabled };
}

export function buttonsOf(probe: Pick<Probe, 'buttons'>): TreeButton[] {
  return probe.buttons
    .map((raw) => splitLabel(raw))
    .filter(({ label }) => !CHROME_LABEL_RE.test(label))
    .map(({ label, disabled }) => ({
      label,
      kind: classifyButton(label, disabled),
      disabled: disabled || undefined,
    }));
}

/** document.title "VPC 목록 | VPC | kr-west1 | Console" → "VPC 목록" */
export function screenTitle(title: string): string {
  return title.split('|')[0]!.trim();
}

/** 상품 route 의 첫 구획("/vpc/vpc/list" → "/vpc") 아래 메뉴만, 하위 메뉴는 depth 로 */
export function productMenu(
  menu: readonly { label: string; route: string; depth: number }[],
  productRoute: string,
): { label: string; route: string }[] {
  const base = '/' + (productRoute.replace(/^#/, '').split('/').filter(Boolean)[0] ?? '');
  if (base === '/') return [];
  const depths = menu.filter((m) => m.route === base || m.route.startsWith(base + '/')).map((m) => m.depth);
  const min = depths.length ? Math.min(...depths) : 0;
  return menu
    .filter((m) => m.route === base || m.route.startsWith(base + '/'))
    .map((m) => ({ label: `${'  '.repeat(Math.max(0, m.depth - min))}${m.label}`, route: m.route }));
}

export interface TreeCounts {
  services: number;
  screens: number;
  tabs: number;
  detailScreens: number;
  detailTabs: number;
  createPages: number;
  modals: number;
  subMenus: number;
  edits: number;
  errors: number;
  /** 전체 화면 수 = 목록 + 생성 화면 + 상세 + 상세 탭(route 있는 것) + 모달 */
  total: number;
}

export function countTree(tree: ScreenTree): TreeCounts {
  const n: TreeCounts = {
    services: tree.services.length,
    screens: 0,
    tabs: 0,
    detailScreens: 0,
    detailTabs: 0,
    createPages: 0,
    modals: 0,
    subMenus: 0,
    edits: 0,
    errors: 0,
    total: 0,
  };
  const mapped = new Set<string>();
  for (const s of tree.services) for (const sc of s.screens) mapped.add(sc.route);
  for (const s of tree.services)
    for (const sc of s.screens) {
      n.screens++;
      n.tabs += sc.tabs.length;
      if (sc.error) n.errors++;
      for (const b of sc.buttons) {
        if (b.opens?.type === 'page') n.createPages++;
        if (b.opens?.type === 'modal') n.modals++;
      }
      if (sc.detail || sc.detailPath) n.detailScreens++;
      if (sc.detail) {
        n.detailTabs += sc.detail.tabs.filter((t) => t.route).length;
        n.edits += sc.detail.edits.length;
      }
      for (const m of sc.menu ?? []) if (!mapped.has(m.route)) n.subMenus++;
    }
  n.total = n.screens + n.createPages + n.detailScreens + n.detailTabs + n.modals;
  return n;
}

export function renderTreeMarkdown(tree: ScreenTree): string {
  const n = countTree(tree);
  const out: string[] = [
    `# 화면 트리 (${tree.generatedAt.slice(0, 16).replace('T', ' ')})`,
    '',
    `상품 ${n.services} · 목록 화면 ${n.screens} · 생성 화면 ${n.createPages} · 상세 ${n.detailScreens} · 상세 탭(route) ${n.detailTabs} · 모달 ${n.modals} · 맵에 없는 메뉴 ${n.subMenus} · 수정 항목 ${n.edits} · 오류 ${n.errors} → **화면 합계 ${n.total}**`,
    '',
  ];
  for (const s of tree.services) {
    out.push(`## ${s.category} / ${s.name}`, '');
    for (const sc of s.screens) {
      out.push(
        `- **${sc.name}** \`${sc.route}\`${sc.title ? ` — ${sc.title}` : ''}${sc.rows != null ? ` · 행 ${sc.rows}` : ''}${sc.error ? ` · ⚠ ${sc.error}` : ''}`,
      );
      if (sc.tabs.length) out.push(`  - 탭: ${sc.tabs.map((t) => t.label).join(' · ')}`);
      if (sc.buttons.length)
        out.push(
          `  - 버튼: ${sc.buttons
            .map((b) => {
              const o = b.opens;
              const tail =
                o?.type === 'page'
                  ? ` → 화면 \`${o.route}\`${o.title ? ` "${o.title}"` : ''}${o.controls ? ` (입력 ${o.controls})` : ''}`
                  : o?.type === 'modal'
                    ? ` → 모달 "${o.title ?? ''}"${o.controls ? ` (입력 ${o.controls})` : ''}`
                    : o?.type === 'menu'
                      ? ` → 메뉴 [${(o.items ?? []).join(', ')}]`
                      : o?.type === 'none'
                        ? ' → 변화 없음'
                        : '';
              const mark =
                b.kind === 'destructive'
                  ? '✕'
                  : b.kind === 'needs-row'
                    ? '○'
                    : b.kind === 'opens'
                      ? '▶'
                      : '·';
              return `${mark}${b.label}${tail}`;
            })
            .join(' / ')}`,
        );
      if (sc.rowActions.length) out.push(`  - 행 버튼: ${sc.rowActions.join(' · ')}`);
      if (!sc.detail && sc.detailPath)
        out.push(`  - 상세(메뉴 API) \`${sc.detailPath}\` — 행이 없어 들어가지 못함`);
      if (sc.detail) {
        out.push(
          `  - 상세 \`${sc.detail.route}\`${sc.detail.title ? ` "${sc.detail.title}"` : ''}${sc.detail.buttons.length ? ` · 버튼 ${sc.detail.buttons.join(' · ')}` : ''}${sc.detail.edits.length ? ` · 수정 ${sc.detail.edits.join(' · ')}` : ''}`,
        );
        for (const t of sc.detail.tabs)
          out.push(
            `    - 탭 ${t.label}${t.route ? ` \`${t.route}\`` : ''}${t.buttons?.length ? ` · 버튼 ${t.buttons.join(' · ')}` : ''}${t.edits?.length ? ` · 수정 ${t.edits.join(' · ')}` : ''}${t.rows != null ? ` · 행 ${t.rows}` : ''}`,
          );
      }
      if (sc.menu?.length)
        out.push(`  - 메뉴: ${sc.menu.map((m) => `${m.label.trim()}(${m.route})`).join(' · ')}`);
    }
    out.push('');
  }
  return out.join('\n');
}
