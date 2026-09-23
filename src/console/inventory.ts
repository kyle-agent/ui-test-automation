/**
 * 테스트가 만든 리소스 목록과 정리. 이름 규칙(`<종류>-MMDD-HHMM-xxxx`, run_id 기반)으로만 판별하므로 사람이 만든 리소스는 건드리지 않는다.
 * 정리 순서는 의존관계 역순: 서버 → Public IP → Internet Gateway → 볼륨 → Subnet → VPC → Security Group
 * (docs/service-facts/*.md 의 실측 순서와 같다).
 */
import type { Page } from '@playwright/test';
import { gotoRoute } from './expect';
import { settleConsole } from './overlays';
import { confirmModal, row, selectRow, topButton, waitForRow } from './ui';

export const ROUTES = {
  vm: '#/virtualserver/virtualserver/list',
  pip: '#/vpc/public-ip/list',
  igw: '#/vpc/internet-gateway/list',
  volume: '#/virtualserver/block-storage/list',
  subnet: '#/vpc/subnet/list',
  vpc: '#/vpc/vpc/list',
  sg: '#/securitygroup/securitygroup/list',
  sgrp: '#/virtualserver/server-group/list',
  bkt: '#/objectstorage/objectstorage/list',
  addr: '#/securitygroup/addressgroup/list',
} as const;

export type Kind = keyof typeof ROUTES;

/** 시나리오가 붙이는 이름: vm-0923-0925-3b2e, sub-…, vpc-…, vol-…, sg-… / IGW_vpc-… / Public IP 는 이름이 없어 "Reserved + 미연결" 로 본다 */
const TEST_NAME = /^(vm|sub|vpc|vol|sg|sgrp|bkt|addr)-\d{4}-\d{4}-[0-9a-f]{4}$/;
const TEST_IGW = /^IGW_vpc-\d{4}-\d{4}-[0-9a-f]{4}$/;

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
      const name = words.find((w) => (kind === 'igw' ? TEST_IGW.test(w) : TEST_NAME.test(w)));
      if (name) leftovers.push({ kind, name, rowText });
    }
  }
  return { leftovers, vpcTotal };
}

const ORDER: Kind[] = ['vm', 'pip', 'igw', 'volume', 'subnet', 'vpc', 'sg', 'sgrp', 'bkt', 'addr'];

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
    case 'vm':
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지하시겠습니까/);
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
      await row(page, item.name).getByRole('button', { name: '삭제', exact: true }).click();
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
    case 'subnet':
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 1_200_000, intervalMs: 20_000, log });
      return;
    case 'vpc':
      await row(page, item.name).getByRole('button', { name: '서비스 해지', exact: true }).click();
      await confirmModal(page, /해지하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, log });
      return;
    case 'sgrp':
    case 'addr':
      // 행 선택 → 상단 "삭제" (Server Group, Address Group)
      await selectRow(page, item.name);
      await topButton(page, '삭제').click();
      await confirmModal(page, /삭제/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'bkt':
      // 행 선택 → 상단 "서비스 해지" (Object Storage 버킷)
      await selectRow(page, item.name);
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지/, '확인', { agree: true });
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 180_000, intervalMs: 10_000, log });
      return;
    case 'sg':
      await row(page, item.name).getByText(item.name, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await topButton(page, '서비스 해지').click();
      await confirmModal(page, /해지하시겠습니까/);
      await waitForRow(page, route, item.name, { gone: true, timeoutMs: 60_000, log });
      return;
  }
}
