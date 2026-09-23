// 직접 작성 (2026-09-23). 시나리오: scenarios/compute/vm-volume.yaml.
// 콘솔 사실: docs/service-facts/compute-vm-stack.md, docs/service-facts/compute-block-storage.md, src/console/ui.ts 머리말.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import {
  below,
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
  terminateVpc,
  terminateServer,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/compute/vm-volume.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);

const ROUTES = {
  keypair: '#/virtualserver/keypair/list',
  vpc: '#/vpc/vpc/list',
  subnet: '#/vpc/subnet/list',
  vm: '#/virtualserver/virtualserver/list',
  volume: '#/virtualserver/block-storage/list',
};

const log = (line: string) => console.log(line);
const stepCtx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

const VISIBLE_CONTROLS =
  "[...document.querySelectorAll('button,[role=tab],[role=button],[role=menuitem],.scp-menu-item')].filter(b=>b.checkVisibility()&&!b.closest('header')).map(b=>b.tagName.toLowerCase()+(b.getAttribute('role')?'['+b.getAttribute('role')+']':'')+':'+b.innerText.trim().slice(0,30)+(b.getAttribute('aria-disabled')==='true'?'(dis)':''))";

async function dump(page: Page, label: string): Promise<string> {
  const file = test.info().outputPath(`dump-${label}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  const controls = (await page.evaluate(VISIBLE_CONTROLS).catch(() => [])) as string[];
  const text = `${label}: url=${page.url()} controls=${JSON.stringify(controls.slice(0, 80))} screenshot=${file}`;
  log(text);
  return text;
}

async function refreshedExpect(
  page: Page,
  exp: ReturnType<typeof resolveExpectation>,
  ctx: ReturnType<typeof stepCtx>,
): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  await expectStep(page, exp, ctx);
}

/** 서버 상세(상세 정보 탭)로 이동한다. 목록의 이름 링크 클릭. */
async function openVmDetail(page: Page): Promise<void> {
  await gotoRoute(page, ROUTES.vm);
  await row(page, vars.vm!).getByText(vars.vm!, { exact: true }).first().click();
  await settleConsole(page, { appearGraceMs: 800 });
  // 같은 텍스트가 숨은 내비게이션(div.com-nav-name)에도 있어 보이는 것만 기다린다.
  await page.locator(':text-is("Block Storage"):visible').first().waitFor({ timeout: 15_000 });
}

/** 서버 상세의 Block Storage 표에서 볼륨명이 든 행 */
function volumeRowInVm(page: Page) {
  return page.locator('tr').filter({ hasText: vars.volume! }).first();
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@storage'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 90 * 60_000 });

  test.afterEach('정리 (볼륨 분리·삭제 → 서버 → Subnet → VPC)', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    const errors: string[] = [];
    const attempt = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
      }
    };

    await attempt('볼륨 분리·삭제', async () => {
      await gotoRoute(page, ROUTES.volume);
      if ((await row(page, vars.volume!).count()) === 0) return;
      await test.step('teardown[0] 볼륨 분리 후 삭제', async () => {
        const status = (await row(page, vars.volume!).innerText()).replace(/\s+/g, ' ');
        // 서버에 붙어 있으면(In-use) 서버 상세의 Block Storage 표에서 분리한다.
        if (/in[\s-]?use|attached|연결/i.test(status) && (await row(page, vars.vm!).count()) >= 0) {
          await gotoRoute(page, ROUTES.vm);
          if ((await row(page, vars.vm!).count()) > 0) {
            await openVmDetail(page);
            const vrow = volumeRowInVm(page);
            if ((await vrow.count()) > 0) {
              const menu = vrow.locator('button, [role=button], i.scp-icon').last();
              await menu.click();
              await page.waitForTimeout(500);
              await dump(page, 'volume-row-menu');
              const detach = page
                .locator('.scp-menu-item:visible, [role=menuitem]:visible, button:visible')
                .filter({ hasText: /연결 해제|분리|Detach/i })
                .first();
              if ((await detach.count()) === 0) throw new Error('분리 메뉴를 찾지 못했습니다');
              await detach.click();
              await confirmModal(page, /해제|분리/, '확인', { agree: true });
              for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
            }
          }
        }
        await waitForRow(page, ROUTES.volume, vars.volume!, {
          status: /Available/i,
          timeoutMs: 300_000,
          intervalMs: 10_000,
          log,
        });
        await selectRow(page, vars.volume!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /삭제/, '확인', { agree: true });
        await waitForRow(page, ROUTES.volume, vars.volume!, {
          gone: true,
          timeoutMs: 300_000,
          intervalMs: 10_000,
          log,
        });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[0]!.expect, vars), stepCtx(0));
      });
    });

    await attempt('서버 해지', async () => {
      await gotoRoute(page, ROUTES.vm);
      if ((await row(page, vars.vm!).count()) === 0) return;
      await test.step('teardown[1] 서버 해지', async () => {
        await terminateServer(page, ROUTES.vm, vars.vm!, log);
        await refreshedExpect(page, resolveExpectation(scenario.teardown[1]!.expect, vars), stepCtx(1));
      });
    });

    await attempt('Subnet 삭제', async () => {
      await gotoRoute(page, ROUTES.subnet);
      if ((await row(page, vars.subnet!).count()) === 0) return;
      await test.step('teardown[2] Subnet 삭제', async () => {
        await selectRow(page, vars.subnet!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /삭제하시겠습니까/);
        await waitForRow(page, ROUTES.subnet, vars.subnet!, {
          gone: true,
          timeoutMs: 1_200_000,
          intervalMs: 20_000,
          log,
        });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[2]!.expect, vars), stepCtx(2));
      });
    });

    await attempt('VPC 해지', async () => {
      await gotoRoute(page, ROUTES.vpc);
      if ((await row(page, vars.vpc!).count()) === 0) return;
      await test.step('teardown[3] VPC 해지', async () => {
        await terminateVpc(page, ROUTES.vpc, vars.vpc!, log);
        await refreshedExpect(page, resolveExpectation(scenario.teardown[3]!.expect, vars), stepCtx(3));
      });
    });

    if (errors.length) throw new Error(`정리 중 실패 (남은 리소스를 확인하세요):\n${errors.join('\n')}`);
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );

    await test.step('steps[0] Keypair 확인', async () => {
      await gotoRoute(page, ROUTES.keypair);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), stepCtx(0));
    });

    await test.step(`steps[1] VPC ${vars.vpc} 생성`, async () => {
      await openCreateForm(page, ROUTES.vpc, '서비스 생성');
      await fillField(page, 'VPC명', vars.vpc!);
      await fillField(page, 'IP 대역', vars.vpc_cidr!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpc, vars.vpc!, { status: /Active/, timeoutMs: 180_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), stepCtx(1));
    });

    await test.step(`steps[2] Subnet ${vars.subnet} 생성`, async () => {
      await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet 유형', 'Public');
      await pickOption(page, 'Subnet 구분', /primary/i);
      await fillField(page, 'Subnet명', vars.subnet!);
      await fillField(page, 'IP 대역', vars.subnet_cidr!);
      const gateway = await below(page, 'Gateway IP', 'input');
      if (!(await gateway.inputValue())) {
        await fillField(page, 'Gateway IP', vars.subnet_cidr!.replace(/\.0\/\d+$/, '.1'));
      }
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.subnet, vars.subnet!, {
        status: /Active/,
        timeoutMs: 900_000,
        intervalMs: 15_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), stepCtx(2));
    });

    await test.step(`steps[3] Virtual Server ${vars.vm} 생성`, async () => {
      await openCreateForm(page, ROUTES.vm, '서비스 생성');
      await page.getByText('Ubuntu', { exact: true }).first().click();
      await pickOption(page, '서버 타입', 'Standard-1');
      await pickOption(page, '서버 타입', /^s1v1m2\b/, { nth: 1 });
      await pickOption(page, '기본 OS', 'SSD');
      await fillField(page, '서버명', vars.vm!);
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet명', vars.subnet!);
      await pickOption(page, 'Keypair명', vars.keypair!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성/);
      for (let i = 0; i < 3 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.vm, vars.vm!, {
        status: /Active/i,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), stepCtx(3));
    });

    await test.step(`steps[4] Block Storage ${vars.volume} 생성`, async () => {
      // 폼(2026-09-23 프로브): 볼륨명 / 디스크 유형(SSD, SSD_KMS, SSD_MultiAttach, SSD_Provisioned) / 용량 Units(8GB 단위) + GB(자동) / Max IOPS·Throughput(Provisioned 만) / AZ / 스냅샷 / 요금 확인 / 생성
      await openCreateForm(page, ROUTES.volume, 'Block Storage 생성');
      await fillField(page, '볼륨명', vars.volume!);
      await pickOption(page, '디스크 유형', 'SSD');
      await fillField(page, '용량', vars.volume_units!);
      const az = await below(page, 'Availability Zone', '.scp-dropdown');
      if ((await az.count()) && /선택하세요/.test(await az.innerText()))
        await pickOption(page, 'Availability Zone', 'kr-west1-b');
      await submitForm(page, '생성');
      await confirmModal(page, /생성/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.volume, vars.volume!, {
        status: /Available/i,
        timeoutMs: 300_000,
        intervalMs: 10_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), stepCtx(4));
    });

    await test.step(`steps[5] 서버 ${vars.vm} 에 볼륨 ${vars.volume} 연결`, async () => {
      await openVmDetail(page);
      await dump(page, 'vm-detail-storage');
      // 서버 상세 하단 "Block Storage" 섹션의 "추가" 버튼 → 모달 (구조는 첫 실행 덤프로 확인)
      const add = page
        .locator('button:visible')
        .filter({ hasText: /^추가$/ })
        .last();
      if ((await add.count()) === 0)
        throw new Error('Block Storage "추가" 버튼이 없습니다. ' + (await dump(page, 'no-add-button')));
      await add.click();
      const modal = visibleModal(page);
      await modal.waitFor({ timeout: 10_000 });
      log(`  추가 모달: ${(await modal.innerText()).replace(/\s+/g, ' ').slice(0, 500)}`);
      log(
        `  추가 모달 컨트롤: tabs=${JSON.stringify(await modal.locator('[role=tab], .scp-tab, [class*="tab"]').allInnerTexts())} dropdowns=${await modal.locator('.scp-dropdown').count()} rows=${await modal.locator('tr').count()} boxes=${await modal.locator('.scp-select').count()} buttons=${JSON.stringify(await modal.locator('button').allInnerTexts())}`,
      );
      await page
        .screenshot({ path: test.info().outputPath('dump-volume-add-modal.png') })
        .catch(() => undefined);
      // "Block Storage 추가" 모달(2026-09-23 덤프): 볼륨 검색 표(현재 N / 5개씩 보기 / "볼륨명을 입력하세요." / 볼륨 ID | 볼륨명). 초기엔 비어 있어 검색해야 행이 나온다.
      const search = modal.locator('input:visible').first();
      await search.fill(vars.volume!);
      await search.press('Enter');
      const vrow = modal.locator('tr').filter({ hasText: vars.volume! }).first();
      const found = await vrow
        .waitFor({ timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (!found) {
        // 검색 아이콘 클릭으로 재시도
        await modal
          .locator('i.i-search, .scp-icon-pointer')
          .first()
          .click()
          .catch(() => undefined);
        await vrow.waitFor({ timeout: 10_000 }).catch(() => undefined);
      }
      if ((await vrow.count()) === 0)
        throw new Error(
          '추가 모달에서 볼륨을 찾지 못했습니다. ' + (await dump(page, 'volume-add-modal-search')),
        );
      const box = vrow
        .locator('i.table-select, .scp-select, input[type=radio], input[type=checkbox]')
        .first();
      if (await box.count()) await box.click();
      else await vrow.click();
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.volume, vars.volume!, {
        status: /In[\s-]?Use|Attached/i,
        timeoutMs: 300_000,
        intervalMs: 10_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), stepCtx(5));
    });
  });
});
