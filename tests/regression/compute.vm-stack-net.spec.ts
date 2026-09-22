// 직접 작성 (2026-09-22). 시나리오: scenarios/compute/vm-stack-net.yaml.
// 콘솔 사실: docs/service-facts/compute-vm-stack.md, docs/service-facts/networking-sg-publicip.md, src/console/ui.ts 머리말.
import type { Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  isChecked,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  setCheckbox,
  submitForm,
  topButton,
  visibleModal,
  waitForRow,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/compute/vm-stack-net.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);

const ROUTES = {
  keypair: '#/virtualserver/keypair/list',
  sg: '#/securitygroup/securitygroup/list',
  vpc: '#/vpc/vpc/list',
  igw: '#/vpc/internet-gateway/list',
  subnet: '#/vpc/subnet/list',
  pip: '#/vpc/public-ip/list',
  vm: '#/virtualserver/virtualserver/list',
};

const log = (line: string) => console.log(line);
const stepCtx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

const VISIBLE_BUTTONS =
  "[...document.querySelectorAll('button,[role=tab],[role=button]')].filter(b=>b.checkVisibility()&&!b.closest('header')).map(b=>b.tagName.toLowerCase()+(b.getAttribute('role')?'['+b.getAttribute('role')+']':'')+':'+b.innerText.trim().slice(0,30)+(b.getAttribute('aria-disabled')==='true'?'(dis)':''))";

/** 낯선 화면에서 막혔을 때 스크린샷과 보이는 버튼·탭을 남긴다 (다음 반복에서 spec 을 다듬는 근거). */
async function dump(page: Page, label: string): Promise<string> {
  const file = test.info().outputPath(`dump-${label}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  const controls = (await page.evaluate(VISIBLE_BUTTONS).catch(() => [])) as string[];
  const text = `${label}: url=${page.url()} controls=${JSON.stringify(controls.slice(0, 60))} screenshot=${file}`;
  log(text);
  return text;
}

/** 정리 판정 전에 목록을 새로 고친다: "해지가 성공하였습니다. …명: <이름>" 토스트에 이름이 남아 not_text 판정이 어긋나는 것을 막는다. */
async function refreshedExpect(
  page: Page,
  exp: ReturnType<typeof resolveExpectation>,
  ctx: ReturnType<typeof stepCtx>,
): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await settleConsole(page, { appearGraceMs: 800 });
  await expectStep(page, exp, ctx);
}

/** Public IP 목록에서 IP 주소 목록을 읽는다 (행 첫 칸). */
async function publicIps(page: Page): Promise<string[]> {
  await gotoRoute(page, ROUTES.pip);
  const rows = await page.locator('tr.scp-body-row').allInnerTexts();
  return rows.map((r) => r.trim().split(/\s+/)[0]!).filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack', '@network'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 90 * 60_000 });
  /** 이 실행에서 예약한 Public IP 주소. teardown 이 반납한다. */
  let publicIp: string | null = null;

  test.afterEach('정리 (서버 → Public IP → IGW → Subnet → VPC → SG)', async ({ page }) => {
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

    // 서버를 먼저 해지하면 포트·static NAT 가 함께 사라져 Public IP 가 Reserved 로 돌아온다 (API 사실: NAT 해제 → IP 상태 복귀 후 삭제).
    await attempt('서버 해지', async () => {
      await gotoRoute(page, ROUTES.vm);
      if ((await row(page, vars.vm!).count()) === 0) return;
      await test.step('teardown[0] 서버 해지', async () => {
        await selectRow(page, vars.vm!);
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지하시겠습니까/);
        await waitForRow(page, ROUTES.vm, vars.vm!, {
          gone: true,
          timeoutMs: 600_000,
          intervalMs: 15_000,
          log,
        });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[0]!.expect, vars), stepCtx(0));
      });
    });

    await attempt('Public IP 반납', async () => {
      if (!publicIp) return;
      await gotoRoute(page, ROUTES.pip);
      if ((await row(page, publicIp).count()) === 0) return;
      await test.step('teardown[1] Public IP 반납', async () => {
        // 연결이 남아 있으면(ATTACHED) 반납이 400 으로 막힌다 → Reserved 로 돌아올 때까지 기다린다.
        await waitForRow(page, ROUTES.pip, publicIp!, {
          status: /Reserved/i,
          timeoutMs: 300_000,
          intervalMs: 15_000,
          log,
        });
        await row(page, publicIp!).getByRole('button', { name: '반납', exact: true }).click();
        await confirmModal(page, /반납하시겠습니까/);
        await waitForRow(page, ROUTES.pip, publicIp!, {
          gone: true,
          timeoutMs: 180_000,
          intervalMs: 10_000,
          log,
        });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[1]!.expect, vars), stepCtx(1));
      });
    });

    await attempt('IGW 삭제', async () => {
      await gotoRoute(page, ROUTES.igw);
      if ((await row(page, vars.vpc!).count()) === 0) return;
      await test.step('teardown[2] Internet Gateway 삭제', async () => {
        await row(page, vars.vpc!).getByRole('button', { name: '삭제', exact: true }).click();
        await confirmModal(page, /삭제하시겠습니까/, '확인', { agree: true });
        await waitForRow(page, ROUTES.igw, vars.vpc!, {
          gone: true,
          timeoutMs: 600_000,
          intervalMs: 15_000,
          log,
        });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[2]!.expect, vars), stepCtx(2));
      });
    });

    await attempt('Subnet 삭제', async () => {
      await gotoRoute(page, ROUTES.subnet);
      if ((await row(page, vars.subnet!).count()) === 0) return;
      await test.step('teardown[3] Subnet 삭제', async () => {
        await selectRow(page, vars.subnet!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /삭제하시겠습니까/);
        await waitForRow(page, ROUTES.subnet, vars.subnet!, {
          gone: true,
          timeoutMs: 1_200_000,
          intervalMs: 20_000,
          log,
        });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[3]!.expect, vars), stepCtx(3));
      });
    });

    await attempt('VPC 해지', async () => {
      await gotoRoute(page, ROUTES.vpc);
      if ((await row(page, vars.vpc!).count()) === 0) return;
      await test.step('teardown[4] VPC 해지', async () => {
        await row(page, vars.vpc!).getByRole('button', { name: '서비스 해지', exact: true }).click();
        await confirmModal(page, /해지하시겠습니까/);
        await waitForRow(page, ROUTES.vpc, vars.vpc!, { gone: true, timeoutMs: 180_000, log });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[4]!.expect, vars), stepCtx(4));
      });
    });

    await attempt('SG 해지', async () => {
      await gotoRoute(page, ROUTES.sg);
      if ((await row(page, vars.sg!).count()) === 0) return;
      await test.step('teardown[5] Security Group 해지', async () => {
        // 목록에는 선택·삭제가 없다: 이름 클릭 → 상세 → "서비스 해지"
        await row(page, vars.sg!).getByText(vars.sg!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지하시겠습니까/);
        await waitForRow(page, ROUTES.sg, vars.sg!, { gone: true, timeoutMs: 60_000, log });
        await refreshedExpect(page, resolveExpectation(scenario.teardown[5]!.expect, vars), stepCtx(5));
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

    await test.step(`steps[1] Security Group ${vars.sg} 생성`, async () => {
      await openCreateForm(page, ROUTES.sg, '서비스 생성');
      await fillField(page, 'Security Group명', vars.sg!);
      await setCheckbox(page, '로그 저장 여부', false); // 기본 켜짐. 로그 저장소가 없으면 생성이 막힌다
      await submitForm(page, '생성');
      await confirmModal(page, /진행하시겠습니까/);
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.sg, vars.sg!, { timeoutMs: 60_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), stepCtx(1));
    });

    await test.step(`steps[2] VPC ${vars.vpc} 생성`, async () => {
      await openCreateForm(page, ROUTES.vpc, '서비스 생성');
      await fillField(page, 'VPC명', vars.vpc!);
      await fillField(page, 'IP 대역', vars.vpc_cidr!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.vpc, vars.vpc!, { status: /Active/, timeoutMs: 180_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), stepCtx(2));
    });

    await test.step('steps[3] Internet Gateway 생성', async () => {
      await openCreateForm(page, ROUTES.igw, 'Internet Gateway 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, '구분', 'Internet Gateway');
      await setCheckbox(page, 'Firewall 사용', false); // 파생 방화벽이 생기면 IGW/VPC 삭제가 막힐 수 있다
      await setCheckbox(page, 'Firewall 로그 저장 여부', false); // 켜진 채면 로그 저장소가 없어 생성 실패
      await submitForm(page, '생성');
      await confirmModal(page, /선택하지 않았습니다/, '확인', { agree: true }); // 경고 모달: 동의 체크 필요
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.igw, vars.vpc!, {
        status: /Active/,
        timeoutMs: 300_000,
        intervalMs: 10_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), stepCtx(3));
    });

    await test.step(`steps[4] Subnet ${vars.subnet} 생성`, async () => {
      await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet 유형', 'Public');
      await pickOption(page, 'Subnet 구분', /primary/i);
      await fillField(page, 'Subnet명', vars.subnet!);
      await fillField(page, 'IP 대역', vars.subnet_cidr!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성하시겠습니까/);
      await waitForRow(page, ROUTES.subnet, vars.subnet!, {
        status: /Active/,
        timeoutMs: 900_000,
        intervalMs: 15_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), stepCtx(4));
    });

    await test.step('steps[5] Public IP 예약', async () => {
      const before = new Set(await publicIps(page));
      await openCreateForm(page, ROUTES.pip, 'Public IP 예약');
      await pickOption(page, '구분', 'Internet Gateway');
      await pickOption(page, 'Availability Zone', 'kr-west1-b');
      await submitForm(page, '생성');
      await confirmModal(page, /예약하시겠습니까/);
      // 목록은 예약 직후 몇 초 동안 비어 보인다 → 새 IP 가 나타날 때까지 새로 고치며 기다린다.
      let added: string[] = [];
      for (const start = Date.now(); Date.now() - start < 90_000;) {
        added = (await publicIps(page)).filter((ip) => !before.has(ip));
        if (added.length) break;
        await page.waitForTimeout(5_000);
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await settleConsole(page, { appearGraceMs: 800 });
      }
      if (added.length !== 1)
        throw new Error(`예약된 Public IP 를 특정하지 못했습니다: ${JSON.stringify(added)}`);
      publicIp = added[0]!;
      log(`  예약된 Public IP: ${publicIp}`);
      await waitForRow(page, ROUTES.pip, publicIp, { status: /Reserved/i, timeoutMs: 120_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), stepCtx(5));
    });

    await test.step(`steps[6] Virtual Server ${vars.vm} 생성 (SG ${vars.sg})`, async () => {
      await openCreateForm(page, ROUTES.vm, '서비스 생성');
      await page.getByText('Ubuntu', { exact: true }).first().click();
      await pickOption(page, '서버 타입', 'Standard-1');
      await pickOption(page, '서버 타입', /^s1v1m2\b/, { nth: 1 });
      await pickOption(page, '기본 OS', 'SSD');
      await fillField(page, '서버명', vars.vm!);
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet명', vars.subnet!);
      // Security Group "선택" 모달: 검색 → 행 체크 → 확인 (최대 5개)
      await page
        .locator('button:visible')
        .filter({ hasText: /^선택$/ })
        .first()
        .click();
      const sgModal = visibleModal(page);
      await sgModal.waitFor({ timeout: 10_000 });
      const search = sgModal.locator('input:visible').first();
      if (await search.count()) {
        await search.fill(vars.sg!);
        await search.press('Enter');
        await page.waitForTimeout(1_000);
      }
      const sgRow = sgModal.locator('tr').filter({ hasText: vars.sg! }).first();
      if ((await sgRow.count()) === 0) throw new Error(await dump(page, 'sg-modal'));
      const box = sgRow.locator('i.table-select, .scp-select, input[type=checkbox]').first();
      if (await box.count()) await box.click();
      else await sgRow.click();
      await sgModal.getByRole('button', { name: '확인', exact: true }).click();
      await sgModal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
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
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), stepCtx(6));
    });

    await test.step(`steps[7] 서버 ${vars.vm} 에 Public IP ${publicIp} 연결`, async () => {
      // 서버 상세로 이동 (목록의 이름 링크)
      await gotoRoute(page, ROUTES.vm);
      await row(page, vars.vm!).getByText(vars.vm!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.waitForTimeout(1_000);
      // 상세 정보 탭의 "네트워크" 섹션: VPC명 / 일반 Subnet명 / IP / Public NAT IP ✎ / Private NAT IP ✎ / Security Group명 ✎ (2026-09-22 덤프).
      // Public IP 연결 = "Public NAT IP" 라벨 옆 편집 아이콘 → 모달에서 예약 IP 선택 → 확인.
      const natLabel = page.getByText('Public NAT IP', { exact: true }).first();
      await natLabel.waitFor({ timeout: 10_000 });
      const editIcon = natLabel.locator('xpath=following::*[self::i or self::svg or self::button][1]');
      if ((await editIcon.count()) === 0)
        throw new Error(
          'Public NAT IP 편집 아이콘을 찾지 못했습니다. ' + (await dump(page, 'vm-detail-no-nat-edit')),
        );
      await editIcon.click();
      const modal = visibleModal(page);
      await modal.waitFor({ timeout: 10_000 });
      log(`  연결 모달: ${(await modal.innerText()).replace(/\s+/g, ' ').slice(0, 400)}`);
      log(
        `  연결 모달 컨트롤: dropdowns=${await modal.locator('.scp-dropdown').count()} rows=${await modal.locator('tr').count()} radios=${await modal.locator('input[type=radio], .scp-radio').count()} buttons=${JSON.stringify(await modal.locator('button').allInnerTexts())}`,
      );
      await page.screenshot({ path: test.info().outputPath('dump-nat-modal.png') }).catch(() => undefined);
      // "Public NAT IP 수정" 모달 (2026-09-22 덤프): "Public NAT 사용" 체크박스를 켜야 IP 드롭다운이 나타난다.
      // 안내: "Public NAT IP는 설정 후 수정이 불가능 하며, IP 변경 필요시 설정 해제 후 재설정이 필요합니다."
      const useBox = modal.locator('.scp-select:visible').first();
      if ((await useBox.count()) === 0)
        throw new Error(
          '"Public NAT 사용" 체크박스를 찾지 못했습니다. ' + (await dump(page, 'nat-modal-no-checkbox')),
        );
      if (!(await isChecked(useBox))) await useBox.click();
      const dd = modal.locator('.scp-dropdown:visible').first();
      await dd.waitFor({ timeout: 5_000 }).catch(() => undefined);
      if ((await dd.count()) === 0)
        throw new Error('체크 후에도 IP 드롭다운이 없습니다. ' + (await dump(page, 'nat-modal-no-dropdown')));
      await dd.click();
      const menu = page.locator('.scp-menu:visible').last();
      await menu.waitFor({ timeout: 5_000 });
      const item = menu.locator('.scp-menu-item').filter({ hasText: publicIp! }).first();
      if ((await item.count()) === 0) {
        const seen = (await menu.locator('.scp-menu-item').allInnerTexts()).map((s) =>
          s.replace(/\s+/g, ' ').trim(),
        );
        throw new Error(
          `드롭다운에 예약한 IP ${publicIp} 가 없습니다. 보이는 항목: ${JSON.stringify(seen)} ` +
            (await dump(page, 'nat-modal-dropdown')),
        );
      }
      await item.click();
      await menu.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      // Public IP 목록에서 연결 리소스명 = 서버명 확인
      await waitForRow(page, ROUTES.pip, vars.vm!, { timeoutMs: 300_000, intervalMs: 10_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[7]!.expect, vars), stepCtx(7));
    });
  });
});
