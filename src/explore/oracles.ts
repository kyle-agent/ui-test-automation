/**
 * 탐색(Level 5)의 판정. Jev 는 "다음에 무엇을 눌러볼지" 만 고르고, 무엇이 이상한지는 여기서 코드가 정한다.
 *
 *  치명(fatal)   세션 상실(SSO 로 튕김), 빈 화면 → 탐색을 멈춘다
 *  이상(anomaly) 오류 문구("오류가 발생", Internal Server Error …), 5xx 응답, JS 예외 → 기록하고 계속
 *  정보(info)    서버가 거부한 제출("…실패하였습니다" 토스트), 검증 문구 등장 → 기록 (클라이언트 검증과 서버 검증의 불일치 후보)
 */
import type { Page, Response } from '@playwright/test';
import { isSsoUrl } from '../console/env';
import { allBodyText } from '../console/frames';

export type Severity = 'fatal' | 'anomaly' | 'info';

export interface Finding {
  severity: Severity;
  kind: string;
  detail: string;
}

/** 페이지 수명 동안 5xx 응답과 JS 예외를 모은다. drain() 으로 꺼내면 비워진다. */
export function attachCollectors(page: Page): { drain: () => Finding[] } {
  const buffer: Finding[] = [];
  page.on('pageerror', (err) =>
    buffer.push({ severity: 'anomaly', kind: 'js-error', detail: err.message.slice(0, 200) }),
  );
  page.on('response', (res: Response) => {
    if (res.status() >= 500)
      buffer.push({
        severity: 'anomaly',
        kind: 'http-5xx',
        detail: `${res.status()} ${res.request().method()} ${res.url().slice(0, 160)}`,
      });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon|walkme|net::ERR_/.test(msg.text()))
      buffer.push({ severity: 'info', kind: 'console-error', detail: msg.text().slice(0, 200) });
  });
  return { drain: () => buffer.splice(0, buffer.length) };
}

const ERROR_TEXT = /오류가 발생|Internal Server Error|알 수 없는 오류|Something went wrong|잠시 후 다시 시도/;
const REJECTED_TEXT = /실패하였습니다|실패했습니다/;
const VALIDATION_TEXT = /입력하세요|입력해주세요|사용할 수 없는|형식이 올바르지|이미 사용 중|중복/;

/** 동작 직후 화면을 읽어 판정한다. */
export async function checkPage(page: Page, beforeText: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const url = page.url();
  if (isSsoUrl(url)) return [{ severity: 'fatal', kind: 'session-lost', detail: url.slice(0, 120) }];
  const text = await allBodyText(page).catch(() => '');
  const flat = text.replace(/\s+/g, ' ');
  if (flat.length < 40)
    findings.push({ severity: 'fatal', kind: 'blank-page', detail: `본문 ${flat.length}자` });
  const added = diffText(beforeText, text);
  const m = flat.match(ERROR_TEXT);
  if (m) findings.push({ severity: 'anomaly', kind: 'error-text', detail: excerpt(flat, m.index ?? 0) });
  const r = added.match(REJECTED_TEXT);
  if (r) findings.push({ severity: 'info', kind: 'server-rejected', detail: excerpt(added, r.index ?? 0) });
  // 폼이 실제로 거부한 것(오류 스타일이 붙은 입력란·메시지)은 힌트 문구("3~20자로 입력하세요" 는 항상 보인다)와 구분해 validation-error 로 올린다.
  // 실측(2026-09-28, VPC 폼): 거부된 입력란은 감싸는 div 가 `.scp-textfield.scp-error.scp-dirty` 가 되고 폼 그룹 안에 "입력 조건에 맞지 않습니다." 같은 문구가 붙는다.
  const errorStyled = await page
    .locator(
      '.scp-error:visible, .scp-form-group-error:visible, [class*="is-error"]:visible, [class*="has-error"]:visible, [aria-invalid="true"]:visible',
    )
    .evaluateAll((els) =>
      els.map((el) => {
        const group = el.closest('.scp-form-group') ?? el.parentElement ?? el;
        const input = el.querySelector('input,textarea') as HTMLInputElement | null;
        const msg = (group.textContent ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => /않습니다|없습니다|입력하세요|올바르지|초과|이미/.test(s))
          .join(' ');
        return `${input?.value ? `"${input.value.slice(0, 30)}" → ` : ''}${msg || (el.textContent ?? '').trim()}`;
      }),
    )
    .catch(() => [] as string[]);
  const styled = errorStyled.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (styled.length)
    findings.push({
      severity: 'info',
      kind: 'validation-error',
      detail: styled.slice(0, 3).join(' | ').slice(0, 200),
    });
  const v = added.match(VALIDATION_TEXT);
  if (v && !styled.length)
    findings.push({ severity: 'info', kind: 'validation-text', detail: excerpt(added, v.index ?? 0) });
  return findings;
}

/** 이전 본문에 없던 줄만 이어 붙인다 (토스트·검증 문구처럼 새로 나타난 것을 보기 위해). */
export function diffText(before: string, after: string): string {
  const seen = new Set(
    before
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return after
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !seen.has(s))
    .join(' ');
}

function excerpt(text: string, at: number): string {
  return text.slice(Math.max(0, at - 40), at + 120);
}
