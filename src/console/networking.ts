/**
 * 네트워킹 spec(Firewall · VPN · Transit Gateway · VPC Endpoint · Direct Connect)이 같이 쓰는 준비 단계 (2026-09-29, 에이전트 B).
 * Subnet 이 필요 없는 서비스는 VPC 만 만든다(Subnet 생성·삭제가 각 2~4분이라). 정리는 terminateVpc(ui.ts).
 */
import type { Page } from '@playwright/test';
import { gotoRoute } from './expect';
import { clearIgwFirewallRules, ROUTES } from './inventory';
import { settleConsole } from './overlays';
import {
  confirmModal,
  fillField,
  openCreateForm,
  pickOption,
  row,
  setCheckbox,
  submitForm,
  visibleModal,
  waitForRow,
} from './ui';

/** VPC(10.250.0.0/20) 만 만들고 Active 를 기다린다. */
export async function createVpcOnly(page: Page, vpc: string, log?: (line: string) => void): Promise<void> {
  await openCreateForm(page, ROUTES.vpc, '서비스 생성');
  await fillField(page, 'VPC명', vpc);
  await fillField(page, 'IP 대역', '10.250.0.0/20');
  await submitForm(page, '생성');
  await confirmModal(page, /생성하시겠습니까/);
  await waitForRow(page, ROUTES.vpc, vpc, { status: /Active/, timeoutMs: 180_000, log });
}

/**
 * Internet Gateway 생성 (이름은 콘솔이 IGW_<vpc> 로 짓는다). firewall=true 면 "Firewall 사용" 을 켠다 → Firewall "FW_IGW_<vpc>" 가 사용 상태로 생긴다.
 * 로그 저장은 끈다(로그 저장소 없음) → "…선택하지 않았습니다" 경고 모달(동의 체크) → "생성하시겠습니까?".
 */
export async function createIgw(
  page: Page,
  vpc: string,
  opts: { firewall?: boolean; log?: (line: string) => void } = {},
): Promise<void> {
  await openCreateForm(page, ROUTES.igw, 'Internet Gateway 생성');
  await pickOption(page, 'VPC명', vpc);
  await pickOption(page, '구분', 'Internet Gateway');
  await setCheckbox(page, 'Firewall 사용', !!opts.firewall);
  await setCheckbox(page, 'Firewall 로그 저장 여부', false);
  await submitForm(page, '생성');
  await confirmUntil(page, /생성하시겠습니까/, opts.log);
  await waitForRow(page, ROUTES.igw, vpc, { status: /Active/, timeoutMs: 600_000, intervalMs: 10_000, log: opts.log });
}

/** IGW 삭제 (행 끝 "삭제"). 없으면 건너뜀. IGW 에 딸린 Firewall 도 같이 사라진다. */
export async function deleteIgw(page: Page, vpc: string, log?: (line: string) => void): Promise<void> {
  await gotoRoute(page, ROUTES.igw);
  if ((await row(page, vpc).count()) === 0) return;
  // 방화벽 규칙이 남아 있으면 IGW 삭제가 막힌다 → 먼저 지운다(없으면 아무것도 안 함)
  await clearIgwFirewallRules(page, `IGW_${vpc}`, log ?? (() => undefined));
  await gotoRoute(page, ROUTES.igw);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  await row(page, vpc).first().getByRole('button', { name: '삭제', exact: true }).click();
  await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true });
  await waitForRow(page, ROUTES.igw, vpc, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
}

async function publicIps(page: Page): Promise<string[]> {
  await gotoRoute(page, ROUTES.pip);
  const rows = await page.locator('tr.scp-body-row').allInnerTexts();
  return rows.map((r) => r.trim().split(/\s+/)[0]!).filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
}

/** Public IP 예약(구분 Internet Gateway, kr-west1-b) → 새로 생긴 IP 하나를 돌려준다. */
export async function reservePublicIp(page: Page, log?: (line: string) => void): Promise<string> {
  const before = new Set(await publicIps(page));
  await openCreateForm(page, ROUTES.pip, 'Public IP 예약');
  await pickOption(page, '구분', 'Internet Gateway');
  await pickOption(page, 'Availability Zone', 'kr-west1-b');
  await submitForm(page, '생성');
  await confirmModal(page, /예약하시겠습니까/);
  let added: string[] = [];
  for (const start = Date.now(); Date.now() - start < 90_000; ) {
    added = (await publicIps(page)).filter((ip) => !before.has(ip));
    if (added.length) break;
    await page.waitForTimeout(5_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
  if (added.length !== 1) throw new Error(`예약된 Public IP 를 하나로 특정하지 못했습니다: ${JSON.stringify(added)}`);
  log?.(`  예약한 Public IP: ${added[0]}`);
  return added[0]!;
}

/** Public IP 반납 (Reserved 가 될 때까지 기다린 뒤 행 끝 "반납"). 없으면 건너뜀. */
export async function releasePublicIp(page: Page, ip: string, log?: (line: string) => void): Promise<void> {
  await gotoRoute(page, ROUTES.pip);
  if ((await row(page, ip).count()) === 0) return;
  await waitForRow(page, ROUTES.pip, ip, { status: /Reserved/i, timeoutMs: 300_000, intervalMs: 15_000, log });
  await row(page, ip).getByRole('button', { name: '반납', exact: true }).click();
  await confirmModal(page, /반납하시겠습니까/);
  await waitForRow(page, ROUTES.pip, ip, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
}

/**
 * 생성 버튼 뒤 이어지는 모달을 차례로 확인한다: 경고("…선택하지 않았습니다. 진행하시겠습니까?", 동의 체크) 가 있을 수도 없을 수도 있고,
 * 마지막은 `finalText`("…생성하시겠습니까?"). 모달 문구를 로그로 남긴다 (2026-09-29 LB run 2: 경고 모달 문구 대기 5초 초과 — 순서·문구를 고정하지 않는다).
 */
export async function confirmUntil(
  page: Page,
  finalText: RegExp,
  log?: (line: string) => void,
  maxModals = 4,
): Promise<void> {
  let prev = '';
  for (let i = 0; i < maxModals * 3; i++) {
    const modal = visibleModal(page);
    await modal.waitFor({ timeout: 15_000 });
    const text = (await modal.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (!text || text === prev) {
      await page.waitForTimeout(700); // 앞 모달이 사라지는 중
      prev = '';
      continue;
    }
    prev = text;
    log?.(`  모달: ${text.slice(0, 120)}`);
    const isFinal = finalText.test(text);
    await confirmModal(page, undefined, '확인', { agree: !isFinal });
    if (isFinal) return;
    await page.waitForTimeout(700);
  }
  throw new Error(`"${finalText}" 확인 모달을 만나지 못했습니다`);
}

/** 목록 → 이름 링크로 상세 → 탭(예: /^연결 VPC 관리/) 을 연다. 탭 route 를 돌려준다(waitForRow 용). */
export async function openDetailTab(page: Page, route: string, name: string, tab: RegExp): Promise<string> {
  await gotoRoute(page, route);
  await row(page, name).getByText(name, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page.getByText(tab).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  return '#' + page.url().split('#')[1]!;
}

/**
 * 앞 항목에 따라 비동기로 채워지는 드롭다운(LB 폼의 Service Subnet명 · Availability Zone 1 · LB 헬스 체크 등): 메뉴가 5초 안에 안 뜨면
 * 잠시 뒤 다시 연다 (2026-09-29 LB run 1~3 에서 매번 다른 드롭다운이 한 번씩 안 열렸다).
 */
export async function pickLate(
  page: Page,
  label: string,
  option: string | RegExp,
  log?: (line: string) => void,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    await page.waitForTimeout(1_500);
    try {
      await pickOption(page, label, option);
      return;
    } catch (err) {
      await page.keyboard.press('Escape').catch(() => undefined);
      if (attempt >= 5) throw err;
      log?.(`  "${label}" 드롭다운 재시도 ${attempt}/5`);
    }
  }
}
