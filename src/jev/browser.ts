/**
 * 관측·실행. browser-use/jev-ultrafast 의 browser.py(MIT) 를 Playwright 위에 옮기고 iframe 을 지원한다.
 *
 *  - observe(): 메인 프레임과 같은 출처의 자식 프레임(micro-app) 각각에서 snapshot.js 를 돌려 하나의 요소 표로 합친다.
 *               각 동작은 frame 인덱스를 갖고, 클릭 좌표는 iframe 의 위치만큼 보정한다.
 *  - fresh():   결정이 관측했던 페이지/요소가 아직 그대로인지 확인한다 (프레임별 페이지 키 + 요소 가드).
 *  - act():     입력 직전에 요소의 현재 좌표를 다시 구하고 hit-test 로 가려짐을 확인한 뒤에만 마우스/키보드를 보낸다.
 *  - describe(): 선택된 요소를 Playwright 로케이터 힌트(role, name, nth, frame …)로 기술한다. 트레이스 → spec 변환에 쓴다.
 *
 * 모델이 준 것은 관측된 요소 id 뿐이다. 셀렉터·좌표·코드는 코드가 만든다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Frame, Page } from '@playwright/test';
import { contentFrames } from '../console/frames';
import type { ObservedAction, PageState } from './decide';

export const READ_STATE = fs.readFileSync(path.resolve(process.cwd(), 'src/jev/snapshot.js'), 'utf8');

export class StalePage extends Error {
  constructor(message = '페이지가 바뀌었습니다. 다시 관측하세요.') {
    super(message);
    this.name = 'StalePage';
  }
}

export interface FrameInfo {
  index: number;
  url: string;
  name: string;
  /** 부모 문서 안에서 이 iframe 을 찾는 셀렉터 (메인 프레임은 null) */
  selector: string | null;
  offset: { x: number; y: number };
  shadow_hosts: number;
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
  /** 요소가 있는 프레임. 메인이면 null */
  frame: FrameInfo | null;
}

interface RawFrameState extends PageState {
  shadow_hosts: number;
  iframes: { src: string; name: string; id: string }[];
}

/** 관측 상태에 붙는, JSON 으로는 저장되지 않는 프레임 핸들 */
const FRAMES = new WeakMap<PageState, Frame[]>();

async function evaluateIn<T>(frame: Frame, expression: string): Promise<T> {
  try {
    return (await frame.evaluate(expression)) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Execution context was destroyed|navigation|Target closed|detached|Frame was detached/i.test(msg))
      throw new StalePage();
    throw err;
  }
}

async function frameOffset(frame: Frame, page: Page): Promise<{ x: number; y: number } | null> {
  if (frame === page.mainFrame()) return { x: 0, y: 0 };
  const handle = await frame.frameElement().catch(() => null);
  if (!handle) return null;
  const box = await handle.boundingBox().catch(() => null);
  await handle.dispose().catch(() => undefined);
  return box ? { x: box.x, y: box.y } : null;
}

async function frameSelector(frame: Frame, page: Page): Promise<string | null> {
  if (frame === page.mainFrame()) return null;
  const handle = await frame.frameElement().catch(() => null);
  if (!handle) return null;
  const sel = await handle
    .evaluate((el) => {
      const f = el as HTMLIFrameElement;
      if (f.id) return `iframe#${CSS.escape(f.id)}`;
      if (f.name) return `iframe[name="${f.name}"]`;
      const src = f.getAttribute('src') ?? '';
      if (src) return `iframe[src*="${src.replace(/^https?:\/\/[^/]+/, '').split('?')[0]}"]`;
      const all = [...document.querySelectorAll('iframe')];
      return `iframe >> nth=${all.indexOf(f)}`;
    })
    .catch(() => null);
  await handle.dispose().catch(() => undefined);
  return sel;
}

export async function observe(page: Page): Promise<PageState> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const frames = contentFrames(page);
      const states: { frame: Frame; state: RawFrameState; info: FrameInfo }[] = [];
      for (const [i, frame] of frames.entries()) {
        const state = await evaluateIn<RawFrameState | null>(frame, READ_STATE);
        if (state === null) {
          if (frame === page.mainFrame()) throw new StalePage('문서가 아직 없습니다 (이동 중).');
          continue;
        }
        const offset = await frameOffset(frame, page);
        if (!offset) continue; // 화면에 없는 iframe
        states.push({
          frame,
          state,
          info: {
            index: i,
            url: frame.url(),
            name: frame.name(),
            selector: await frameSelector(frame, page),
            offset,
            shadow_hosts: state.shadow_hosts,
          },
        });
      }
      const main = states[0]!;
      const actions: ObservedAction[] = [];
      const guards: Record<string, unknown> = {};
      const texts: string[] = [];
      for (const { state, info } of states) {
        texts.push(state.text);
        for (const a of state.actions) {
          const action: ObservedAction = { ...a, frame: info.index };
          if (action.rect)
            action.rect = {
              ...action.rect,
              x: action.rect.x + info.offset.x,
              y: action.rect.y + info.offset.y,
            };
          actions.push(action);
        }
        for (const [node, g] of Object.entries(state.guards)) guards[`${info.index}:${node}`] = g;
      }
      // 프레임별 스크롤/대기 컨트롤은 메인 것만 남긴다.
      const controls = actions.filter((a) => a.kind === 'scroll' || a.kind === 'wait');
      const elements = actions.filter((a) => a.kind !== 'scroll' && a.kind !== 'wait');
      const seen = new Set<string>();
      const merged = [
        ...elements,
        ...controls.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        }),
      ];
      merged.forEach((a, i) => {
        if (a.kind !== 'scroll' && a.kind !== 'wait') a.id = `e${i + 1}`;
      });
      const merged_state: PageState = {
        url: main.state.url,
        title: main.state.title,
        w: main.state.w,
        h: main.state.h,
        text: texts.join('\n').slice(0, 6000),
        scroll: main.state.scroll,
        actions: merged,
        marker: states.map((s) => s.state.marker),
        page_key: states.map((s) => s.state.page_key),
        guards,
        omitted_actions: states.reduce((n, s) => n + s.state.omitted_actions, 0),
        fingerprint: '',
        frames: states.map((s) => s.info),
      };
      merged_state.fingerprint = fingerprint(merged_state);
      FRAMES.set(
        merged_state,
        states.map((s) => s.frame),
      );
      return merged_state;
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
    actions: state.actions.map(({ rect, ...a }) => a),
    scroll: state.scroll,
  });
  let h = 0;
  for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function frameFor(page: Page, state: PageState, action?: ObservedAction): Frame {
  const frames = FRAMES.get(state);
  const index = action?.frame ?? 0;
  const frame = frames?.[state.frames?.findIndex((f) => f.index === index) ?? -1];
  if (!frame || frame.isDetached()) throw new StalePage('요소가 있던 프레임이 사라졌습니다.');
  return frame;
}

const MARKER = `(() => { const state=${READ_STATE}; return state?.marker ?? null; })()`;

export async function fresh(page: Page, state: PageState, action?: ObservedAction): Promise<boolean> {
  if (action && (action.kind === 'click' || action.kind === 'select')) {
    const node = action.node;
    if (typeof node !== 'number') return false;
    const frame = frameFor(page, state, action);
    const current = await evaluateIn<unknown>(
      frame,
      `(() => { const c=window.__jevFast; return c ? [c.pageKey(), c.guard(c.nodes.get(${node}))] : null; })()`,
    );
    const slot = state.frames?.findIndex((f) => f.index === (action.frame ?? 0)) ?? 0;
    const expected = [
      (state.page_key as unknown[])[slot],
      state.guards[`${action.frame ?? 0}:${node}`] ?? null,
    ];
    return JSON.stringify(current) === JSON.stringify(expected);
  }
  const frames = FRAMES.get(state) ?? [page.mainFrame()];
  const markers: unknown[] = [];
  for (const frame of frames) {
    if (frame.isDetached()) return false;
    markers.push(await evaluateIn<unknown>(frame, MARKER));
  }
  return JSON.stringify(markers) === JSON.stringify(state.marker);
}

/** 관측된 요소에 대해, 실행 직전에 가시성·활성·가려짐을 다시 확인하고 (프레임 기준) 중심 좌표를 돌려준다. */
const TARGET_POINT = (action: ObservedAction) => `((action) => {
  const c=window.__jevFast; const e=c?.nodes.get(action.node);
  if (!e?.isConnected || e.matches(':disabled') || e.closest('[aria-disabled="true"],[inert]') ||
      !e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return null;
  if (action.kind==='fill' && (e.readOnly || e.getAttribute('aria-readonly')==='true')) return null;
  const r=e.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
  if (!r.width || !r.height || x<0 || y<0 || x>=innerWidth || y>=innerHeight) return null;
  const hit=c.deepFromPoint ? c.deepFromPoint(x,y) : document.elementFromPoint(x,y);
  if (!(e===hit || e.contains(hit) || (hit && e.getRootNode() instanceof ShadowRoot && e.getRootNode().host===hit))) return null;
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
  const frame = frameFor(page, state, action);
  const point = await evaluateIn<{ x: number; y: number } | null>(frame, TARGET_POINT(action));
  if (point === null) {
    if (action.kind === 'select') throw new Error('드롭다운 실행을 확인하지 못했습니다. 다시 관측하세요.');
    throw new StalePage('대상이 바뀌었거나 가려져 있습니다. 다시 관측하세요.');
  }
  if (action.kind === 'select') return;
  const offset = (await frameOffset(frame, page)) ?? { x: 0, y: 0 };
  await page.mouse.click(point.x + offset.x, point.y + offset.y);
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

export async function describe(
  page: Page,
  state: PageState,
  action: ObservedAction,
): Promise<Descriptor | null> {
  if (typeof action.node !== 'number') return null;
  const frame = frameFor(page, state, action);
  const info = state.frames?.find((f) => f.index === (action.frame ?? 0)) ?? null;
  const d = await evaluateIn<Omit<Descriptor, 'frame'> | null>(
    frame,
    `((node) => {
      const c=window.__jevFast; const e=c?.nodes.get(node); if (!e?.isConnected) return null;
      const role=c.role(e), name=c.name(e);
      const all=c.deepAll().filter(x=>c.visible(x) && c.role(x)===role && c.name(x)===name);
      const text=(e.innerText||e.value||'').replace(/\\s+/g,' ').trim().slice(0,80);
      return {role, name, nth: all.indexOf(e), count: all.length, tag: e.tagName.toLowerCase(), id: e.id||'',
        placeholder: e.getAttribute('placeholder')||'', text, href: e.getAttribute('href'),
        pointer: !e.matches('a[href],button,input,textarea,select,summary,[contenteditable="true"],[role]'),
        fallbackText: text || name};
    })(${action.node})`,
  );
  return d ? { ...d, frame: info && info.index !== 0 ? info : null } : null;
}
