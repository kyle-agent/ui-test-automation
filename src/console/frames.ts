/**
 * 콘솔 셸은 서비스를 micro-app 으로 띄우므로 화면 내용이 iframe 안에 있을 수 있다.
 * Playwright 의 page.getByText 는 iframe 을 뚫지 않으므로, 판정은 모든 프레임을 돌며 한다. (shadow DOM 은 로케이터가 자동으로 뚫는다)
 */
import type { Frame, Locator, Page } from '@playwright/test';

/** 판정 대상 프레임: 메인 + 서드파티(walkme 등)가 아닌 자식 프레임. */
export function contentFrames(page: Page): Frame[] {
  const mainHost = hostOf(page.url());
  return page.frames().filter((f) => {
    if (f === page.mainFrame()) return true;
    if (f.isDetached()) return false;
    const url = f.url();
    if (!url || url === 'about:blank' || url.startsWith('about:srcdoc') || url.startsWith('file:'))
      return true;
    return hostOf(url) === mainHost;
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** 어느 프레임에서든 보이는 텍스트. 없으면 null. */
export async function visibleText(page: Page, text: string, timeoutMs: number): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    for (const frame of contentFrames(page)) {
      const loc = frame.getByText(text).filter({ visible: true }).first();
      if (await loc.isVisible().catch(() => false)) return loc;
    }
    if (Date.now() >= deadline) return null;
    await page.waitForTimeout(250);
  }
}

/** 보이는 텍스트를 shadow root 까지 모은다. 문자열 표현식인 이유: tsx(esbuild) 가 evaluate 안의 이름 있는 함수에 helper 를 끼워 넣어 브라우저에서 깨진다. */
const ALL_TEXT = `(() => {
  const out = [];
  const walk = (root) => {
    out.push(root === document ? (document.body ? document.body.innerText : '') : [...root.children].map((c) => c.innerText || '').join('\\n'));
    for (const e of root.querySelectorAll('*')) if (e.shadowRoot) walk(e.shadowRoot);
  };
  walk(document);
  return out.join('\\n');
})()`;

/** 모든 프레임의 보이는 텍스트를 이어 붙인다 (not_text 판정용). body.innerText 는 shadow DOM 을 제외하므로 shadow root 도 훑는다. */
export async function allBodyText(page: Page): Promise<string> {
  const parts: string[] = [];
  for (const frame of contentFrames(page)) {
    parts.push((await frame.evaluate(ALL_TEXT).catch(() => '')) as string);
  }
  return parts.join('\n');
}

export async function countRole(page: Page, role: Parameters<Page['getByRole']>[0]): Promise<number> {
  let n = 0;
  for (const frame of contentFrames(page))
    n += await frame
      .getByRole(role)
      .count()
      .catch(() => 0);
  return n;
}
