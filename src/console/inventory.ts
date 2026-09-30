/**
 * 테스트가 만든 리소스 목록과 정리. 이름 규칙(`<종류>-MMDD-HHMM-xxxx`, run_id 기반)으로만 판별하므로 사람이 만든 리소스는 건드리지 않는다.
 * 정리 순서는 의존관계 역순: 서버 → Public IP → Internet Gateway → 볼륨 → Subnet → VPC → Security Group
 * (docs/service-facts/*.md 의 실측 순서와 같다).
 */
import type { Page } from '@playwright/test';
import { gotoRoute } from './expect';
import { settleConsole } from './overlays';
import { confirmModal, row, selectRow, terminateServer, topButton, waitForRow } from './ui';

export const ROUTES = {
  ske: '#/ske/cluster',
  pg: '#/postgresql/postgresql/list',
  asg: '#/virtualserver/auto-scaling-group/list',
  vm: '#/virtualserver/virtualserver/list',
  pip: '#/vpc/public-ip/list',
  nat: '#/vpc/nat-gateway/list',
  igw: '#/vpc/internet-gateway/list',
  volume: '#/virtualserver/block-storage/list',
  hz: '#/dns/hosted-zone/list',
  pdns: '#/dns/private-dns/list',
  fs: '#/filestorage/filestorage/list',
  port: '#/vpc/port/list',
  subnet: '#/vpc/subnet/list',
  peer: '#/vpc/vpc-peering/list',
  vpc: '#/vpc/vpc/list',
  sg: '#/securitygroup/securitygroup/list',
  sgrp: '#/virtualserver/server-group/list',
  bkt: '#/objectstorage/objectstorage/list',
  addr: '#/securitygroup/addressgroup/list',
  rg: '#/resourcegroups/resource-group/list',
  grp: '#/iam/group/list',
  pol: '#/iam/policy/list',
  lc: '#/virtualserver/launch-configuration/list',
  fn: '#/scf/cloudfunctions',
  que: '#/queueservice/queueservices',
  ntg: '#/notification/group',
  role: '#/iam/role',
  cert: '#/certificate-manager/certificate-manager/list',
  cr: '#/scr/registry',
  // Networking (에이전트 B, 2026-09-29)
  lbsg: '#/loadbalancer/loadbalancer-server-group/list',
  lbhc: '#/loadbalancer/loadbalancer-health-check/list',
  lb: '#/loadbalancer/loadbalancer/list',
  tgw: '#/vpc/transit-gateway/list',
  vpnt: '#/vpn/vpn-tunnel/list',
  vpn: '#/vpn/vpn/list',
  vpce: '#/vpc/vpc-endpoint/list',
  dc: '#/directconnect/directconnect/list',
  // 관리·보안 (에이전트 A, 2026-09-29)
  kms: '#/kms/kms/list',
  sec: '#/secretsmanager/secretsmanager/list',
  swd: '#/service-watch/dashboard',
  swl: '#/service-watch/log/group',
  swe: '#/service-watch/event/rule',
  swa: '#/service-watch/alert/policy',
  bud: '#/costmanagement/budget',
  apigw: '#/apigateway/api',
  mhd: '#/messagehub/domain',
  mhe: '#/messagehub/email',
  // 스냅샷·무거운 서비스 (에이전트 C, 2026-09-29)
  fss: '#/filestorage/filestorage/list',
  snap: '#/virtualserver/block-storage/list',
  es: '#/eventstreams/eventstreams/list',
} as const;

export type Kind = keyof typeof ROUTES;

/** 시나리오가 붙이는 이름: vm-0923-0925-3b2e, sub-…, vpc-…, vol-…, sg-… / IGW_vpc-… / Public IP 는 이름이 없어 "Reserved + 미연결" 로 본다 */
const TEST_NAME =
  /^(ske|asg|vm|sub|vpc|vpcb|vol|sg|sgrp|bkt|addr|rg|grp|lc|port|pdns|peer|pol|fn|que|ntg|role|cert|lb|lbsg|lbhc|tgw|vpce|dc|sube)-\d{4}-\d{4}-[0-9a-f]{4}$/;
/** File Storage 볼륨명은 fs_<run_id 숫자·hex> 뒤에 콘솔이 6자리 UUID 를 붙인다 */
const TEST_FS = /^fs_\d{8}[0-9a-f]{4}_?[a-z0-9]{0,6}$/; // 콘솔이 붙이는 접미사 앞의 '_' 허용 (에이전트 C 보고 2026-09-29)
/** Hosted Zone 은 hz-<run_id>.com (TLD 가 붙는다) */
const TEST_HZ = /^hz-\d{4}-\d{4}-[0-9a-f]{4}\.[a-z.]+$/;
/** PostgreSQL 클러스터명은 pgc<run_id_alpha> (영문만 허용) */
const TEST_PG = /^pgc[a-z]{12}$/;
/** Container Registry 명은 '-' 불가: cr<run_id_compact> */
const TEST_CR = /^cr\d{8}[0-9a-f]{4}$/;
/** VPN Gateway·Tunnel 명은 영문·숫자만: vpn<run_id_compact>, vpnt<run_id_compact> */
const TEST_VPN = /^vpn\d{8}[0-9a-f]{4}$/;
const TEST_VPNT = /^vpnt\d{8}[0-9a-f]{4}$/;
const TEST_IGW = /^IGW_vpc-\d{4}-\d{4}-[0-9a-f]{4}$/;
/** 에이전트 A 종류별 이름 규칙 (2026-09-29). KMS 키·이벤트 규칙명은 영문·숫자만, Message Hub Email 은 목록에서 앞 3글자만 보인다("mhe***@*******.com") */
const TEST_EXTRA: Partial<Record<Kind, RegExp>> = {
  kms: /^kms\d{8}[0-9a-f]{4}$/,
  sec: /^sec-\d{4}-\d{4}-[0-9a-f]{4}$/,
  swd: /^swd-\d{4}-\d{4}-[0-9a-f]{4}$/,
  swl: /^swl-\d{4}-\d{4}-[0-9a-f]{4}$/,
  swe: /^swe\d{8}[0-9a-f]{4}$/,
  swa: /^swa-\d{4}-\d{4}-[0-9a-f]{4}$/,
  bud: /^bud-\d{4}-\d{4}-[0-9a-f]{4}$/,
  apigw: /^apigw-\d{4}-\d{4}-[0-9a-f]{4}$/,
  mhd: /^mhd-\d{4}-\d{4}-[0-9a-f]{4}\.example\.com$/,
  mhe: /^mhe\*+@\*+\.com$/,
  // 에이전트 C: File Storage 스냅샷용 볼륨 fss_<compact>_xxxxxx(콘솔이 붙임), 볼륨 스냅샷용 Block Storage 볼륨 snap-<run_id>, Event Streams 클러스터 es<run_id_alpha>
  fss: /^fss_\d{8}[0-9a-f]{4}(_[a-z0-9]{6})?$/,
  snap: /^snap-\d{4}-\d{4}-[0-9a-f]{4}$/,
  es: /^es[a-j]{12}$/,
};

export interface Leftover {
  kind: Kind;
  name: string;
  rowText: string;
}

async function rowsOf(page: Page, route: string): Promise<string[]> {
  await gotoRoute(page, route);
  await page.waitForTimeout(1_500);
  return (await page.locator('tr.scp-body-row').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
}

/** 모든 목록을 훑어 테스트 이름 규칙에 맞는 리소스를 돌려준다. VPC 총 개수도 함께(계정당 5개 한도). */
export async function listLeftovers(page: Page): Promise<{ leftovers: Leftover[]; vpcTotal: number }> {
  const leftovers: Leftover[] = [];
  let vpcTotal = 0;
  for (const kind of Object.keys(ROUTES) as Kind[]) {
    const rows = await rowsOf(page, ROUTES[kind]);
    if (kind === 'vpc') vpcTotal = rows.length;
    for (const rowText of rows) {
      const words = rowText.split(' ');
      if (kind === 'pip') {
        // "123.41.32.70 Internet Gateway - - kr-west1-b … Reserved 반납"
        const ip = words[0]!;
        if (/^\d+\.\d+\.\d+\.\d+$/.test(ip) && /Reserved/i.test(rowText) && / - - /.test(rowText))
          leftovers.push({ kind, name: ip, rowText });
        continue;
      }
      const extra = TEST_EXTRA[kind];
      const name = words.find((w) =>
        extra
          ? extra.test(w)
          : kind === 'pg'
            ? TEST_PG.test(w)
            : kind === 'nat'
              ? /^sub-\d{4}-\d{4}-[0-9a-f]{4}$/.test(w)
              : kind === 'igw'
                ? TEST_IGW.test(w)
                : kind === 'fs'
                  ? TEST_FS.test(w)
                  : kind === 'hz'
                    ? TEST_HZ.test(w)
                    : kind === 'cr'
                      ? TEST_CR.test(w)
                      : kind === 'vpn'
                        ? TEST_VPN.test(w)
                        : kind === 'vpnt'
                          ? TEST_VPNT.test(w)
                          : TEST_NAME.test(w),
      );
      if (name && kind === 'sec' && /To be terminated/.test(rowText)) continue; // 해지 예약됨(7일 뒤 삭제, 에이전트 A)
      if (name) leftovers.push({ kind, name, rowText });
    }
  }
  return { leftovers, vpcTotal };
}

const ORDER: Kind[] = [
  'ske',
  'pg',
  'es', // 에이전트 C: Event Streams (VPC·Subnet 보다 먼저)
  'asg',
  'vm',
  'lbsg', // 붙은 Listener 를 먼저 지운 뒤 (에이전트 B)
  'lbhc',
  'lb',
  'vpnt',
  'vpn',
  'vpce',
  'dc',
  'tgw', // 연결 VPC 를 먼저 해제
  'nat',
  'pip',
  'igw',
  'volume',
  'snap', // 에이전트 C: 스냅샷 먼저 지우고 볼륨
  'fs',
  'fss', // 에이전트 C
  'hz',
  'pdns',
  'port',
  'subnet',
  'peer',
  'vpc',
  'sg',
  'sgrp',
  'bkt',
  'addr',
  'rg',
  'grp',
  'pol',
  'lc',
  'fn',
  'que',
  'ntg',
  'role',
  'cert',
  'cr',
  // 에이전트 A (2026-09-29)
  'kms',
  'sec',
  'swa',
  'swe',
  'swl',
  'swd',
  'bud',
  'apigw',
  'mhd',
  'mhe',
];

/** 남은 리소스를 의존관계 역순으로 지운다. 실패한 항목은 모아서 돌려준다. */
export async function cleanupLeftovers(
  page: Page,
  leftovers: Leftover[],
  log: (line: string) => void = console.log,
): Promise<string[]> {
  const errors: string[] = [];
  for (const kind of ORDER) {
    for (const item of leftovers.filter((l) => l.kind === kind)) {
      try {
        log(`정리: ${kind} ${item.name}`);
        await deleteOne(page, item, log);
      } catch (err) {
        errors.push(
          `${kind} ${item.name}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
        );
      }
    }
  }
  return errors;
}

async function deleteOne(page: Page, item: Leftover, log: (line: string) => void): Promise<void> {
  const route = ROUTES[item.kind];
  await gotoRoute(page, route);
  if ((await row(page, item.name).count()) === 0) return;
  switch (item.kind) {
    case 'ske':
      // Kubernetes Engine 클러스터: 행 선택 → 상단 "서비스 해지". 생성 중이면 Active 까지 기다린다
      await waitForRow(page, route, item.name, {
        status: /Active|Running/i,
        timeoutMs: 1_800_000,
        intervalMs: 30_000,
        log,
      });
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 1_800_000, intervalMs: 30_000, log });
      return;
    case 'pg':
      // PostgreSQL(DBaaS): 목록엔 해지가 없고 상세의 "서비스 해지"
      await waitForRow(page, route, item.name, {
        status: /Active|Running/i,
        timeoutMs: 1_800_000,
        intervalMs: 30_000,
        log,
      });
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 1_800_000, intervalMs: 30_000, log });
      return;
    case 'asg':
      // Auto-Scaling Group: 목록에 삭제가 없으면 상세의 삭제/서비스 해지
      if (
        await row(page, item.name)
          .getByRole('button', { name: /삭제|해지/ })
          .count()
      )
        await row(page, item.name)
          .getByRole('button', { name: /삭제|해지/ })
          .first()
          .click();
      else {
        await row(page, item.name).getByText(item.name, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await page
          .locator('button:visible')
          .filter({ hasText: /삭제|서비스 해지/ })
          .first()
          .click();
      }
      await confirmModal(page, /삭제|해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      return;
    case 'vm':
      await terminateServer(page, route, item.name, log);
      return;
    case 'nat':
      // NAT Gateway: 행 선택 → 상단 "삭제" (이름은 콘솔이 자동으로 지어 Subnet명으로 찾는다)
      await waitForRow(page, route, item.name, {
        status: /Active/i,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      return;
    case 'pip':
      await waitForRow(page, route, item.name, {
        status: /Reserved/i,
        timeoutMs: 300_000,
        intervalMs: 15_000,
        log,
      });
      await row(page, item.name).getByRole('button', { name: '반납', exact: true }).click();
      await confirmModal(page, /반납하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'igw':
      // 방화벽에 규칙이 남아 있으면 IGW 삭제 버튼이 눌리지 않는다(2026-09-30 networking.firewall 잔여물) → 규칙부터 지운다
      await clearIgwFirewallRules(page, item.name, log);
      // Firewall 화면을 거친 뒤 해시 이동만 하면 IGW 행의 삭제 버튼 클릭이 30초 동안 걸린다(새 탭에선 정상) → 다시 읽고 보이는 행만
      await gotoRoute(page, route);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await settleConsole(page, { appearGraceMs: 800 });
      await page
        .locator('tr.scp-body-row:visible')
        .filter({ hasText: item.name })
        .first()
        .getByRole('button', { name: '삭제', exact: true })
        .click();
      await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      return;
    case 'volume':
      await waitForRow(page, route, item.name, {
        status: /Available/i,
        timeoutMs: 300_000,
        intervalMs: 10_000,
        log,
      });
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      return;
    case 'hz':
      // Hosted Zone: 행 끝 "삭제" → "Hosted Zone을 삭제하시겠습니까?"
      await row(page, item.name).getByRole('button', { name: '삭제', exact: true }).click();
      await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      return;
    case 'pdns':
      // Private DNS: 목록에 삭제 버튼이 없고 상세의 "서비스 해지" 가 Creating 동안 비활성 → Active 를 기다린 뒤 상세에서 해지
      await waitForRow(page, route, item.name, {
        status: /Active/i,
        timeoutMs: 300_000,
        intervalMs: 15_000,
        log,
      });
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 15_000, log });
      return;
    case 'port':
      // 행 선택 → 상단 "삭제" (VPC Port; 서버에 붙어 있으면 실패하므로 서버 정리 뒤에 온다)
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'subnet':
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 1_200_000, intervalMs: 20_000, log });
      return;
    case 'peer':
      // VPC Peering: 목록에 선택·삭제가 없고 상세의 "VPC Peering 삭제" 만 있다. Creating 동안은 기다린다
      await waitForRow(page, route, item.name, {
        status: /Active/i,
        timeoutMs: 300_000,
        intervalMs: 15_000,
        log,
      });
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, 'VPC Peering 삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 15_000, log });
      return;
    case 'vpc':
      // Peering 삭제 직후엔 해지가 조용히 무시된다 → 60초 단위로 최대 5회 다시 누른다
      for (let attempt = 1; attempt <= 5; attempt++) {
        await gotoRoute(page, route);
        if ((await row(page, item.name).count()) === 0) return;
        await row(page, item.name).getByRole('button', { name: '서비스 해지', exact: true }).click();
        await confirmModal(page, /해지하시겠습니까/);
        try {
          await waitForRow(page, route, item.name, {
            gone: true,
            timeoutMs: 60_000,
            intervalMs: 15_000,
            log,
          });
          return;
        } catch {
          log(`  VPC ${item.name} 해지 재시도 ${attempt}/5`);
        }
      }
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 120_000, log });
      return;
    case 'sgrp':
    case 'addr':
    case 'rg':
    case 'grp':
    case 'pol':
    case 'lc':
      // 행 선택 → 상단 "삭제" (Server Group, Address Group, Resource Group, IAM 사용자 그룹, Launch Configuration)
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'fs':
      // File Storage: 행 선택 → 상단 "서비스 해지" (모달이 볼륨명 입력을 요구할 수 있음)
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 15_000, log });
      return;
    case 'bkt':
      // 행 선택 → 상단 "서비스 해지" (Object Storage 버킷)
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true, resourceName: item.name }); // 모달이 실제 버킷명 입력을 요구
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'fn':
    case 'que':
    case 'cert':
      // 행 선택 → 상단 "서비스 해지" (Cloud Functions, Queue, Certificate Manager)
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지|삭제/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      return;
    case 'ntg':
    case 'role':
      // 행 선택 → 상단 "삭제" (알림 그룹, IAM 역할)
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'cr':
      // Container Registry: 목록에 해지 버튼이 없다 → 상세 "서비스 해지". Terminating 이 수 분 간다
      if (/Terminating/i.test(item.rowText)) return;
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지|삭제/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 20_000, log });
      return;
    case 'sg':
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 60_000, log });
      return;
    // ── Networking (에이전트 B, 2026-09-29) ──
    case 'lbsg': {
      // LB 서버 그룹: Listener 가 물고 있으면 못 지운다 → 행의 Load Balancer명(테스트 LB)의 "연결된 자원" 탭에서 Listener 를 먼저 지운다
      const lbName = item.rowText.split(' ').find((w) => /^lb-\d{4}-\d{4}-[0-9a-f]{4}$/.test(w));
      if (lbName) await deleteLbListeners(page, lbName, log);
      await gotoRoute(page, route);
      await row(page, item.name).getByRole('button', { name: '삭제', exact: true }).click();
      await confirmModal(page, /삭제하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      return;
    }
    case 'lbhc':
      await row(page, item.name).getByRole('button', { name: '삭제', exact: true }).click();
      await confirmModal(page, /삭제하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      return;
    case 'lb':
      await deleteLbListeners(page, item.name, log);
      await gotoRoute(page, route);
      await row(page, item.name).getByRole('button', { name: '서비스 해지', exact: true }).click();
      await confirmModal(page, /해지하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 900_000, intervalMs: 20_000, log });
      return;
    case 'vpnt':
    case 'vpn':
    case 'tgw': {
      // 목록에 삭제가 없다(VPN·Tunnel) → 상세 버튼 ("VPN Tunnel 삭제" / "서비스 해지" / "Transit Gateway 삭제"). VPN 은 Tunnel 을 먼저 지워야 한다(ORDER).
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      if (item.kind === 'tgw') {
        // 연결된 VPC 를 먼저 해제 ("연결 VPC 관리" 탭 → 행 선택 → 삭제)
        await page
          .getByText(/^연결 VPC 관리/)
          .first()
          .click();
        await settleConsole(page, { appearGraceMs: 800 });
        const tab = '#' + page.url().split('#')[1]!;
        for (let i = 0; i < 5 && (await page.locator('tr.scp-body-row').count()); i++) {
          const text = (await page.locator('tr.scp-body-row').first().innerText())
            .replace(/\s+/g, ' ')
            .trim();
          const vpcName = text.split(' ')[0]!;
          if (!/Deleting/i.test(text)) {
            await row(page, vpcName).locator('i.table-select').first().click();
            await topButton(page, '삭제').click();
            await confirmModal(page, /삭제하시겠습니까/);
          }
          await waitForRow(page, tab, vpcName, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
        }
      }
      await page
        .locator('button:visible:not(tr button)')
        .filter({ hasText: /^(VPN Tunnel 삭제|서비스 해지|Transit Gateway 삭제)$/ })
        .first()
        .click();
      await confirmModal(page, /삭제|해지/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 900_000, intervalMs: 20_000, log });
      return;
    }
    case 'vpce':
      // VPC Endpoint: 행 끝 "삭제". 그 뒤 VPC Endpoint 유형 Subnet(sube-…) 은 subnet 종류로 지워진다
      await row(page, item.name).getByRole('button', { name: '삭제', exact: true }).click();
      await confirmModal(page, /삭제하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      return;
    case 'dc':
      // Direct Connect: 행 끝 "서비스 해지" (규칙은 같이 사라진다고 보지 않고 해지가 막히면 오류로 남긴다)
      await row(page, item.name).getByRole('button', { name: '서비스 해지', exact: true }).click();
      await confirmModal(page, /해지하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
      return;
    // ── 관리·보안 (에이전트 A, 2026-09-29) ──
    case 'kms':
      // 해지 모달 기본 "즉시 해지" + 동의 체크 → 목록에서 바로 사라진다
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 120_000, intervalMs: 5_000, log });
      return;
    case 'sec': {
      // 즉시 삭제가 없다: 해지 대기 기간 7일(최소)로 예약 → To be terminated (listLeftovers 가 이후 건너뛴다)
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      const days = page.locator('.scp-modal:visible input:visible').first();
      await days.fill('7');
      await days.press('Tab');
      await confirmModal(page, /해지하시겠습니까/, '확인');
      await waitForRow(page, route, item.name, {
        status: /To be terminated/,
        timeoutMs: 120_000,
        intervalMs: 5_000,
        log,
      });
      return;
    }
    case 'swa':
    case 'apigw':
      // 행 끝 버튼: 경보 정책 "삭제" / API "서비스 해지"("확인을 위해 삭제를 입력")
      await row(page, item.name)
        .getByRole('button', { name: item.kind === 'swa' ? '삭제' : '서비스 해지', exact: true })
        .click();
      await confirmModal(page, /삭제|해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      return;
    case 'swe':
    case 'swl':
    case 'swd':
    case 'mhd':
      // 행 선택 → 상단 "삭제" (이벤트 규칙, 로그 그룹, 대시보드("확인을 위해 삭제를 입력"), Message Hub 도메인)
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'bud': {
      // 행 선택 → 상단 "⋮"(i.i-card-handle) 메뉴 → "삭제"
      await selectRow(page, item.name);
      await page.locator('button:visible:has(i.i-card-handle)').first().click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 10_000 });
      await menu
        .locator('.scp-menu-item')
        .filter({ hasText: /^\s*삭제\s*$/ })
        .first()
        .click();
      await confirmModal(page, /예산을 삭제하시겠습니까/, '확인');
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 120_000, intervalMs: 5_000, log });
      return;
    }
    case 'mhe':
      // 주소가 가려져 이름으로 못 고른다 → 가려진 행을 상세로 열어 "Email 삭제" (mhe 접두어는 테스트만 쓴다; 같은 가림 문자열이 여러 개면 한 번에 하나씩)
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, 'Email 삭제').click();
      await confirmModal(page, /Email을 삭제하시겠습니까/, '확인');
      await page.waitForTimeout(5_000);
      return;
    case 'fss':
      // File Storage(스냅샷 spec 볼륨): 행 선택 → 상단 "서비스 해지" (에이전트 C)
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 15_000, log });
      return;
    case 'snap': {
      // Block Storage(스냅샷 spec 볼륨): 상세(볼륨 ID 셀 링크) "스냅샷 목록" 탭의 스냅샷을 지운 뒤 목록에서 행 선택 → "삭제" (에이전트 C)
      await row(page, item.name).locator('td').nth(1).click();
      await settleConsole(page, { appearGraceMs: 800 });
      const tab = page.getByText(/^스냅샷 목록 \(\d+\)$/).first();
      await tab.click();
      await settleConsole(page, { appearGraceMs: 800 });
      for (let i = 0; i < 6; i++) {
        const snap = page.locator('tr.scp-body-row').filter({ hasText: item.name }).first();
        if (!(await snap.count())) break;
        if (!/Creating|Deleting/i.test(await snap.innerText())) {
          await snap.locator('i.table-select').first().click();
          await topButton(page, '삭제').click();
          await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true });
        }
        await page.waitForTimeout(20_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
        await tab.click();
        await settleConsole(page, { appearGraceMs: 800 });
      }
      await gotoRoute(page, route);
      await waitForRow(page, route, item.name, {
        status: /Available/i,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
      return;
    }
    case 'es':
      // Event Streams: 목록에 해지가 없고 상세의 "서비스 해지" (에이전트 C, PostgreSQL 과 같은 절차)
      await waitForRow(page, route, item.name, {
        status: /Active|Running/i,
        timeoutMs: 1_800_000,
        intervalMs: 30_000,
        log,
      });
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true, resourceName: item.name });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 1_800_000, intervalMs: 30_000, log });
      return;
  }
}

/** LB 상세 "연결된 자원" 탭의 Listener 를 모두 지운다 (테스트 LB 의 것만 불린다). */
async function deleteLbListeners(page: Page, lbName: string, log: (line: string) => void): Promise<void> {
  await gotoRoute(page, ROUTES.lb);
  if ((await row(page, lbName).count()) === 0) return;
  await row(page, lbName).getByText(lbName, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  await page
    .getByText(/^연결된 자원/)
    .first()
    .click();
  await settleConsole(page, { appearGraceMs: 800 });
  const tab = '#' + page.url().split('#')[1]!;
  for (let i = 0; i < 10 && (await page.locator('tr.scp-body-row').count()); i++) {
    const r = page.locator('tr.scp-body-row').first();
    const name = (await r.innerText()).replace(/\s+/g, ' ').trim().split(' ')[0]!;
    await r.getByRole('button', { name: '삭제', exact: true }).click();
    await confirmModal(page, /삭제하시겠습니까/);
    await waitForRow(page, tab, name, { gone: true, timeoutMs: 600_000, intervalMs: 15_000, log });
  }
}

/**
 * IGW 에 딸린 방화벽(FW_<IGW명>)의 규칙을 모두 지운다. 규칙 탭 이름 "규칙 (n)" 이 0 이면 아무것도 하지 않는다.
 * 흐름은 networking.firewall spec 과 같다: 규칙 탭 → 규칙 수정 → 행 선택 → 삭제("삭제 예정") → 완료 → 확인.
 */
export async function clearIgwFirewallRules(page: Page, igwName: string, log: (line: string) => void): Promise<void> {
  const fwName = `FW_${igwName}`;
  await gotoRoute(page, '#/firewall/firewall/list');
  const link = page.locator('tr.scp-body-row:visible').getByText(fwName, { exact: true }).first();
  if (!(await link.count())) return;
  await link.click();
  await settleConsole(page, { appearGraceMs: 800 });
  const tab = page.getByText(/^규칙 \(\d+\)/).first();
  const n = Number(((await tab.innerText().catch(() => '규칙 (0)')).match(/\((\d+)\)/) ?? [])[1] ?? 0);
  if (!n) return;
  log(`  ${fwName} 규칙 ${n}개 삭제`);
  await tab.click();
  await settleConsole(page, { appearGraceMs: 800 });
  const rulesRoute = '#' + page.url().split('#')[1]!;
  await page.getByRole('button', { name: '규칙 수정', exact: true }).click();
  await page.waitForURL(/\/rule\/edit/, { timeout: 30_000 });
  await settleConsole(page, { appearGraceMs: 1000 });
  const rows = page.locator('tr.scp-body-row:visible');
  for (let i = 0; i < (await rows.count()); i++) await rows.nth(i).locator('i.table-select').first().click();
  await page.getByRole('button', { name: '삭제', exact: true }).first().click();
  await page.getByRole('button', { name: '완료', exact: true }).last().click();
  await confirmModal(page, /수정하시겠습니까/);
  await settleConsole(page, { appearGraceMs: 800 });
  for (const start = Date.now(); Date.now() - start < 300_000; ) {
    await gotoRoute(page, rulesRoute);
    const left = Number(((await page.getByText(/^규칙 \(\d+\)/).first().innerText().catch(() => '')).match(/\((\d+)\)/) ?? [])[1] ?? -1);
    if (left === 0) return;
    await page.waitForTimeout(10_000);
  }
  throw new Error(`${fwName} 규칙이 5분 안에 지워지지 않았습니다`);
}
