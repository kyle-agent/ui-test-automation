/**
 * 화면 트리 수집: 서비스 맵의 화면마다 콘솔에 들어가 탭·상단 버튼·여는 버튼의 결과(화면/모달)·상세·상세 탭·왼쪽 메뉴를 모은다.
 * Jev 없이 결정적으로 돈다. 아무것도 입력·저장·삭제하지 않는다(src/service-map/screen-tree.ts 의 규칙).
 *
 *   npx tsx scripts/screen-crawl.ts [--only "Virtual Server,VPC"] [--category Compute] [--resume] [--no-detail] [--no-open] [--limit 5]
 *     --only       상품 이름(쉼표, 부분 일치)
 *     --resume     service-map/screen-tree.json 에 이미 있는 화면은 건너뛴다 (중단 후 이어서)
 *     --no-detail  첫 행 상세·탭 탐색 생략   --no-open  여는 버튼(생성 등) 누르기 생략
 *     --map <json>  서비스 맵 파일(기본 service-map/screens.json). --out <json> 결과 파일(기본 service-map/screen-tree.json)
 *
 * 로그인 브라우저(PW_CDP_URL) 또는 저장 세션이 필요하다. 결과: service-map/screen-tree.json(+ .md). 둘 다 콘솔에서 받아온 것이라 커밋하지 않는다.
 */
import '../src/console/env';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { openConsoleSession } from '../src/console/browser';
import { gotoRoute, SessionExpiredError } from '../src/console/expect';
import { settleConsole } from '../src/console/overlays';
import { parseArgs, readScreenMap, SERVICE_MAP_DIR } from '../src/service-map/io';
import {
  buttonsOf,
  cleanLabels,
  countTree,
  PROBE_JS,
  productMenu,
  renderTreeMarkdown,
  screenTitle,
  splitLabel,
  type Probe,
  type ScreenTree,
  type TreeButton,
  type TreeDetail,
  type TreeOpened,
  type TreeScreen,
  type TreeService,
  type TreeTab,
} from '../src/service-map/screen-tree';

const { flags } = parseArgs(process.argv.slice(2));
const TREE_JSON =
  typeof flags.out === 'string' ? path.resolve(flags.out) : path.join(SERVICE_MAP_DIR, 'screen-tree.json');
const TREE_MD = TREE_JSON.replace(/.json$/, '.md');
const MAX_OPEN_BUTTONS = 4;
const MAX_TABS = 12;

const only =
  typeof flags.only === 'string'
    ? flags.only
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
const category = typeof flags.category === 'string' ? flags.category.toLowerCase() : '';
const limit = typeof flags.limit === 'string' ? Number(flags.limit) : Infinity;
const doDetail = !flags['no-detail'];
const doOpen = !flags['no-open'];

const log = (line: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${line}`);

function loadTree(): ScreenTree {
  if (flags.resume && fs.existsSync(TREE_JSON))
    return JSON.parse(fs.readFileSync(TREE_JSON, 'utf8')) as ScreenTree;
  return { generatedAt: new Date().toISOString(), services: [] };
}

function saveTree(tree: ScreenTree): void {
  tree.generatedAt = new Date().toISOString();
  fs.writeFileSync(TREE_JSON, JSON.stringify(tree, null, 1));
  fs.writeFileSync(TREE_MD, renderTreeMarkdown(tree));
}

async function probe(page: Page): Promise<Probe> {
  return (await page.evaluate(PROBE_JS)) as Probe;
}

const hashOf = (page: Page) => (page.url().split('#')[1] ?? '').split('?')[0];

/** 모달을 닫는다: 헤더 닫기 아이콘 → 취소/닫기 버튼 → Esc */
async function closeModal(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const modal = page.locator('.scp-modal:visible, [role=dialog]:visible').last();
    if (!(await modal.isVisible().catch(() => false))) return;
    const icon = modal.locator('.modal-header-icon, [class*="close"]').first();
    const cancel = modal.getByRole('button', { name: /^(취소|닫기|아니오|아니요)$/ }).last();
    if (await icon.isVisible().catch(() => false))
      await icon.click({ timeout: 3_000 }).catch(() => undefined);
    else if (await cancel.isVisible().catch(() => false))
      await cancel.click({ timeout: 3_000 }).catch(() => undefined);
    else await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(500);
  }
}

/** 목록으로 돌아온다. "나가시겠습니까" 류 확인 모달이 뜨면 나가는 쪽 버튼을 누른다 (입력한 것이 없으니 잃을 것도 없다). */
async function backToList(page: Page, route: string): Promise<void> {
  await gotoRoute(page, route);
  const modal = page.locator('.scp-modal:visible, [role=dialog]:visible').last();
  if (await modal.isVisible().catch(() => false)) {
    const text = ((await modal.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (/나가|이동|취소하시겠|작성 중|저장되지/.test(text)) {
      await modal
        .getByRole('button', { name: /^(확인|나가기|예|이동)$/ })
        .last()
        .click({ timeout: 3_000 })
        .catch(() => undefined);
      await page.waitForTimeout(500);
    } else await closeModal(page);
    if (hashOf(page) !== route.replace(/^#/, '')) await gotoRoute(page, route);
  }
}

async function tryOpenButton(page: Page, route: string, b: TreeButton): Promise<TreeOpened> {
  const before = hashOf(page);
  const btn = page
    .locator('button:visible:not(tr button)')
    .filter({ hasText: new RegExp(`^\\s*${b.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) })
    .first();
  if (!(await btn.isVisible().catch(() => false))) return { type: 'none' };
  await btn.click({ timeout: 5_000 }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  const p = await probe(page);
  if (p.hash && p.hash !== before) {
    const opened: TreeOpened = {
      type: 'page',
      route: p.hash,
      title: screenTitle(p.title) || p.heading,
      buttons: cleanLabels(p.buttons),
      controls: p.controls,
      tabs: p.tabs,
    };
    await backToList(page, route);
    return opened;
  }
  if (p.modal) {
    const opened: TreeOpened = {
      type: 'modal',
      title: p.modal.title,
      buttons: cleanLabels(p.modal.buttons),
      controls: p.modal.controls,
    };
    await closeModal(page);
    return opened;
  }
  if (p.menuItems.length) {
    await page.keyboard.press('Escape').catch(() => undefined);
    return { type: 'menu', items: p.menuItems };
  }
  return { type: 'none' };
}

async function crawlDetail(page: Page, route: string): Promise<TreeDetail | undefined> {
  const first = page.locator('tr.scp-body-row:visible').first();
  if (!(await first.isVisible().catch(() => false))) return undefined;
  const before = hashOf(page);
  // 이름 칸: 링크가 있으면 링크, 없으면 체크박스 다음 칸의 글자
  // 실측(2026-10-22 IAM 사용자 목록): 이름은 두 번째 칸의 span 이고 td 를 눌러서는 상세로 안 간다 → 링크 → span → td 순
  const link = first.locator('a:visible, [class*="link"]:visible').first();
  const span = first.locator('td').nth(1).locator('span, a').first();
  const target = (await link.count()) ? link : (await span.count()) ? span : first.locator('td').nth(1);
  await target.click({ timeout: 5_000 }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  const p = await probe(page);
  if (!p.hash || p.hash === before) {
    await closeModal(page);
    return undefined;
  }
  const detail: TreeDetail = {
    route: p.hash,
    title: screenTitle(p.title) || p.heading,
    tabs: p.tabs.map((label) => ({ label })),
    buttons: cleanLabels(p.buttons),
    edits: p.edits,
  };
  const detailRoute = p.hash;
  for (const tab of detail.tabs.slice(0, MAX_TABS)) {
    const el = page
      .locator(
        '.scp-tabs .tabs-header:visible, .scp-tab .tab-header:visible, [role=tab]:visible, [class*="tab"] li:visible, [class*="tab"] a:visible, [class*="tab"] button:visible',
      )
      .filter({ hasText: new RegExp(`^\\s*${tab.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) })
      .first();
    if (!(await el.isVisible().catch(() => false))) continue;
    await el.click({ timeout: 5_000 }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 500 });
    const tp = await probe(page);
    const t: TreeTab = tab;
    if (tp.hash && tp.hash !== detailRoute) t.route = tp.hash;
    t.buttons = cleanLabels(tp.buttons);
    t.edits = tp.edits;
    t.rows = tp.rows;
    if (tp.modal) await closeModal(page);
    // 탭이 다른 화면으로 나가 버렸으면 상세로 돌아온다
    if (tp.hash && !tp.hash.startsWith(detailRoute.replace(/\/[^/]*$/, '')))
      await gotoRoute(page, detailRoute);
  }
  return detail;
}

async function crawlScreen(
  page: Page,
  productRoute: string,
  name: string,
  route: string,
  hints: { detailPath?: string; requestPath?: string } = {},
): Promise<TreeScreen> {
  const screen: TreeScreen = {
    name,
    route,
    tabs: [],
    buttons: [],
    rowActions: [],
    crawledAt: new Date().toISOString(),
    ...hints,
  };
  try {
    await gotoRoute(page, route);
    const p = await probe(page);
    screen.title = screenTitle(p.title) || p.heading;
    screen.tabs = p.tabs.map((label) => ({ label }));
    screen.buttons = buttonsOf(p);
    screen.rowActions = cleanLabels(p.rowButtons);
    screen.rows = p.rows;
    screen.menu = productMenu(p.menu, productRoute);
    if (p.modal) await closeModal(page);
    if (doOpen) {
      let opened = 0;
      for (const b of screen.buttons) {
        if (b.kind !== 'opens' || opened >= MAX_OPEN_BUTTONS) continue;
        opened++;
        b.opens = await tryOpenButton(page, route, b);
        log(
          `    ▶ ${b.label} → ${b.opens.type}${b.opens.route ? ` ${b.opens.route}` : ''}${b.opens.title ? ` "${b.opens.title}"` : ''}`,
        );
        if (hashOf(page) !== route.replace(/^#/, '')) await backToList(page, route);
      }
    }
    if (doDetail && p.rows > 0) {
      screen.detail = await crawlDetail(page, route);
      if (screen.detail)
        log(
          `    상세 ${screen.detail.route} 탭 ${screen.detail.tabs.map((t) => t.label + (t.route ? `(${t.route})` : '')).join(' · ') || '없음'}`,
        );
    }
  } catch (e) {
    if (e instanceof SessionExpiredError) throw e;
    screen.error = (e as Error).message.split('\n')[0]!.slice(0, 200);
    log(`    ⚠ ${screen.error}`);
    await closeModal(page).catch(() => undefined);
  }
  return screen;
}

async function main(): Promise<void> {
  const map = readScreenMap(typeof flags.map === 'string' ? path.resolve(flags.map) : undefined);
  const tree = loadTree();
  const done = new Map<string, TreeService>(tree.services.map((s) => [s.name, s]));
  const services = map.services.filter(
    (s) =>
      (!only.length || only.some((o) => s.name.toLowerCase().includes(o))) &&
      (!category || s.category.toLowerCase() === category),
  );
  const session = await openConsoleSession({ headless: !flags.headed });
  const page = await session.context.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => undefined));
  let visited = 0;
  try {
    for (const svc of services) {
      const ts: TreeService = done.get(svc.name) ?? { category: svc.category, name: svc.name, screens: [] };
      if (!done.has(svc.name)) {
        tree.services.push(ts);
        done.set(svc.name, ts);
      }
      const seen = new Set(ts.screens.map((s) => s.route));
      for (const sc of svc.screens) {
        if (visited >= limit) break;
        if (flags.resume && seen.has(sc.route)) continue;
        visited++;
        log(`[${svc.category} / ${svc.name}] ${sc.name} ${sc.route}`);
        const screen = await crawlScreen(page, svc.route, sc.name, sc.route, {
          detailPath: sc.detail_path,
          requestPath: svc.request_path,
        });
        const i = ts.screens.findIndex((s) => s.route === sc.route);
        if (i >= 0) ts.screens[i] = screen;
        else ts.screens.push(screen);
        saveTree(tree);
      }
      if (visited >= limit) break;
    }
  } finally {
    saveTree(tree);
    await page.close().catch(() => undefined);
    await session.close().catch(() => undefined);
  }
  const n = countTree(tree);
  log(
    `끝: 상품 ${n.services} · 목록 ${n.screens} · 생성 화면 ${n.createPages} · 상세 ${n.detailScreens} · 상세 탭 ${n.detailTabs} · 모달 ${n.modals} · 오류 ${n.errors} → 화면 합계 ${n.total} (${path.relative(process.cwd(), TREE_MD)})`,
  );
}

main().catch((e) => {
  console.error(e instanceof SessionExpiredError ? `세션 만료: ${e.message}` : e);
  process.exit(1);
});
