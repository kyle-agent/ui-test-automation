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
  // `:below` 는 뷰포트 기준 사각형을 비교하고 결과를 라벨과의 거리순으로 정렬한다.
  //  - 라벨이 스크롤로 화면 위에 있으면 고정 헤더의 검색창도 "라벨 아래" 로 잡힌다(2026-09-28 DBaaS "DATA") → 헤더 안 요소는 건너뛴다.
  //  - 라벨을 억지로 스크롤하면 안 된다: 오른쪽 요약 패널(고정 위치)에도 같은 라벨("VPC명")이 있어, 스크롤 뒤엔 그 글자가
  //    다음 칸(IP 대역) 바로 위에 와서 엉뚱한 칸이 잡혔다(2026-09-29 재현). 선택자 끝 `:not(...)` 도 쓰지 않는다.
  for (const anchor of [`:text-is(${q(label)})`, `:text(${q(label)})`]) {
    const all = page.locator(`${selector}:visible:below(${anchor})`);
    const count = await all.count();
    let seen = 0;
    for (let i = 0; i < count; i++) {
      const el = all.nth(i);
      // 콘솔 상단 전역 검색창은 <header> 태그 밖에 있다 → placeholder 로도 거른다 (2026-09-29 확인)
      const inChrome = await el
        .evaluate(
          (e) =>
            !!e.closest('header') ||
            ((e as HTMLInputElement).placeholder ?? '').includes('서비스명, 마켓플레이스'),
        )
        .catch(() => false);
      if (inChrome) continue;
      if (seen++ === nth) return el;
    }
  }
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
  // 절 단위로 늦게 그려지는 폼(DBaaS)은 채운 직후 재렌더로 값이 사라질 수 있다 → 한 번 더 채운다 (2026-09-28 MySQL "Database명")
  if ((await field.inputValue().catch(() => '')) !== value) {
    await page.waitForTimeout(1_000);
    const again = await below(page, label, opts.selector ?? 'input', opts.nth ?? 0);
    await again.fill(value);
    await again.press('Tab');
  }
  // scp 입력란은 프로그램식 fill 이 가끔 반영되지 않는다(이전 값 유지, 2026-09-29 VPC명 재현 3회 중 1회).
  // 실제 키보드 입력은 매번 반영되므로 마지막 수단으로 전체 선택 → 지우기 → 타이핑한다.
  if ((await field.inputValue().catch(() => '')) !== value) {
    await field.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(value, { delay: 20 });
    await page.keyboard.press('Tab');
  }
  // 앞 드롭다운(VPC·Subnet 구분 등) 선택의 늦은 재렌더가 조금 뒤에 값을 지우기도 한다(2026-09-30 스위트, 5탭 부하에서 Subnet "IP 대역" 2회)
  // → 잠시 뒤 다시 보고, 비었으면 칸을 새로 찾아 키보드로 다시 친다(최대 3회).
  for (let round = 0; round < 3; round++) {
    await page.waitForTimeout(1_500);
    const now = await below(page, label, opts.selector ?? 'input', opts.nth ?? 0);
    if ((await now.inputValue().catch(() => '')) === value) break;
    await now.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(value, { delay: 20 });
    await page.keyboard.press('Tab');
  }
  const final = await below(page, label, opts.selector ?? 'input', opts.nth ?? 0);
  await expect(final, `"${label}" 입력값이 남아 있어야 합니다`).toHaveValue(value);
}

/**
 * 라벨 없는 입력칸(textarea 등)에 값을 넣고 남아 있는지 확인한다. fillField 와 같은 보강:
 * 부하 중엔 늦은 재렌더가 방금 넣은 값을 지운다(2026-09-30 스위트, Firewall 목적지 주소) → 잠시 뒤 다시 보고 키보드로 다시 친다(최대 3회).
 */
export async function fillStable(page: Page, field: Locator, value: string, what = '입력칸'): Promise<void> {
  await field.fill(value);
  await field.press('Tab');
  for (let round = 0; round < 3; round++) {
    await page.waitForTimeout(1_500);
    if ((await field.inputValue().catch(() => '')) === value) break;
    await field.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(value, { delay: 20 });
    await page.keyboard.press('Tab');
  }
  await expect(field, `${what} 값이 남아 있어야 합니다`).toHaveValue(value);
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
    // 라벨에 공백이 있을 수 있다("노드 풀명을 입력하세요") — 예전 \S+? 는 못 읽어 아무것도 안 쳤고, "확인" 이 비활성인 채 강제 클릭만 되어
    // 노드 풀 삭제가 조용히 무시됐다(2026-09-30 SKE 3회)
    const word = (
      text.match(/확인을 위해\s*(.+?)(?:을|를)\s*입력/)?.[1] ?? text.match(/확인을 위해\s*(\S+?)\s*입력/)?.[1]
    )?.trim();
    const isLabel = !!word && /(명|이름)$/.test(word);
    const typed = isLabel
      ? (text.match(new RegExp(`${word}\\s*:\\s*(\\S+)`))?.[1] ?? opts.resourceName)
      : word;
    const input = modal.locator('input[type=text]:visible').first();
    if (typed && (await input.count())) await fillStable(page, input, typed, `확인 입력(${word})`);
    else if (word && (await input.count())) throw new Error(`확인 모달이 "${word}" 입력을 요구하지만 칠 값을 찾지 못했습니다: ${text.slice(0, 200)}`);
  }
  // 모달 버튼도 드물게 "stable" 판정이 안 나 클릭이 오래 매달린다(2026-09-28 SG 규칙 ALL 경고 모달) → 10초 뒤 강제 클릭
  const ok = modal.getByRole('button', { name: button, exact: true });
  try {
    await ok.click({ timeout: 10_000 });
  } catch {
    await ok.click({ force: true });
  }
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
  const btn = page
    .locator('button:visible:not(tr button)')
    .filter({ hasText: new RegExp(`^${escapeRe(button)}$`) })
    .last();
  // 실측(2026-09-28, SG 규칙 추가 "완료" · IAM 정책 "다음"): 활성(aria-disabled=false)인데도 "stable" 판정이 안 나 클릭이 15초 타임아웃되는
  // 하단 버튼이 있다(고정 푸터 애니메이션으로 보임) → 10초 안에 안 되면 강제 클릭.
  try {
    await btn.click({ timeout: 10_000 });
  } catch {
    await btn.click({ force: true });
  }
}

export function row(page: Page, name: string): Locator {
  // :visible — 콘솔은 앞서 연 화면의 표를 숨긴 채 DOM 에 남겨 둔다. 거기 같은 이름(예: IGW 행의 VPC명)이 있으면
  // 숨은 행이 먼저 잡혀 버튼 클릭이 30초 시간 초과로 끝났다(2026-09-30 정리 도구 IGW·VPC, firewall spec)
  return page.locator('tr.scp-body-row:visible').filter({ hasText: name });
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
    // 포함이 아니라 경로 일치로 본다: 생성 폼 '#/scr/registry/create' 도 '#/scr/registry' 를 포함해, 목록으로 안 넘어간 채
    // 폼을 계속 새로 고치다 600초 초과로 끝났다(2026-09-29·30 스위트 Container Registry 2회)
    const hashPath = (u: string) => (u.split('#')[1] ?? '').split('?')[0]!.replace(/\/$/, '');
    if (hashPath(page.url()) !== hashPath(`#${route.replace(/^#/, '')}`)) await gotoRoute(page, route);
    // 행이 안 보이면 다른 페이지에 있을 수 있다 → 여러 페이지면 100개씩 보기로 (소멸 오판 방지가 특히 중요)
    if ((await row(page, name).count()) === 0) await showAllRows(page).catch(() => false);
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
    if (ok) {
      // 목록 아이콘 새로 고침은 토스트("vm-…: 해지 요청…")를 지우지 않는다. 소멸 뒤엔 호출부가 보통 본문 not_text 를 검사하므로 한 번 다시 읽는다
      // (2026-09-29 스위트 run 3: vm-stack 서버 해지 not_text 가 토스트에 걸림).
      // 첫 확인에서 바로 사라진 경우에도 토스트는 남는다(2026-09-30 VPN 터널 not_text) → 소멸이면 항상 한 번 다시 읽는다
      if (opts.gone) {
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 1_500 });
        // 아이콘 새로 고침 직후 표가 잠깐 비는 순간을 "소멸" 로 볼 수 있다(2026-09-30 VPN 해지: 행 0 → 다시 읽으니 해지 중인 행이 그대로)
        // → 다시 읽은 페이지에서 한 번 더 세고, 행이 있으면 계속 기다린다.
        if ((await row(page, name).count()) > 0) {
          opts.log?.(`  ${name} 소멸로 보였지만 다시 읽으니 행이 있음 → 계속 대기`);
          await page.waitForTimeout(interval);
          continue;
        }
      }
      return;
    }
    const elapsed = Math.round((Date.now() - start) / 1000);
    opts.log?.(`  [${elapsed}s] ${name} ${want} 대기… ${count ? text.slice(0, 100) : '(행 없음)'}`);
    if (Date.now() - start > timeout)
      throw new Error(`${name} ${want} 대기 ${timeout / 1000}초 초과. 마지막: ${text || '(행 없음)'}`);
    await page.waitForTimeout(interval);
    await refreshList(page);
  }
}

/**
 * 목록이 여러 페이지면(머리의 "총 N" > 보이는 행 수) 페이지 크기를 "100개씩 보기" 로 바꾼다. 바꿨으면 true.
 * 기본 20개씩이라, 자동 생성 자원이 쌓인 목록에서 우리 행이 2페이지로 밀려 "없음"·"소멸" 로 잘못 보였다
 * (2026-10-02 ServiceWatch 로그 그룹: API Gateway·Cloud Functions 가 만든 /scp/... 그룹 32개).
 */
export async function showAllRows(page: Page): Promise<boolean> {
  const totalText = await page
    .getByText(/^총\s*\d+/)
    .first()
    .innerText({ timeout: 2_000 })
    .catch(() => '');
  const total = Number(totalText.match(/\d+/)?.[0] ?? 0);
  const visible = await page.locator('tr.scp-body-row:visible').count();
  if (!total || total <= visible) return false;
  const size = page.locator('.scp-dropdown:visible').filter({ hasText: /개씩 보기/ }).first();
  if (!(await size.count())) return false;
  await size.click();
  const item = page.locator('.scp-menu:visible .scp-menu-item').filter({ hasText: /^100개씩 보기$/ }).first();
  if (!(await item.count())) {
    await page.keyboard.press('Escape');
    return false;
  }
  await item.click();
  await settleConsole(page, { appearGraceMs: 800 });
  return true;
}

/**
 * 목록만 새로 고친다: 목록 제목 오른쪽 위의 작은 새로고침 아이콘(`i.i-refresh`)을 누르면 목록 API 만 다시 부른다
 * (실측 2026-09-29, VPC 목록: GET /console/api/vpc/v1/vpcs 1회, 페이지 이동·재로딩 없음). 아이콘이 없는 화면은 페이지를 다시 읽는다.
 * 토스트는 지워지지 않으므로 본문 not_text 검사 전에는 여전히 page.reload 를 쓴다.
 */
export async function refreshList(page: Page): Promise<void> {
  const icon = page.locator('i.i-refresh:visible').first();
  if (await icon.count()) {
    const clicked = await icon
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (clicked) {
      await settleConsole(page, { appearGraceMs: 800 });
      return;
    }
  }
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
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
    // 딸린 자원(Internet Gateway 등)이 남아 있으면 콘솔이 해지를 거절하고 그 자원을 링크로 보여 주는 안내를 띄운다(사용자 확인 2026-09-30)
    // → 기다리며 재시도하지 말고 안내 문구를 그대로 오류로 올린다. 호출부가 그 자원을 먼저 지워야 한다.
    const refusal = visibleModal(page).filter({ hasText: /Internet Gateway|삭제 후|먼저|해지할 수 없|연결된/ });
    if (await refusal.waitFor({ timeout: 4_000 }).then(() => true, () => false)) {
      const text = (await refusal.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      await refusal.getByRole('button').last().click({ timeout: 5_000 }).catch(() => undefined);
      throw new Error(`VPC ${name} 해지 거절: ${text.slice(0, 300)}`);
    }
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
