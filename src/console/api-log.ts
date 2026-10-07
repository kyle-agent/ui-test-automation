/**
 * 화면 동작 ↔ API 동작 대응 확인용 (2026-10-07 6B): 이 페이지가 보내는 쓰기 요청(POST·PUT·PATCH·DELETE)의 메서드와 경로만 로그로 남긴다.
 * 본문·쿼리·헤더는 남기지 않는다(비밀번호·키가 들 수 있다). 경로의 긴 ID 는 {id} 로 줄인다.
 * data/ui-operations.yaml 에 적을 API 이름(예: createservervolume vs attachvolumetovirtualserver)을 판단하는 근거로 쓴다.
 */
import type { Page } from '@playwright/test';

const hooked = new WeakSet<Page>();

export async function logWriteRequests(page: Page, log: (line: string) => void): Promise<void> {
  if (hooked.has(page)) return;
  hooked.add(page);
  page.on('request', (req) => {
    const method = req.method();
    if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return;
    let path: string;
    try {
      path = new URL(req.url()).pathname;
    } catch {
      return;
    }
    // 콘솔 정적 자원·로그 수집 요청은 뺀다
    if (/\.(js|css|png|svg|woff2?)$/.test(path) || /^\/event\/|metric|collect|beacon/i.test(path)) return;
    const short = path.replace(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}|[0-9a-f]{24,}/gi, '{id}');
    log(`    [API] ${method} ${short}`);
  });
}
