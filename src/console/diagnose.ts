/**
 * 화면이 예상대로 뜨지 않을 때 원인 파악용 진단. 값은 찍지 않고 이름만 찍는다 (토큰·쿠키 값 노출 금지).
 */
import type { BrowserContext, Page } from '@playwright/test';

export async function describePageState(page: Page, context?: BrowserContext): Promise<string> {
  const lines: string[] = [];
  lines.push(`URL: ${page.url()}`);
  lines.push(`title: ${await page.title().catch(() => '(읽기 실패)')}`);
  const info = await page
    .evaluate(() => ({
      text: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 600),
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      frames: [...document.querySelectorAll('iframe')]
        .map((f) => f.getAttribute('src') ?? '(src 없음)')
        .slice(0, 5),
    }))
    .catch(() => null);
  if (info) {
    lines.push(`화면 텍스트: ${info.text || '(비어 있음)'}`);
    lines.push(`localStorage 키: ${info.local.join(', ') || '(없음)'}`);
    lines.push(`sessionStorage 키: ${info.session.join(', ') || '(없음)'}`);
    if (info.frames.length) lines.push(`iframe: ${info.frames.join(' | ')}`);
  }
  if (context) {
    const cookies = await context.cookies().catch(() => []);
    const byDomain = new Map<string, string[]>();
    for (const c of cookies) byDomain.set(c.domain, [...(byDomain.get(c.domain) ?? []), c.name]);
    lines.push(
      `쿠키(도메인: 이름): ${[...byDomain].map(([d, names]) => `${d}: ${names.join(',')}`).join(' | ') || '(없음)'}`,
    );
  }
  return lines.join('\n');
}
