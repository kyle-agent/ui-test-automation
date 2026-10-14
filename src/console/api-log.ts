/**
 * 화면 동작 ↔ API 동작 대응 확인용 (2026-10-07 6B): 이 페이지가 보내는 쓰기 요청(POST·PUT·PATCH·DELETE)의 메서드와 경로만 남긴다.
 * 본문·쿼리·헤더는 남기지 않는다(비밀번호·키가 들 수 있다). 경로의 긴 ID 는 {id} 로 줄인다.
 *
 * - logWriteRequests: spec 의 단계 로그에 `[API] PUT /console/api/…` 줄로 찍는다(사람이 data/ui-operations.yaml 을 고칠 때 근거).
 * - collectWriteRequests: 모든 spec 에서 fixture(src/fixtures/test.ts)가 호출해 실행 기록(RunRecord.api_writes)에 넣는다(2026-10-14).
 *   카탈로그(data/api-coverage.json ops[].path)에 없는 경로 = "콘솔 전용 쓰기 동작" 을 자동으로 세는 재료(src/report/operations.ts consoleOnlyWrites).
 */
import type { Page, Request } from '@playwright/test';

const hooked = new WeakSet<Page>();

/** 쓰기 요청이면 "METHOD /path" (ID 는 {id}), 아니면 null. 정적 자원·로그 수집 요청은 뺀다 */
export function writeRequestOf(req: Request): string | null {
  const method = req.method();
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return null;
  let path: string;
  try {
    path = new URL(req.url()).pathname;
  } catch {
    return null;
  }
  if (/\.(js|css|png|svg|woff2?)$/.test(path) || /^\/event\/|metric|collect|beacon/i.test(path)) return null;
  return `${method} ${shortenIds(path)}`;
}

/**
 * 경로 세그먼트의 식별자를 {id} 로 줄인다(멱등 — 기록할 때와 분석할 때 둘 다 거친다).
 *   UUID(하이픈 유무)·24자 이상 16진수 · 숫자만 · base64 SRN(태그 경로, 32자 이상) · 테스트 리소스 이름(xxx-MMDD-HHMM-hhhh)
 *   · {id} 가 섞인 세그먼트(pjkpjr{id}, RECEIVER-GROUP-{id}, ipr-{id}-acl-…) 는 통째로 {id}
 */
export function shortenIds(path: string): string {
  return path
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      const s = seg
        .replace(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}|[0-9a-f]{24,}/gi, '{id}')
        .replace(/[a-z]+\d*-\d{4}-\d{4}-[0-9a-f]{4}/gi, '{id}');
      if (s === '{id}' || s.includes('{id}')) return '{id}';
      if (/^\d+$/.test(s)) return '{id}';
      if (s.length >= 32 && /^[A-Za-z0-9+/=_-]+$/.test(s) && /\d/.test(s)) return '{id}'; // base64 SRN
      return s;
    })
    .join('/');
}

export async function logWriteRequests(page: Page, log: (line: string) => void): Promise<void> {
  if (hooked.has(page)) return;
  hooked.add(page);
  page.on('request', (req) => {
    const w = writeRequestOf(req);
    if (w) log(`    [API] ${w}`);
  });
}

/** 페이지의 쓰기 요청을 모아 두고, 호출하면 지금까지의 목록(중복 제거, 처음 본 순서)을 돌려준다 */
export function collectWriteRequests(page: Page): () => string[] {
  const seen = new Set<string>();
  page.on('request', (req) => {
    const w = writeRequestOf(req);
    if (w) seen.add(w);
  });
  return () => [...seen];
}
