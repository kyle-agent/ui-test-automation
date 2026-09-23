/**
 * 콘솔 디자인 시스템(scp-*)의 공통 조작. 2026-09-21 실제 콘솔 프로브로 확인한 구조에 맞춘다.
 *
 *  - 폼 라벨: `.scp-form-group-label` 안의 `span.label-text` "VPC명". label/aria 연결이 없어 라벨 텍스트 바로 아래의 컨트롤을 `:below` 로 잡는다.
 *    같은 텍스트가 오른쪽 요약 패널에도 있지만 `:below` 는 가로로 겹치는 요소만 보므로 폼 쪽만 잡힌다. 숨은 컨트롤(다른 탭)은 `:visible` 로 뺀다.
 *  - 입력 검증은 change/blur 에서 돈다 → fill 뒤 Tab. 화면 진입 직후 섹션 로더가 걷히기 전에 fill 하면 값이 초기화된다 → 먼저 settleConsole.
 *  - 드롭다운: `.scp-dropdown` 클릭 → `.scp-menu` (검색 input, "신규 생성", `.scp-menu-item` > `span.item-text` / `span.item-sub`).
 *  - 확인 모달: `.scp-modal` ("VPC를 생성하시겠습니까?" / "…해지하시겠습니까?" / "…삭제하시겠습니까?") → "확인". 뒤 화면은 inert 가 아니다.
 *  - 목록: 행 `tr.scp-body-row`, 행 선택 아이콘 `i.table-select`, 행 끝 동작 버튼("서비스 해지"/"삭제"), 상단 동작 버튼은 행 선택 후 활성.
 *  - 폼 "취소" 를 누르면 "현재 화면을 나가시겠습니까?" 모달이 뜬다.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { gotoRoute } from './expect';
import { settleConsole } from './overlays';

const q = (s: string) => JSON.stringify(s);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 라벨 텍스트 바로 아래의 가장 가까운 컨트롤. 라벨이 정확히 일치하는 요소가 없으면("VPC명 *" 처럼 붙어 있으면) 부분 일치로 넓힌다. */
export async function below(page: Page, label: string, selector = 'input', nth = 0): Promise<Locator> {
  const strict = page.locator(`${selector}:visible:below(:text-is(${q(label)}))`);
  if ((await strict.count()) > nth) return strict.nth(nth);
  return page.locator(`${selector}:visible:below(:text(${q(label)}))`).nth(nth);
}

export async function fillField(
  page: Page,
  label: string,
  value: string,
  opts: { selector?: string; nth?: number } = {},
): Promise<void> {
  const field = await below(page, label, opts.selector ?? 'input', opts.nth ?? 0);
  await field.fill(value);
  await field.press('Tab');
  await expect(field, `"${label}" 입력값이 남아 있어야 합니다`).toHaveValue(value);
}

export function dropdown(page: Page, label: string, nth = 0): Promise<Locator> {
  return below(page, label, '.scp-dropdown', nth);
}

/** 드롭다운을 열고 항목을 고른다. option 이 문자열이면 `span.item-text` 정확 일치, 정규식이면 항목 전체 텍스트에 매칭. */
export async function pickOption(
  page: Page,
  label: string,
  option: string | RegExp,
  opts: { nth?: number } = {},
): Promise<void> {
  const dd = await dropdown(page, label, opts.nth ?? 0);
  let menu = page.locator('.scp-menu:visible').last();
  let items = menu.locator('.scp-menu-item');
  // 앞 필드에 따라 항목이 비동기로 채워지는 드롭다운(IGW 폼의 "구분" 등)은 비어 있으면 닫았다가 다시 연다.
  for (let attempt = 0; ; attempt++) {
    menu = page.locator('.scp-menu:visible').last();
    if (!(await menu.isVisible().catch(() => false))) await dd.click();
    await menu.waitFor({ timeout: 5_000 });
    items = menu.locator('.scp-menu-item');
    if ((await items.count()) > 0 || attempt >= 4) break;
    await dd.click(); // 토글로 닫는다
    await menu.waitFor({ state: 'hidden', timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);
  }
  const item =
    typeof option === 'string'
      ? items.filter({ has: page.locator(`span.item-text:text-is(${q(option)})`) })
      : items.filter({ hasText: option });
  if ((await item.count()) === 0) {
    const seen = (await items.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    await page.keyboard.press('Escape').catch(() => undefined);
    throw new Error(
      `"${label}" 드롭다운에 ${String(option)} 항목이 없습니다. 보이는 항목: ${JSON.stringify(seen)}`,
    );
  }
  await item.first().click();
  await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
}

/** 커스텀 체크박스(`.scp-select` div, 켜짐 = `scp-select-checked` 클래스). 라벨 아래 nth 번째. */
export async function checkbox(page: Page, label: string, nth = 0): Promise<Locator> {
  return below(page, label, '.scp-select', nth);
}

export async function isChecked(box: Locator): Promise<boolean> {
  return (await box.getAttribute('class').catch(() => ''))?.includes('scp-select-checked') ?? false;
}

/** 커스텀 체크박스를 원하는 상태로 맞춘다 (예: SG 폼 "로그 저장 여부 — 사용" 은 기본 켜짐인데 로그 저장소가 없으면 생성이 막힌다). */
export async function setCheckbox(page: Page, label: string, checked: boolean, nth = 0): Promise<void> {
  const box = await checkbox(page, label, nth);
  if ((await isChecked(box)) === checked) return;
  await box.click();
  await expect
    .poll(() => isChecked(box), {
      message: `"${label}" 체크박스가 ${checked ? '켜져' : '꺼져'} 있어야 합니다`,
      timeout: 3_000,
    })
    .toBe(checked);
}

export function visibleModal(page: Page): Locator {
  return page.locator('.scp-modal:visible').last();
}

/** 확인 모달을 기다려 본문을 검사하고 버튼을 누른다.
 *  agree: 모달 안의 동의 체크박스(커스텀 `.scp-select` 또는 input[type=checkbox])를 먼저 켠다
 *  (예: IGW 폼의 "Firewall … 선택하지 않았습니다" 경고 모달은 동의 체크 전엔 "확인" 이 막힌다). */
export async function confirmModal(
  page: Page,
  containing?: string | RegExp,
  button: string = '확인',
  opts: { agree?: boolean; resourceName?: string } = {},
): Promise<void> {
  const modal = visibleModal(page);
  await modal.waitFor({ timeout: 10_000 });
  if (containing) await modal.getByText(containing).first().waitFor({ timeout: 5_000 });
  if (opts.agree) {
    const custom = modal.locator('.scp-select:visible');
    for (let i = 0; i < (await custom.count()); i++) {
      const box = custom.nth(i);
      if (!(await isChecked(box))) await box.click();
    }
    const natives = modal.locator('input[type=checkbox]:visible');
    for (let i = 0; i < (await natives.count()); i++)
      await natives
        .nth(i)
        .check()
        .catch(() => undefined);
    // 입력 확인: "확인을 위해 삭제를 입력해주세요" 처럼 지정한 단어를 텍스트 입력란에 쳐야 "확인" 이 활성화되는 모달 (예: Block Storage 삭제).
    // 단어가 "버킷명"처럼 라벨이면(…명/이름) 그 단어가 아니라 실제 이름을 쳐야 한다: 모달의 "버킷명 : <값>" 에서 찾고, 없으면 opts.resourceName (예: Object Storage 해지).
    const text = (await modal.innerText().catch(() => '')).replace(/\s+/g, ' ');
    const word = text.match(/확인을 위해\s*(\S+?)(?:을|를)?\s*입력/)?.[1];
    const isLabel = !!word && /(명|이름)$/.test(word);
    const typed = isLabel
      ? (text.match(new RegExp(`${word}\\s*:\\s*(\\S+)`))?.[1] ?? opts.resourceName)
      : word;
    const input = modal.locator('input[type=text]:visible').first();
    if (typed && (await input.count())) {
      await input.fill(typed);
      await input.press('Tab');
    }
  }
  await modal.getByRole('button', { name: button, exact: true }).click();
  await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
}

/** 모달이 떠 있으면 확인(또는 지정 버튼)으로 닫는다. 없으면 false. */
export async function dismissModalIfAny(page: Page, button: string = '확인'): Promise<boolean> {
  const modal = visibleModal(page);
  if (!(await modal.isVisible().catch(() => false))) return false;
  await modal
    .getByRole('button', { name: button, exact: true })
    .click()
    .catch(() => undefined);
  await modal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  return true;
}

/** 목록 화면의 생성 버튼("서비스 생성"/"Subnet 생성"/"Keypair 생성")을 눌러 생성 화면을 열고 로더가 걷힐 때까지 기다린다. */
export async function openCreateForm(page: Page, route: string, button: string): Promise<void> {
  await gotoRoute(page, route);
  await page.getByRole('button', { name: button, exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 폼 하단의 주 버튼(예: "생성")을 누른다. 폼이 유효해질 때까지 aria-disabled 이므로 Playwright 가 활성화를 기다린다. */
export async function submitForm(page: Page, button: string = '생성'): Promise<void> {
  await page
    .locator('button:visible:not(tr button)')
    .filter({ hasText: new RegExp(`^${escapeRe(button)}$`) })
    .last()
    .click();
}

export function row(page: Page, name: string): Locator {
  return page.locator('tr.scp-body-row').filter({ hasText: name });
}

export async function selectRow(page: Page, name: string): Promise<void> {
  await row(page, name).locator('i.table-select').first().click();
}

/** 목록 상단의 동작 버튼(행 밖) */
export function topButton(page: Page, name: string): Locator {
  return page
    .locator('button:visible:not(tr button)')
    .filter({ hasText: new RegExp(`^${escapeRe(name)}$`) })
    .first();
}

export interface WaitRowOptions {
  /** 이 상태 텍스트(예: /Active/)가 행에 보일 때까지 */
  status?: RegExp;
  /** true 면 행이 사라질 때까지 */
  gone?: boolean;
  timeoutMs?: number;
  intervalMs?: number;
  log?: (line: string) => void;
}

/** 목록 화면을 주기적으로 새로 고치며 행의 등장·상태·소멸을 기다린다 (목록은 자동 갱신되지 않는다). */
export async function waitForRow(
  page: Page,
  route: string,
  name: string,
  opts: WaitRowOptions = {},
): Promise<void> {
  const timeout = opts.timeoutMs ?? 180_000;
  const interval = opts.intervalMs ?? 10_000;
  const start = Date.now();
  const want = opts.gone ? '소멸' : opts.status ? `상태 ${opts.status}` : '등장';
  for (;;) {
    if (!page.url().includes(`#${route.replace(/^#/, '')}`)) await gotoRoute(page, route);
    const r = row(page, name);
    let count = await r.count();
    // 행이 읽는 사이에 사라질 수 있다(반납·삭제 직후 목록 갱신) → 짧게 기다리고, 못 읽으면 "행 없음" 으로 다시 센다.
    const text = count
      ? (
          await r
            .first()
            .innerText({ timeout: 5_000 })
            .catch(() => '')
        )
          .replace(/\s+/g, ' ')
          .trim()
      : '';
    if (count && !text) count = await r.count();
    const ok = opts.gone ? count === 0 : opts.status ? opts.status.test(text) : count > 0;
    if (ok) return;
    const elapsed = Math.round((Date.now() - start) / 1000);
    opts.log?.(`  [${elapsed}s] ${name} ${want} 대기… ${count ? text.slice(0, 100) : '(행 없음)'}`);
    if (Date.now() - start > timeout)
      throw new Error(`${name} ${want} 대기 ${timeout / 1000}초 초과. 마지막: ${text || '(행 없음)'}`);
    await page.waitForTimeout(interval);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
}

/**
 * VPC 해지 (행 끝 "서비스 해지" → "해지하시겠습니까?" 확인). 실측(2026-09-23): Peering·Subnet 을 지운 직후의 해지 요청은 조용히 무시되어 행이 Active 로 남는다
 * → 60초 안에 사라지지 않으면 최대 5회 다시 누른다. 사라진 뒤엔 토스트("VPC명: …")가 본문에 남으므로 새로 고친다 (not_text 검사용).
 */
export async function terminateVpc(
  page: Page,
  route: string,
  name: string,
  log?: (line: string) => void,
): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await gotoRoute(page, route);
    if ((await row(page, name).count()) === 0) break;
    await row(page, name).getByRole('button', { name: '서비스 해지', exact: true }).click();
    await confirmModal(page, /해지하시겠습니까/);
    try {
      await waitForRow(page, route, name, { gone: true, timeoutMs: 60_000, intervalMs: 15_000, log });
      break;
    } catch {
      log?.(`  VPC ${name} 해지 재시도 ${attempt}/5 (아직 남아 있음)`);
      if (attempt === 5) await waitForRow(page, route, name, { gone: true, timeoutMs: 120_000, log });
    }
  }
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
}

/**
 * Virtual Server 해지 (행 선택 → 상단 "서비스 해지" → "…해지하시겠습니까?" 확인). 실측(2026-09-23 스위트 run 2): 확인을 눌러도 요청이 조용히 무시되어
 * 서버가 Active 로 남는 경우가 있다 → 2분 안에 상태가 바뀌지(사라지거나 Deleting/Terminating) 않으면 최대 3회 다시 누른다. 소멸까지는 보통 40초~1분.
 */
export async function terminateServer(
  page: Page,
  route: string,
  name: string,
  log?: (line: string) => void,
): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await gotoRoute(page, route);
    const r = row(page, name);
    if ((await r.count()) === 0) return;
    const text = (
      await r
        .first()
        .innerText({ timeout: 5_000 })
        .catch(() => '')
    ).replace(/\s+/g, ' ');
    if (!/Deleting|Terminating|Stopping/i.test(text)) {
      await selectRow(page, name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지하시겠습니까/);
    }
    try {
      await waitForRow(page, route, name, { gone: true, timeoutMs: 120_000, intervalMs: 15_000, log });
      return;
    } catch {
      log?.(`  서버 ${name} 해지 재시도 ${attempt}/3 (아직 남아 있음)`);
    }
  }
  await waitForRow(page, route, name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
}
