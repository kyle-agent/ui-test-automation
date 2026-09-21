/**
 * 관측·실행. browser-use/jev-ultrafast 의 browser.py(MIT) 를 Playwright 위에 옮겼다.
 *
 *  - observe(): snapshot.js 를 한 번 evaluate 해서 보이는 컨트롤과 텍스트를 원자적으로 읽는다.
 *  - fresh():   결정이 관측했던 페이지/요소가 아직 그대로인지 확인한다 (페이지 키 + 요소 가드).
 *  - act():     입력 직전에 요소의 현재 좌표를 다시 구하고 hit-test 로 가려짐을 확인한 뒤에만 마우스/키보드를 보낸다.
 *  - describe(): 선택된 요소를 Playwright 로케이터 힌트(role, name, nth …)로 기술한다. 트레이스 → spec 변환에 쓴다.
 *
 * 모델이 준 것은 관측된 요소 id 뿐이다. 셀렉터·좌표·코드는 코드가 만든다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import type { ObservedAction, PageState } from './decide';

export const READ_STATE = fs.readFileSync(path.resolve(process.cwd(), 'src/jev/snapshot.js'), 'utf8');

export class StalePage extends Error {
  constructor(message = '페이지가 바뀌었습니다. 다시 관측하세요.') {
    super(message);
    this.name = 'StalePage';
  }
}

export interface Descriptor {
  role: string | null;
  name: string;
  nth: number;
  count: number;
  tag: string;
  id: string;
  placeholder: string;
  text: string;
  href: string | null;
  pointer: boolean;
  /** getByRole 로 잡을 수 없을 때(role 없음/이름 없음) getByText 로 대신 잡을 텍스트 */
  fallbackText: string;
}

async function evaluate<T>(page: Page, expression: string): Promise<T> {
  try {
    return (await page.evaluate(expression)) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Execution context was destroyed|navigation|Target closed|detached/i.test(msg)) throw new StalePage();
    throw err;
  }
}

export async function observe(page: Page): Promise<PageState> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const info = await evaluate<PageState | null>(page, READ_STATE);
      if (info === null) throw new StalePage('문서가 아직 없습니다 (이동 중).');
      info.fingerprint = fingerprint(info);
      return info;
    } catch (err) {
      if (!(err instanceof StalePage) || attempt === 9) throw err;
      await page.waitForTimeout(100);
    }
  }
  throw new StalePage('페이지가 안정되지 않습니다.');
}

export function fingerprint(state: Pick<PageState, 'url' | 'text' | 'actions' | 'scroll'>): string {
  const content = JSON.stringify({
    url: state.url,
    text: state.text,
    actions: state.actions,
    scroll: state.scroll,
  });
  let h = 0;
  for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

const MARKER = `(() => { const state=${READ_STATE}; return state?.marker ?? null; })()`;

export async function fresh(page: Page, state: PageState, action?: ObservedAction): Promise<boolean> {
  if (action && (action.kind === 'click' || action.kind === 'select')) {
    const node = action.node;
    if (typeof node !== 'number') return false;
    const current = await evaluate<unknown>(
      page,
      `(() => { const c=window.__jevFast; return c ? [c.pageKey(), c.guard(c.nodes.get(${node}))] : null; })()`,
    );
    return JSON.stringify(current) === JSON.stringify([state.page_key, state.guards[String(node)] ?? null]);
  }
  const marker = await evaluate<unknown>(page, MARKER);
  return JSON.stringify(marker) === JSON.stringify(state.marker);
}

/** 관측된 요소에 대해, 실행 직전에 가시성·활성·가려짐을 다시 확인하고 중심 좌표를 돌려준다. */
const TARGET_POINT = (action: ObservedAction) => `((action) => {
  const e=window.__jevFast?.nodes.get(action.node);
  if (!e?.isConnected || e.matches(':disabled') || e.closest('[aria-disabled="true"],[inert]') ||
      !e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return null;
  if (action.kind==='fill' && (e.readOnly || e.getAttribute('aria-readonly')==='true')) return null;
  const r=e.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
  if (!r.width || !r.height || x<0 || y<0 || x>=innerWidth || y>=innerHeight) return null;
  if (!e.contains(document.elementFromPoint(x,y))) return null;
  if (action.kind==='select') {
    if (e.tagName!=='SELECT' || ![...e.options].some(o=>o.value===action.value &&
        !o.disabled && !o.closest('optgroup[disabled]'))) return null;
    e.value=action.value;
    e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true}));
  }
  return {x,y};
})(${JSON.stringify({ node: action.node, kind: action.kind, value: action.value })})`;

export async function act(
  page: Page,
  action: ObservedAction,
  state: PageState,
  text?: string | null,
): Promise<void> {
  if (!(await fresh(page, state, action)))
    throw new StalePage('결정 이후 페이지가 바뀌었습니다. 다시 관측하세요.');
  if (action.kind === 'wait') {
    await page.waitForTimeout(100);
    return;
  }
  if (action.kind === 'scroll') {
    await page.mouse.wheel(0, action.delta ?? 560);
    return;
  }
  if (typeof action.node !== 'number') throw new Error('관측되지 않은 노드입니다.');
  const point = await evaluate<{ x: number; y: number } | null>(page, TARGET_POINT(action));
  if (point === null) {
    if (action.kind === 'select') throw new Error('드롭다운 실행을 확인하지 못했습니다. 다시 관측하세요.');
    throw new StalePage('대상이 바뀌었거나 가려져 있습니다. 다시 관측하세요.');
  }
  if (action.kind === 'select') return;
  await page.mouse.click(point.x, point.y);
  if (action.kind === 'fill') {
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(text ?? '');
  }
}

/** 입력 후 화면이 반응할 시간을 준다. 콤보박스 입력이면 제안 목록이 뜰 때까지 최대 200ms, 그 외 두 프레임 또는 50ms. */
export async function settle(page: Page, action: ObservedAction): Promise<void> {
  const autocomplete = action.kind === 'fill' && action.role === 'combobox';
  await page.waitForTimeout(autocomplete ? 200 : 60);
  await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => undefined);
}

export async function describe(page: Page, node: number): Promise<Descriptor | null> {
  return evaluate<Descriptor | null>(
    page,
    `((node) => {
      const c=window.__jevFast; const e=c?.nodes.get(node); if (!e?.isConnected) return null;
      const role=c.role(e), name=c.name(e);
      const all=[...document.querySelectorAll('*')].filter(x=>c.visible(x) && c.role(x)===role && c.name(x)===name);
      const text=(e.innerText||e.value||'').replace(/\\s+/g,' ').trim().slice(0,80);
      return {role, name, nth: all.indexOf(e), count: all.length, tag: e.tagName.toLowerCase(), id: e.id||'',
        placeholder: e.getAttribute('placeholder')||'', text, href: e.getAttribute('href'),
        pointer: !e.matches('a[href],button,input,textarea,select,summary,[contenteditable="true"],[role]'),
        fallbackText: text || name};
    })(${node})`,
  );
}
