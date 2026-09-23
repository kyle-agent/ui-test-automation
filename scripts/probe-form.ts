/**
 * 화면 프로브 (리소스를 만들지 않는다): 목록 화면의 버튼·표 헤더, 생성 폼의 라벨·컨트롤·힌트·드롭다운 항목을 찍는다.
 * 새 서비스의 spec 을 쓰기 전에 한 번 돌려 라벨과 버튼 문구를 확보한다 (docs/service-facts/*.md 의 "콘솔:" 항목 근거).
 *
 *   MSYS_NO_PATHCONV=1 npm run probe -- --route '#/virtualserver/server-group/list' [--open 'Server Group 생성'] [--out recordings/probe]
 *   --open 을 생략하면 목록에서 "생성"/"신청"/"예약" 으로 끝나는 첫 버튼을 누른다. --no-form 이면 목록만 본다.
 *
 * 로그인 브라우저(PW_CDP_URL)가 필요하다. 폼은 열어 본 뒤 "취소"(와 이어지는 "나가시겠습니까?" 모달)로 닫는다.
 */
import '../src/console/env';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { connectLiveBrowser } from '../src/console/browser';
import { gotoRoute } from '../src/console/expect';
import { settleConsole } from '../src/console/overlays';
import { dismissModalIfAny, dropdown } from '../src/console/ui';
import { parseArgs } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const route = typeof flags.route === 'string' ? flags.route : '';
if (!route) {
  console.error(
    "사용법: npm run probe -- --route '#/virtualserver/server-group/list' [--open '<버튼>'] [--no-form]",
  );
  process.exit(2);
}
const outDir = typeof flags.out === 'string' ? flags.out : path.join('recordings', 'probe');
fs.mkdirSync(outDir, { recursive: true });
const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

const LIST_BUTTONS =
  "[...document.querySelectorAll('button')].filter(b=>b.checkVisibility()&&!b.closest('header')).map(b=>b.innerText.trim()+(b.getAttribute('aria-disabled')==='true'?'(dis)':''))";
/** 폼 그룹: 라벨, 그 아래 컨트롤 종류, 안내 문구. 라벨은 .scp-form-group-label, 컨트롤은 다음 형제 안에서 찾는다. */
const FORM_GROUPS = `(() => {
  const vis = (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const t = (e) => (e.innerText || '').replace(/[ \\t\\r\\n]+/g, ' ').trim();
  return [...document.querySelectorAll('.scp-form-group-label')].filter(vis).map((l) => {
    const wrap = l.nextElementSibling;
    const ctrls = wrap
      ? [...wrap.querySelectorAll('input,textarea,select,button,.scp-dropdown,.scp-select,[role=radio],[role=checkbox]')]
          .filter(vis)
          .map((c) => c.tagName.toLowerCase() + (c.className && c.className.toString().includes('scp-dropdown') ? '.dropdown' : c.className && c.className.toString().includes('scp-select') ? '.checkbox' : '') + (c.type ? '[' + c.type + ']' : '') + (t(c) ? ' "' + t(c).slice(0, 30) + '"' : '') + (c.getAttribute('placeholder') ? ' ph=' + c.getAttribute('placeholder') : ''))
          .slice(0, 8)
      : [];
    return { label: t(l).slice(0, 60), ctrls, hint: wrap ? t(wrap).slice(0, 120) : '' };
  });
})()`;

async function listButtons(page: Page): Promise<string[]> {
  return (await page.evaluate(LIST_BUTTONS)) as string[];
}

async function main(): Promise<void> {
  const browser = await connectLiveBrowser();
  const page = await browser.contexts()[0]!.newPage();
  const out: string[] = [];
  const say = (line: string) => {
    console.log(line);
    out.push(line);
  };
  try {
    await gotoRoute(page, route);
    await page.waitForTimeout(1_000);
    say(`# ${route}`);
    say(`title: ${await page.title()}`);
    say(`list buttons: ${JSON.stringify(await listButtons(page))}`);
    say(
      `headers: ${(
        await page
          .locator('thead')
          .first()
          .innerText()
          .catch(() => '(없음)')
      ).replace(/\s+/g, ' | ')}`,
    );
    const rows = await page.locator('tr.scp-body-row').allInnerTexts();
    say(
      `rows: ${rows.length}${rows.length ? ' 예: ' + rows[0]!.replace(/\s+/g, ' ').trim().slice(0, 100) : ''}`,
    );
    if (rows.length) {
      const first = page.locator('tr.scp-body-row').first();
      say(
        `row buttons: ${JSON.stringify(await first.locator('button').allInnerTexts())} select icon: ${await first.locator('i.table-select').count()}`,
      );
    }
    await page
      .screenshot({ path: path.join(outDir, `${slug}-list.png`), fullPage: true })
      .catch(() => undefined);
    if (flags['no-form']) return;
    const openName =
      typeof flags.open === 'string'
        ? flags.open
        : (await listButtons(page)).find((b) => /(생성|신청|예약)$/.test(b) && !b.endsWith('(dis)'));
    if (!openName) {
      say('생성 버튼을 찾지 못했다 (--open 으로 지정)');
      return;
    }
    await page.getByRole('button', { name: openName, exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page.waitForTimeout(800);
    say(`\n## "${openName}" → ${page.url().split('#')[1]} — ${await page.title()}`);
    const groups = (await page.evaluate(FORM_GROUPS)) as { label: string; ctrls: string[]; hint: string }[];
    for (const g of groups) say(`- ${g.label} | ${g.ctrls.join(', ') || '(컨트롤 없음)'} | ${g.hint}`);
    say(`buttons: ${JSON.stringify(await listButtons(page))}`);
    // 드롭다운 항목
    for (const g of groups) {
      if (!g.ctrls.some((c) => c.includes('.dropdown'))) continue;
      const label = g.label.split(' ')[0]!;
      try {
        const dd = await dropdown(page, label);
        if ((await dd.count()) === 0) continue;
        await dd.click();
        const menu = page.locator('.scp-menu:visible').last();
        if (
          await menu
            .waitFor({ timeout: 2_000 })
            .then(() => true)
            .catch(() => false)
        ) {
          const items = (await menu.locator('.scp-menu-item').allInnerTexts()).map((s) =>
            s.replace(/\s+/g, ' ').trim(),
          );
          say(
            `  dropdown "${label}": ${JSON.stringify(items.slice(0, 20))}${items.length > 20 ? ` … ${items.length}개` : ''}`,
          );
          await dd.click();
          await page.waitForTimeout(300);
        }
      } catch {
        /* 비활성 드롭다운 등 */
      }
    }
    await page
      .screenshot({ path: path.join(outDir, `${slug}-form.png`), fullPage: true })
      .catch(() => undefined);
    await page
      .getByRole('button', { name: '취소', exact: true })
      .first()
      .click()
      .catch(() => undefined);
    await page.waitForTimeout(500);
    await dismissModalIfAny(page);
  } finally {
    fs.writeFileSync(path.join(outDir, `${slug}.md`), out.join('\n') + '\n');
    console.log(`\n저장: ${path.join(outDir, `${slug}.md`)} (+ 스크린샷)`);
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
