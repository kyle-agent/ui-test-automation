/**
 * 상세 화면의 "라벨 옆 연필 아이콘 → 수정 모달" 동작(L3) 공통 (2026-10-06, 에이전트 3D).
 * 상세 화면은 `.scp-form-group-label` 라벨 + 다음 형제(값) 구조이고, 수정 가능한 항목은 라벨 안에 아이콘 `<i>` 가 있다
 * (networking.ts setPublicNatIp 와 같은 구조). 수정 모달의 버튼·확인 문구는 서비스마다 조금씩 달라 넓게 받는다.
 */
import type { Locator, Page } from '@playwright/test';
import { settleConsole } from './overlays';
import { gotoRoute } from './expect';
import { fillStable, row, visibleModal } from './ui';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DUMP = `(() => {
  const vis = (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const t = (e) => (e.innerText || '').replace(/\\s+/g, ' ').trim();
  const buttons = [...document.querySelectorAll('button')].filter(vis).filter((b) => !b.closest('header') && !b.closest('tr'))
    .map((b) => t(b) + (b.disabled || b.getAttribute('aria-disabled') === 'true' ? '(dis)' : ''));
  const labels = [...document.querySelectorAll('.scp-form-group-label')].filter(vis).map((l) => {
    const v = l.nextElementSibling;
    return (l.querySelector('i') ? '[수정] ' : '') + t(l).slice(0, 40) + ' = ' + (v ? t(v).slice(0, 80) : '');
  });
  return { url: location.hash, buttons, labels };
})()`;

/** 지금 화면(상세)의 버튼·라벨(수정 아이콘 표시)을 로그로 남긴다 — 프로브 겸 실패 진단용 */
export async function logDetail(page: Page, log: (line: string) => void, what = '상세'): Promise<void> {
  const d = (await page.evaluate(DUMP).catch(() => null)) as { url: string; buttons: string[]; labels: string[] } | null;
  if (!d) return;
  log(`  [${what}] ${d.url}`);
  log(`    버튼: ${JSON.stringify(d.buttons)}`);
  for (const l of d.labels) log(`    ${l}`);
}

function label(scope: Page | Locator, name: string | RegExp): Locator {
  const re = typeof name === 'string' ? new RegExp(`^\\s*${esc(name)}\\s*$`) : name;
  return scope.locator('.scp-form-group-label:visible').filter({ hasText: re }).first();
}

/** 상세 화면 라벨의 값 텍스트(공백 정리) */
export async function detailValue(page: Page, name: string | RegExp): Promise<string> {
  const l = label(page, name);
  const v = l.locator('xpath=following-sibling::*[1]');
  return ((await v.innerText({ timeout: 5_000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
}

/** 모달 안 폼 라벨·컨트롤·버튼을 로그로 (수정 모달 프로브) */
export async function logModal(page: Page, log: (line: string) => void, what = '모달'): Promise<void> {
  const modal = visibleModal(page);
  const text = ((await modal.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const buttons = (await modal.locator('button:visible').allInnerTexts().catch(() => [] as string[])).map((s) => s.trim());
  const controls = await modal
    .locator('input:visible, textarea:visible, .scp-dropdown:visible, .scp-select:visible, [role=radio]:visible')
    .evaluateAll((els) =>
      els.map(
        (e) =>
          e.tagName.toLowerCase() +
          ((e as HTMLInputElement).type ? `[${(e as HTMLInputElement).type}]` : '') +
          (e.className.toString().includes('scp-dropdown') ? '.dropdown' : e.className.toString().includes('scp-select') ? '.select' : '') +
          ` "${((e as HTMLInputElement).value ?? (e as HTMLElement).innerText ?? '').toString().replace(/\s+/g, ' ').slice(0, 30)}"`,
      ),
    )
    .catch(() => [] as string[]);
  log(`  [${what}] ${text.slice(0, 400)}`);
  log(`    컨트롤: ${JSON.stringify(controls)}`);
  log(`    버튼: ${JSON.stringify(buttons)}`);
}

/** 라벨 옆 연필 아이콘으로 수정 모달을 연다 (안 열리면 한 번 더 누른다) */
export async function openLabelEdit(page: Page, name: string | RegExp): Promise<Locator> {
  const modal = visibleModal(page);
  for (let attempt = 1; ; attempt++) {
    // 라벨에 안내 아이콘(i.i-info)과 연필(i.i-edit)이 같이 있으면 연필을 누른다 (2026-10-06 3C, Object Storage "버전 관리"·"접근 제어")
    const l = label(page, name);
    const edit = l.locator('i.i-edit');
    await ((await edit.count()) ? edit.first() : l.locator('i').first()).click();
    if (await modal.waitFor({ timeout: 8_000 }).then(() => true, () => false)) return modal;
    if (attempt >= 4) throw new Error(`"${String(name)}" 수정 아이콘을 눌러도 모달이 열리지 않습니다`);
    // 저장 직후(LB 헬스 체크 설명, 2026-10-06)엔 같은 화면에서 아이콘을 다시 눌러도 모달이 안 열렸다 → 상세를 다시 읽고 누른다
    await page.waitForTimeout(5_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 1_000 });
  }
}

/**
 * 수정 모달의 저장 버튼("확인"/"수정"/"저장") → 이어지는 "…하시겠습니까?" 확인 모달 → 완료 안내 모달까지 닫는다.
 * 확인 모달 문구를 로그로 남긴다(프로브).
 */
export async function saveModal(page: Page, log?: (line: string) => void, timeoutMs = 90_000, opts: { modal?: Locator } = {}): Promise<void> {
  // opts.modal: 저장할 수정 모달을 직접 준다 — 경고 모달이 위에 떠 있어 마지막(.last()) 모달이 수정 모달이 아닐 때(SKE 퍼블릭 엔드포인트, 2026-10-13 6E)
  const modal = opts.modal ?? visibleModal(page);
  const title = (((await modal.innerText().catch(() => '')) || '').trim().split('\n')[0] ?? '').trim();
  const save = modal.getByRole('button', { name: /^(확인|수정|저장|완료)$/ }).last();
  await save.click({ timeout: 10_000 }).catch(() => save.click({ force: true }));
  // 이어지는 모달(확인 질문 · 완료 안내)을 "확인" 으로 닫는다. 수정 모달 자신이 저장 중 잠시 남아 있으면(VPN Tunnel 설명, 2026-10-06)
  // 그 "확인" 을 다시 누르지 않고 닫힐 때까지 기다린다.
  let seen = '';
  for (const start = Date.now(); Date.now() - start < timeoutMs; ) {
    await page.waitForTimeout(1_200);
    // 보이는 모달이 여럿이면(수정 모달 위에 경고 "…진행하시겠습니까?" — SKE 퍼블릭 엔드포인트, 2026-10-13 6E) 수정 모달이 아닌 것을 먼저 처리한다.
    // 예전엔 마지막(.last()) 모달만 봐서 수정 모달이 DOM 뒤에 있으면 경고를 못 누르고 90초를 기다렸다.
    const all = page.locator('.scp-modal:visible');
    const n = await all.count();
    if (!n) break;
    let next: Locator | null = null;
    let raw = '';
    for (let i = n - 1; i >= 0; i--) {
      const t = ((await all.nth(i).innerText().catch(() => '')) || '').trim();
      if (!t) continue;
      if (title && t.split('\n')[0]!.trim() === title) {
        if (!next) {
          next = all.nth(i);
          raw = t;
        }
        continue;
      }
      next = all.nth(i);
      raw = t;
      break;
    }
    if (!next) break;
    const text = raw.replace(/\s+/g, ' ');
    if (title && raw.split('\n')[0]!.trim() === title) {
      if (seen !== 'edit') log?.(`    수정 모달이 아직 열려 있음 → 닫힐 때까지 대기`);
      seen = 'edit';
      continue;
    }
    seen = text;
    log?.(`    모달: ${text.slice(0, 160)}`);
    const ok = next.getByRole('button', { name: /^(확인|예)$/ }).last();
    if (!(await ok.count())) break;
    // 세는 사이 모달이 저절로 닫히면 강제 클릭이 30초 매달린다(2026-10-06 3C Repository 태그 삭제 정책) → 짧게, 실패는 다음 바퀴에서 다시 본다
    await ok
      .click({ timeout: 10_000 })
      .catch(() => ok.click({ force: true, timeout: 5_000 }))
      .catch(() => undefined);
  }
  if (await visibleModal(page).isVisible().catch(() => false)) {
    const text = ((await visibleModal(page).innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    throw new Error(`수정 모달이 ${timeoutMs / 1000}초 안에 닫히지 않았습니다: ${text.slice(0, 200)}`);
  }
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 상세 화면을 다시 읽어 라벨 값이 조건을 만족할 때까지 기다린다 */
export async function waitDetailValue(
  page: Page,
  name: string | RegExp,
  ok: (value: string) => boolean,
  opts: { timeoutMs?: number; log?: (line: string) => void } = {},
): Promise<string> {
  const detail = page.url();
  const timeoutMs = opts.timeoutMs ?? 180_000;
  let value = await detailValue(page, name);
  for (const start = Date.now(); !ok(value); ) {
    if (Date.now() - start > timeoutMs)
      throw new Error(`"${String(name)}" 값이 ${timeoutMs / 1000}초 안에 바뀌지 않았습니다. 마지막: ${value}`);
    await page.waitForTimeout(5_000);
    if (page.url() !== detail) await page.goto(detail).catch(() => undefined);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 1_000 });
    value = await detailValue(page, name);
  }
  opts.log?.(`    ${String(name)} = ${value}`);
  return value;
}

/**
 * 상세 화면 텍스트 항목(설명 등) 하나를 연필 → 모달 첫 입력칸 → 저장 → 화면 반영까지.
 * 모달에 입력칸이 여럿이면 field 로 고른다(기본: 첫 textarea, 없으면 첫 text input).
 */
export async function editDetailText(
  page: Page,
  name: string | RegExp,
  value: string,
  opts: { log?: (line: string) => void; field?: (modal: Locator) => Locator; expectShown?: (v: string) => boolean } = {},
): Promise<void> {
  const modal = await openLabelEdit(page, name);
  if (opts.log) await logModal(page, opts.log, `${String(name)} 수정`);
  let field = opts.field?.(modal);
  if (!field) {
    const ta = modal.locator('textarea:visible').first();
    field = (await ta.count()) ? ta : modal.locator('input[type=text]:visible').first();
  }
  await fillStable(page, field, value, `${String(name)} 수정 입력`);
  await saveModal(page, opts.log);
  await waitDetailValue(page, name, opts.expectShown ?? ((v) => v.includes(value)), { log: opts.log });
}

/**
 * 지금 열린 상세 화면의 "설명" 을 바꾸고(화면 반영 확인) 원래 값으로 되돌린다 (API set<리소스> 대응, 2026-10-13 6E).
 * 설명 연필이 없으면 라벨 목록을 로그로 남기고 오류를 낸다(화면 변경 감지). 원래 값이 "-"(없음)면 빈 값으로 되돌린다.
 */
export async function editDescriptionRoundTrip(page: Page, value: string, log?: (line: string) => void, label: string | RegExp = '설명'): Promise<void> {
  const l = page.locator('.scp-form-group-label:visible').filter({ hasText: typeof label === 'string' ? new RegExp(`^\\s*${esc(label)}\\s*$`) : label }).first();
  if (!(await l.locator('i').count())) {
    if (log) await logDetail(page, log, '설명 연필 없음');
    throw new Error(`"${String(label)}" 수정 아이콘이 없습니다 (${page.url()})`);
  }
  const original = await detailValue(page, label);
  await editDetailText(page, label, value, { log });
  await editDetailText(page, label, original === '-' ? '' : original, {
    log,
    expectShown: (v) => v === original || (original === '-' && (v === '' || v === '-')),
  });
  log?.(`    ${String(label)} 수정 → 되돌림 확인 (${original === '-' ? '(없음)' : original.slice(0, 40)})`);
}

/**
 * 목록 → 이름 링크로 상세를 연다 (주소가 detail 로 바뀔 때까지 다시 누른다).
 * detailUrl: 상세 주소가 …/detail 이 아닌 서비스용 (2026-10-07 5L: Cloud Fabric Connect 는 #/cfc/fabric/<id>?name=…, #/cfc/policy/<id>/info)
 */
export async function openDetail(page: Page, route: string, name: string, detailUrl: RegExp = /\/detail/): Promise<void> {
  await gotoRoute(page, route);
  for (let attempt = 1; ; attempt++) {
    // 이미 상세로 넘어갔는데 판정만 늦었으면(재시도 시) 목록 행이 없다 → 다시 목록으로
    if (attempt > 1 && !(await row(page, name).count())) await gotoRoute(page, route);
    await row(page, name).getByText(name, { exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    if (detailUrl.test(page.url())) return;
    if (attempt >= 3) throw new Error(`${name} 상세로 이동하지 못했습니다 (${page.url()})`);
    await page.waitForTimeout(1_500);
  }
}

/**
 * 프로브(PROBE_EDITS=1 일 때만): 지금 상세 화면에서 수정 아이콘이 있는 라벨마다 모달을 열어 내용을 로그로 남기고 "취소" 로 닫는다.
 * 새 동작(L3) 단계를 쓰기 전 한 번 돌려 모달 구조를 확보한다. 아무것도 저장하지 않는다.
 */
export async function probeEdits(page: Page, log: (line: string) => void, what = '상세'): Promise<void> {
  if (process.env.PROBE_EDITS !== '1') return;
  const labels = page.locator('.scp-form-group-label:visible').filter({ has: page.locator('i') });
  const names = (await labels.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
  log(`  [프로브 ${what}] 수정 아이콘 라벨: ${JSON.stringify(names)}`);
  for (const name of names) {
    try {
      const modal = await openLabelEdit(page, name);
      await logModal(page, log, `프로브 ${name}`);
      await modal.getByRole('button', { name: /^(취소|닫기)$/ }).last().click({ timeout: 5_000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(800);
      const leave = visibleModal(page);
      if (await leave.isVisible().catch(() => false)) {
        log(`    닫은 뒤 모달: ${((await leave.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 120)}`);
        await leave.getByRole('button', { name: /^(확인|취소|닫기)$/ }).first().click().catch(() => undefined);
      }
    } catch (err) {
      log(`    ${name}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    }
  }
}
