// 직접 작성 (2026-09-21). 시나리오: scenarios/compute/vm-stack.yaml.
// 콘솔 화면 사실은 src/console/ui.ts 머리말과 docs/HANDOFF.md 9절 참조.
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  openCreateForm,
  pickOption,
  row,
  selectRow,
  submitForm,
  topButton,
  waitForRow,
  below,
  terminateVpc,
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

  test.afterEach('정리 (역순: 서버 → Subnet → VPC → Keypair)', async ({ page }) => {
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

    await attempt('서버 해지', async () => {
      await gotoRoute(page, ROUTES.vm);
      if ((await row(page, vars.vm!).count()) === 0) return;
      await test.step('teardown[0] 서버 해지', async () => {
        // Virtual Server 목록은 행에 버튼이 없다. 행 선택 → 상단 "서비스 해지" → "Virtual Server 1대를 해지하시겠습니까?" → 확인. 소멸까지 ≈40초 실측.
        await selectRow(page, vars.vm!);
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지하시겠습니까/);
        await waitForRow(page, ROUTES.vm, vars.vm!, {
          gone: true,
          timeoutMs: 600_000,
          intervalMs: 15_000,
          log,
        });
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
  });
});
