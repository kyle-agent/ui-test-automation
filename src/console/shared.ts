/**
 * 공유 네트워크(VPC + Subnet) 채택. 계정당 VPC 5개 한도 안에서 여러 spec 을 병렬로 돌리기 위해 런처(scripts/run-parallel.ts)가
 * VPC+Subnet 을 한 번 만들고 그 이름을 환경 변수로 넘기면, spec 은 자기 VPC 를 만들지 않고 그것을 쓴다(정리도 하지 않는다).
 * api-test-automation 의 SCP_SHARED_VPC_ID / SCP_SHARED_SUBNET_ID 채택 방식과 같다.
 *
 *   SHARED_VPC=vpc-0928-1600-ab12 SHARED_SUBNET=sub-0928-1600-ab12 npx playwright test …
 */
import type { Page } from '@playwright/test';
import { gotoRoute } from './expect';
import { ROUTES } from './inventory';
import {
  below,
  confirmModal,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  terminateVpc,
  topButton,
  waitForRow,
} from './ui';

export interface SharedNetwork {
  vpc: string;
  subnet: string;
  /** true 면 런처가 만든 공유 자원 → spec 이 만들지도 지우지도 않는다 */
  shared: boolean;
}

export function sharedNetworkFromEnv(): { vpc: string; subnet: string } | null {
  const vpc = process.env.SHARED_VPC;
  const subnet = process.env.SHARED_SUBNET;
  return vpc && subnet ? { vpc, subnet } : null;
}

/** VPC(10.250.0.0/20) + Public/Primary Subnet(10.250.0.0/24) 을 만들고 Active 까지 기다린다. */
export async function createNetwork(
  page: Page,
  vpc: string,
  subnet: string,
  log?: (line: string) => void,
): Promise<void> {
  await openCreateForm(page, ROUTES.vpc, '서비스 생성');
  await fillField(page, 'VPC명', vpc);
  await fillField(page, 'IP 대역', '10.250.0.0/20');
  await submitForm(page, '생성');
  await confirmModal(page, /생성하시겠습니까/);
  await waitForRow(page, ROUTES.vpc, vpc, { status: /Active/, timeoutMs: 180_000, log });

  await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
  await pickOption(page, 'VPC명', vpc);
  await pickOption(page, 'Subnet 유형', 'Public');
  await pickOption(page, 'Subnet 구분', /primary/i);
  await fillField(page, 'Subnet명', subnet);
  await fillField(page, 'IP 대역', '10.250.0.0/24');
  const gateway = await below(page, 'Gateway IP', 'input');
  if (!(await gateway.inputValue())) await fillField(page, 'Gateway IP', '10.250.0.1');
  await submitForm(page, '생성');
  await confirmModal(page, /생성하시겠습니까/);
  await waitForRow(page, ROUTES.subnet, subnet, {
    status: /Active/,
    timeoutMs: 900_000,
    intervalMs: 15_000,
    log,
  });
}

/** Subnet → VPC 역순 삭제 (없으면 건너뜀). */
export async function deleteNetwork(
  page: Page,
  vpc: string,
  subnet: string,
  log?: (line: string) => void,
): Promise<void> {
  await gotoRoute(page, ROUTES.subnet);
  if (await row(page, subnet).count()) {
    await selectRow(page, subnet);
    await topButton(page, '삭제').click();
    await confirmModal(page, /삭제하시겠습니까/);
    await waitForRow(page, ROUTES.subnet, subnet, {
      gone: true,
      timeoutMs: 1_200_000,
      intervalMs: 20_000,
      log,
    });
  }
  await terminateVpc(page, ROUTES.vpc, vpc, log);
}

/**
 * spec 이 쓸 네트워크를 정한다: 공유 자원이 환경 변수로 오면 그것을(만들지 않음), 아니면 vars 의 이름으로 새로 만든다.
 */
export async function ensureNetwork(
  page: Page,
  own: { vpc: string; subnet: string },
  log?: (line: string) => void,
): Promise<SharedNetwork> {
  const shared = sharedNetworkFromEnv();
  if (shared) {
    log?.(`  공유 네트워크 채택: ${shared.vpc} / ${shared.subnet}`);
    return { ...shared, shared: true };
  }
  await createNetwork(page, own.vpc, own.subnet, log);
  return { ...own, shared: false };
}
