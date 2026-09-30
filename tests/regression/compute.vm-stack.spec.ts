// 직접 작성 (2026-09-21). 시나리오: scenarios/compute/vm-stack.yaml.
// 콘솔 화면 사실은 src/console/ui.ts 머리말과 docs/HANDOFF.md 9절 참조.
import { expect, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  visibleModal,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  waitForRow,
  below,
  terminateVpc,
  terminateServer,
} from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/compute/vm-stack.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const vars = scenarioVars(scenario);

const ROUTES = {
  keypair: '#/virtualserver/keypair/list',
  vpc: '#/vpc/vpc/list',
  subnet: '#/vpc/subnet/list',
  vm: '#/virtualserver/virtualserver/list',
  image: '#/virtualserver/image/list',
};

const log = (line: string) => console.log(line);

function stepCtx(step: number) {
  return { consoleTitle: CONSOLE_CHECKS, scenario: scenario.id, step, testInfo: test.info() };
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@stack'] }, () => {
  // 실측(2026-09-21): 서브넷 ACTIVE ≈3.5분, 서버 Active ≈1분, 서버 해지 소멸 ≈40초, 서브넷 소멸 ≈6분(최대 20분 대기). afterEach 정리까지 한 테스트 타임아웃에 포함된다.
  test.describe.configure({ mode: 'serial', timeout: 60 * 60_000 });
  /** steps[1] 에서 Keypair 가 이미 있었으면 true. 공유 Keypair 는 정리 때 지우지 않는다. */
  let keypairPreexisted = false;

  test.afterEach('정리 (역순: Image → 서버 → Subnet → VPC → Keypair)', async ({ page }) => {
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

    await attempt('Image 삭제', async () => {
      // steps[6] 이 도중에 실패했을 때만 남는다 (정상이면 steps[6] 안에서 지운다)
      await gotoRoute(page, ROUTES.image);
      if ((await row(page, vars.image!).count()) === 0) return;
      await test.step('teardown[4] Image 삭제', async () => {
        await waitForRow(page, ROUTES.image, vars.image!, { status: /Active|Error/i, timeoutMs: 900_000, intervalMs: 15_000, log });
        await deleteImage(page);
        await expectStep(page, resolveExpectation(scenario.teardown[4]!.expect, vars), stepCtx(4));
      });
    });

    await attempt('서버 해지', async () => {
      await gotoRoute(page, ROUTES.vm);
      if ((await row(page, vars.vm!).count()) === 0) return;
      await test.step('teardown[0] 서버 해지', async () => {
        // Virtual Server 목록은 행에 버튼이 없다. 행 선택 → 상단 "서비스 해지" → "Virtual Server 1대를 해지하시겠습니까?" → 확인. 소멸까지 ≈40초 실측.
        await terminateServer(page, ROUTES.vm, vars.vm!, log);
        await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), stepCtx(0));
      });
    });

    await attempt('Subnet 삭제', async () => {
      await gotoRoute(page, ROUTES.subnet);
      if ((await row(page, vars.subnet!).count()) === 0) return;
      await test.step('teardown[1] Subnet 삭제', async () => {
        // "Subnet을 삭제하시겠습니까? 규모에 따라 수십 분 걸릴 수 있습니다." 실측: 서버를 담았던 서브넷은 Deleting 이 5분을 넘긴다.
        await selectRow(page, vars.subnet!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /삭제하시겠습니까/);
        await waitForRow(page, ROUTES.subnet, vars.subnet!, {
          gone: true,
          timeoutMs: 1_200_000,
          intervalMs: 20_000,
          log,
        });
        await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), stepCtx(1));
      });
    });

    await attempt('VPC 해지', async () => {
      await gotoRoute(page, ROUTES.vpc);
      if ((await row(page, vars.vpc!).count()) === 0) return;
      await test.step('teardown[2] VPC 해지', async () => {
        await terminateVpc(page, ROUTES.vpc, vars.vpc!, log);
        await expectStep(page, resolveExpectation(scenario.teardown[2]!.expect, vars), stepCtx(2));
      });
    });

    await attempt('Keypair 삭제', async () => {
      if (keypairPreexisted) return; // 공유 Keypair 는 남긴다
      await gotoRoute(page, ROUTES.keypair);
      if ((await row(page, vars.keypair!).count()) === 0) return;
      await test.step('teardown[3] Keypair 삭제', async () => {
        await selectRow(page, vars.keypair!);
        await topButton(page, '삭제').click();
        await confirmModal(page, /삭제/);
        await waitForRow(page, ROUTES.keypair, vars.keypair!, { gone: true, timeoutMs: 60_000, log });
        await expectStep(page, resolveExpectation(scenario.teardown[3]!.expect, vars), stepCtx(3));
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

    await test.step('steps[0] Keypair 목록으로 이동', async () => {
      await gotoRoute(page, ROUTES.keypair);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), stepCtx(0));
    });

    await test.step(`steps[1] Keypair ${vars.keypair} 준비 (있으면 재사용, 없으면 생성)`, async () => {
      await gotoRoute(page, ROUTES.keypair);
      if ((await row(page, vars.keypair!).count()) > 0) {
        keypairPreexisted = true;
        log(`  Keypair ${vars.keypair} 가 이미 있어 재사용한다 (정리 때 지우지 않음)`);
      } else {
        // Keypair 생성은 .pem 다운로드를 동반하고, CDP 로 붙은 Edge 가 그 순간 죽는 일이 잦다 (docs/service-facts/compute-vm-stack.md).
        // 그래서 평소엔 공유 Keypair 를 재사용하고, 여기서는 다운로드 이벤트를 구독하지 않으며(구독한 경우에만 죽었다) 내부 페이지를 즉시 닫는다.
        // 그래도 죽으면 connectLiveBrowser 의 자동 재기동이 다음 실행을 살린다.
        await openCreateForm(page, ROUTES.keypair, 'Keypair 생성');
        await fillField(page, 'Keypair명', vars.keypair!);
        await submitForm(page, '생성');
        await confirmModal(page, /생성하시겠습니까/);
        await page.waitForTimeout(3_000);
        for (const p of page.context().pages())
          if (p.url().startsWith('edge://')) await p.close().catch(() => undefined);
      }
      await waitForRow(page, ROUTES.keypair, vars.keypair!, { timeoutMs: 60_000, log });
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

    await test.step(`steps[3] Subnet ${vars.subnet} 생성`, async () => {
      await openCreateForm(page, ROUTES.subnet, 'Subnet 생성');
      await pickOption(page, 'VPC명', vars.vpc!);
      await pickOption(page, 'Subnet 유형', 'Public');
      await pickOption(page, 'Subnet 구분', /primary/i);
      await fillField(page, 'Subnet명', vars.subnet!);
      await fillField(page, 'IP 대역', vars.subnet_cidr!);
      // Gateway IP 는 필수. CIDR 입력 뒤 기본값(첫 IP)이 채워지지 않으면 직접 넣는다.
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
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), stepCtx(3));
    });

    await test.step(`steps[4] Virtual Server ${vars.vm} 생성`, async () => {
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
      // 요금 안내 등 추가 모달이 이어질 수 있다.
      for (let i = 0; i < 3 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTES.vm, vars.vm!, {
        status: /Running|Active/i,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), stepCtx(4));
    });

    await test.step(`steps[5] 서버 ${vars.vm} 정지 → 시작`, async () => {
      // 목록에는 행 버튼이 없다 → 이름 링크로 상세에 들어가 상단 버튼을 쓴다. 라벨은 실측 로그로 확인한다.
      const openDetail = async () => {
        await gotoRoute(page, ROUTES.vm);
        await row(page, vars.vm!).getByText(vars.vm!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
      };
      const buttons = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('button')]
            .filter((b) => b.checkVisibility() && !b.closest('header'))
            .map(
              (b) =>
                b.innerText.trim().replace(/\s+/g, ' ') +
                (b.getAttribute('aria-disabled') === 'true' ? '(dis)' : ''),
            )
            .filter(Boolean),
        );
      const press = async (re: RegExp) => {
        // hasText 의 ^…$ 는 버튼 안 공백·아이콘 때문에 빗나간다 → 접근성 이름(공백 정규화)으로 잡는다
        const b = page.getByRole('button', { name: re }).first();
        if (!(await b.count()))
          throw new Error(`상세에 ${re} 버튼이 없습니다. 보이는 버튼: ${JSON.stringify(await buttons())}`);
        await b.click();
        await confirmModal(page, /하시겠습니까/, '확인', { agree: true });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      };
      await openDetail();
      log(`  서버 상세 버튼: ${JSON.stringify(await buttons())}`);
      await press(/^(정지|중지|Stop)$/i);
      await waitForRow(page, ROUTES.vm, vars.vm!, {
        status: /Stopped|Shutoff|정지/i,
        timeoutMs: 300_000,
        intervalMs: 15_000,
        log,
      });
      await openDetail();
      await press(/^(시작|Start)$/i);
      await waitForRow(page, ROUTES.vm, vars.vm!, {
        status: /Running|Active/i,
        timeoutMs: 300_000,
        intervalMs: 15_000,
        log,
      });
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), stepCtx(5));
    });

    // 2026-09-30 추가 (에이전트 C, API createvirtualservercustomimage·updateimage·deleteimage / createserverinterface·deleteserverinterface / createvirtualserverdump)
    await test.step(`steps[6] 서버 ${vars.vm} 로 커스텀 Image ${vars.image} 생성 → Visibility Shared → 삭제`, async () => {
      await openServerDetail(page);
      await page.getByRole('button', { name: 'Image 생성', exact: true }).click();
      await settleConsole(page, { appearGraceMs: 800 });
      // 폼(#/virtualserver/virtualserver/custom-image-request)은 Image명 하나. "Active 상태의 서버로 만든 Image 는 파일 시스템 무결성을 보장할 수 없다" 안내만 있다
      await fillField(page, 'Image명', vars.image!);
      await submitForm(page, '완료');
      await confirmModal(page, /Image를 생성하시겠습니까/);
      // 실측: Queued → Active ≈1~3분 (Ubuntu 16GB, Image 크기 1.7GB)
      await waitForRow(page, ROUTES.image, vars.image!, { status: /Active/, timeoutMs: 900_000, intervalMs: 15_000, log });
      await openImageDetail(page);
      // Visibility 수정(updateimage): 라벨 옆 연필 → 모달 Private/Shared → 확인 → "Visibility를 수정하시겠습니까?" → 확인.
      // Shared 가 되어야 "다른 Account로 공유"(createimagemember) 가 활성화되지만, 공유 대상 Account 가 없어 멤버 추가는 하지 않는다.
      await page.locator('.scp-form-group-label:visible').filter({ hasText: 'Visibility' }).locator('i.i-edit').first().click();
      const vis = visibleModal(page);
      await vis.waitFor({ timeout: 10_000 });
      await vis.getByRole('button', { name: 'Shared', exact: true }).click();
      await vis.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /Visibility를 수정하시겠습니까/);
      await expect
        .poll(
          async () => {
            await openImageDetail(page);
            return (await page.locator('body').innerText()).replace(/\s+/g, ' ').match(/Visibility (\w+)/)?.[1];
          },
          { message: 'Image Visibility 가 shared 로 바뀌어야 합니다', timeout: 120_000, intervals: [3_000, 10_000] },
        )
        .toMatch(/shared/i);
      await expect(page.getByRole('button', { name: '다른 Account로 공유' }).first()).toHaveAttribute('aria-disabled', 'false');
      await deleteImage(page);
      await expectStep(page, resolveExpectation(scenario.steps[6]!.expect, vars), stepCtx(6));
    });

    await test.step(`steps[7] 서버 ${vars.vm} 에 네트워크 포트(${vars.nic_ip}) 추가 → 삭제`, async () => {
      // 상세 "네트워크" 절: "신규 네트워크 포트로 추가" 모달(일반 Subnet명 드롭다운 기본 선택, IP 필수) → 확인 → "네트워크를 추가하시겠습니까?" → 확인.
      // 추가된 포트는 절 안의 회색 상자(.gray_box) 하나로 보이고, 상자 오른쪽 위 i.i-btn-del → "네트워크를 삭제하시겠습니까?" 로 뗀다.
      // Public NAT IP 연결(static NAT)은 compute.vm-stack-net 이 기본 포트로 이미 다룬다 → 여기서는 생략.
      await openServerDetail(page);
      await page.getByRole('button', { name: '신규 네트워크 포트로 추가', exact: true }).first().click();
      const add = visibleModal(page);
      await add.waitFor({ timeout: 10_000 });
      await fillStable(page, add.locator('input[type=text]:visible').first(), vars.nic_ip!, '추가 포트 IP');
      await add.getByRole('button', { name: '확인', exact: true }).click();
      await confirmModal(page, /네트워크를 추가하시겠습니까/);
      const nicBox = () => page.locator('.gray_box:visible').filter({ hasText: vars.nic_ip! });
      await expect
        .poll(
          async () => {
            await openServerDetail(page);
            return nicBox().count();
          },
          { message: `추가한 포트 ${vars.nic_ip} 가 상세에 보여야 합니다`, timeout: 300_000, intervals: [5_000, 10_000] },
        )
        .toBeGreaterThan(0);
      await gotoRoute(page, ROUTES.vm);
      await expect(row(page, vars.vm!).first()).toContainText(vars.nic_ip!);
      await openServerDetail(page);
      await nicBox().locator('i.i-btn-del').first().click();
      await confirmModal(page, /네트워크를 삭제하시겠습니까/);
      await expect
        .poll(
          async () => {
            await openServerDetail(page);
            return nicBox().count();
          },
          { message: `포트 ${vars.nic_ip} 가 사라져야 합니다`, timeout: 300_000, intervals: [5_000, 10_000] },
        )
        .toBe(0);
      await gotoRoute(page, ROUTES.vm);
      await expectStep(page, resolveExpectation(scenario.steps[7]!.expect, vars), stepCtx(7));
    });

    await test.step(`steps[8] 서버 ${vars.vm} Dump 생성`, async () => {
      // "Dump를 생성하시겠습니까? Dump 파일은 Virtual Server 안에 생성됩니다." — 파일 다운로드 없음. 결과는 토스트 "Dump 생성이 성공하였습니다. 서버명: …"
      await openServerDetail(page);
      await page.getByRole('button', { name: 'Dump 생성', exact: true }).click();
      await confirmModal(page, /Dump를 생성하시겠습니까/);
      await expect(page.getByText(/Dump 생성이 성공하였습니다/).first()).toBeVisible({ timeout: 30_000 });
      await waitForRow(page, ROUTES.vm, vars.vm!, { status: /Active/, timeoutMs: 300_000, intervalMs: 15_000, log });
      await expectStep(page, resolveExpectation(scenario.steps[8]!.expect, vars), stepCtx(8));
    });
  });

  async function openServerDetail(page: Page) {
    await gotoRoute(page, ROUTES.vm);
    await row(page, vars.vm!).getByText(vars.vm!, { exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page.getByRole('button', { name: 'Dump 생성', exact: true }).waitFor({ timeout: 30_000 });
  }

  async function openImageDetail(page: Page) {
    await gotoRoute(page, ROUTES.image);
    await row(page, vars.image!).getByText(vars.image!, { exact: true }).first().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page.getByRole('button', { name: 'Image 삭제', exact: true }).waitFor({ timeout: 30_000 });
  }

  /** 상세 "Image 삭제" → "Image명: … Image를 삭제하시겠습니까?" → 확인 → 목록에서 소멸(수 초) */
  async function deleteImage(page: Page) {
    await openImageDetail(page);
    await page.getByRole('button', { name: 'Image 삭제', exact: true }).click();
    await confirmModal(page, /Image를 삭제하시겠습니까/, '확인', { agree: true, resourceName: vars.image });
    await waitForRow(page, ROUTES.image, vars.image!, { gone: true, timeoutMs: 300_000, intervalMs: 10_000, log });
  }
});
