/**
 * 로그인된 세션(storageState)으로 콘솔을 열어 메뉴 API 를 전부 받아 정규화 스냅샷을 만든다.
 * 이후 직전 스냅샷과 diff 를 출력한다. 콘솔 화면을 돌아다니지 않으므로 Jev 가 필요 없다.
 *
 *   npm run menu:snapshot -- [--session root] [--date YYYY-MM-DD] [--headed] [--no-txt]
 *
 * 저장물
 *   service-map/raw/<date>.json         API 원본 (gitignore)
 *   service-map/snapshots/<date>.json   정규화 스냅샷 (커밋)
 *   service-map/screens.json            최신 정규화본 (커밋, 스모크 생성 입력)
 *   service-map/screens.txt             사람이 읽는 평탄화본 (커밋, runner/gen_smoke.sh 입력)
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { hashUrl, isSsoUrl, sessionFile, type SessionKind } from '../src/console/env';
import {
  countScreens,
  diffScreenMaps,
  formatDiffMarkdown,
  formatScreensTxt,
  normalizeMenusApi,
  type ScreenMap,
} from '../src/service-map/screens';
import {
  RAW_DIR,
  SCREENS_JSON,
  SCREENS_TXT,
  listSnapshots,
  parseArgs,
  readJson,
  snapshotPath,
  today,
  writeJson,
} from '../src/service-map/io';

const MENUS_API = '/console/api/product/v1/menus';
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

interface FetchResult {
  items: unknown[];
  pages: number;
  first_body_keys: string[];
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const session = (flags.session === 'iam' ? 'iam' : 'root') as SessionKind;
  const date = typeof flags.date === 'string' ? flags.date : today();
  const state = sessionFile(session);
  if (!fs.existsSync(state)) {
    throw new Error(
      `${path.relative(process.cwd(), state)} 이(가) 없습니다. npm run auth:login -- --session ${session} 으로 먼저 로그인 세션을 저장하세요.`,
    );
  }

  const browser = await chromium.launch({ headless: !flags.headed });
  try {
    const context = await browser.newContext({
      storageState: state,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });
    const page = await context.newPage();
    await page.goto(hashUrl('/home/dashboard'), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => /\| Console$/.test(document.title) || /sso\./.test(location.hostname),
      null,
      {
        timeout: 60_000,
      },
    );
    if (isSsoUrl(page.url())) {
      throw new Error(
        'SSO 로그인 페이지로 이동했습니다. 세션이 만료되었으니 npm run auth:login 으로 갱신하세요.',
      );
    }

    const result = await page.evaluate(
      async ({ api, size, maxPages }): Promise<FetchResult> => {
        const items: unknown[] = [];
        const seen = new Set<string>();
        let firstKeys: string[] = [];
        let pages = 0;
        // page 번호가 0 기반인지 1 기반인지 모르므로 1 부터 시작하고, 비어 있으면 0 을 한 번 더 시도한다.
        const order = [1, 0];
        for (const start of order) {
          let n = start;
          let got = false;
          for (; n < start + maxPages; n++) {
            const res = await fetch(`${api}?page=${n}&size=${size}`, { credentials: 'include' });
            if (!res.ok) throw new Error(`menus API HTTP ${res.status} (page=${n})`);
            const body: unknown = await res.json();
            const list = extractList(body);
            if (!firstKeys.length && body && typeof body === 'object')
              firstKeys = Object.keys(body as object);
            if (!list || list.length === 0) break;
            let added = 0;
            for (const item of list) {
              const key = JSON.stringify(item).slice(0, 4000);
              if (seen.has(key)) continue;
              seen.add(key);
              items.push(item);
              added++;
            }
            pages++;
            got = true;
            if (added === 0) break; // 같은 페이지를 반복해서 주면 끝난 것
          }
          if (got) break;
        }
        return { items, pages, first_body_keys: firstKeys };

        function extractList(body: unknown): unknown[] | null {
          if (Array.isArray(body)) return body;
          if (!body || typeof body !== 'object') return null;
          const b = body as Record<string, unknown>;
          for (const k of ['content', 'contents', 'data', 'items', 'list', 'menus', 'result', 'results']) {
            const v = b[k];
            if (Array.isArray(v)) return v;
            if (v && typeof v === 'object') {
              const inner = extractList(v);
              if (inner) return inner;
            }
          }
          return null;
        }
      },
      { api: MENUS_API, size: PAGE_SIZE, maxPages: MAX_PAGES },
    );

    if (result.items.length === 0) {
      throw new Error(
        `메뉴 API 에서 항목을 받지 못했습니다. 응답 최상위 키: ${result.first_body_keys.join(', ') || '(없음)'}`,
      );
    }
    const rawFile = path.join(RAW_DIR, `${date}.json`);
    writeJson(rawFile, {
      fetched_at: new Date().toISOString(),
      api: MENUS_API,
      pages: result.pages,
      items: result.items,
    });
    console.log(
      `API 원본 ${result.items.length}개 (${result.pages}페이지) → ${path.relative(process.cwd(), rawFile)}`,
    );

    const { map, unresolved } = normalizeMenusApi(result.items, `${date}T00:00:00.000Z`);
    if (unresolved.length) {
      console.warn(
        `경고: ${unresolved.length}개 항목을 정규화하지 못했습니다. src/service-map/screens.ts 의 KEYS 를 실제 응답 키에 맞게 조정하세요.`,
      );
      const sample = unresolved[0]!;
      console.warn(`  예) index ${sample.index}: ${sample.reason}; 키 = ${sample.keys.join(', ')}`);
    }
    for (const s of map.services) {
      if (s.screens.length === 0)
        console.warn(`경고: ${s.category} > ${s.name} 화면 0개 (service_menu_ko 파싱 확인)`);
    }

    const previous = latestSnapshot();
    const snap = snapshotPath(date);
    writeJson(snap, map);
    writeJson(SCREENS_JSON, map);
    if (!flags['no-txt']) fs.writeFileSync(SCREENS_TXT, formatScreensTxt(map));
    console.log(
      `정규화: 서비스 ${map.services.length}, 화면 ${countScreens(map)} → ${path.relative(process.cwd(), snap)}`,
    );

    if (previous) {
      const diff = diffScreenMaps(previous.map, map);
      process.stdout.write(
        '\n' + formatDiffMarkdown(diff, path.basename(previous.file, '.json'), path.basename(snap, '.json')),
      );
    }
  } finally {
    await browser.close();
  }
}

function latestSnapshot(): { file: string; map: ScreenMap } | null {
  const snaps = listSnapshots();
  const file = snaps[snaps.length - 1];
  return file ? { file, map: readJson<ScreenMap>(file) } : null;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
