/**
 * 탐색 대상 화면이 요구하는 선행 리소스를 만든다 (예: Subnet 생성 폼은 VPC 가 있어야 드롭다운이 채워진다).
 * 이름은 정리 규칙(<종류>-<run_id>)을 따르므로 탐색이 끝난 뒤 `cleanupByRunId` 또는 `npm run stacks:cleanup` 이 지운다.
 * 콘솔 조작은 회귀 spec(tests/regression/compute.vm-stack.spec.ts)과 같은 헬퍼를 쓴다.
 */
import type { Page } from '@playwright/test';
import { cleanupLeftovers, listLeftovers } from '../console/inventory';
import {
  below,
  confirmModal,
  fillField,
  openCreateForm,
  pickOption,
  submitForm,
  waitForRow,
} from '../console/ui';

export type Prereq = 'vpc' | 'subnet';

export interface PrereqNames {
  vpc?: string;
  subnet?: string;
}

const ROUTES = { vpc: '#/vpc/vpc/list', subnet: '#/vpc/subnet/list' };

export async function createPrereqs(
  page: Page,
  kinds: Prereq[],
  runId: string,
  log: (line: string) => void,
): Promise<PrereqNames> {
  const names: PrereqNames = {};
  const want = new Set(kinds);
  if (want.has('subnet')) want.add('vpc');
  if (want.has('vpc')) {
    names.vpc = `vpc-${runId}`;
    log(`선행: VPC ${names.vpc} 생성`);
    await openCreateForm(page, ROUTES.vpc, '서비스 생성');
    await fillField(page, 'VPC명', names.vpc);
    await fillField(page, 'IP 대역', '10.250.0.0/20');
    await submitForm(page, '생성');
    await confirmModal(page, /생성하시겠습니까/);
    await waitForRow(page, ROUTES.vpc, names.vpc, { status: /Active/, timeoutMs: 180_000, log });
  }
  if (want.has('subnet')) {
    names.subnet = `sub-${runId}`;
    log(`선행: Subnet ${names.subnet} 생성 (Active 까지 수 분)`);
    await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
    await pickOption(page, 'VPC명', names.vpc!);
    await pickOption(page, 'Subnet 유형', 'Public');
    await pickOption(page, 'Subnet 구분', /primary/i);
    await fillField(page, 'Subnet명', names.subnet);
    await fillField(page, 'IP 대역', '10.250.0.0/24');
    const gateway = await below(page, 'Gateway IP', 'input');
    if (!(await gateway.inputValue())) await fillField(page, 'Gateway IP', '10.250.0.1');
    await submitForm(page, '생성');
    await confirmModal(page, /생성하시겠습니까/);
    await waitForRow(page, ROUTES.subnet, names.subnet, {
      status: /Active/,
      timeoutMs: 900_000,
      intervalMs: 15_000,
      log,
    });
  }
  return names;
}

/** 이 run_id 이름을 가진 리소스(선행 + 탐색 중 생성된 것)를 의존관계 역순으로 지운다. */
export async function cleanupByRunId(
  page: Page,
  runId: string,
  log: (line: string) => void,
): Promise<string[]> {
  const { leftovers } = await listLeftovers(page);
  const mine = leftovers.filter((l) => l.name.includes(runId) || l.kind === 'pip');
  if (mine.length === 0) {
    log('정리: 이 실행이 남긴 리소스 없음');
    return [];
  }
  log(`정리: ${mine.map((l) => `${l.kind} ${l.name}`).join(', ')}`);
  return cleanupLeftovers(page, mine, log);
}
