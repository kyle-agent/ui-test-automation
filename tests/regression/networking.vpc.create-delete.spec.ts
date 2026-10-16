// 초안: scripts/trace-to-spec.ts ← recordings/networking.vpc.create-delete/trace.json (2026-09-21). 이후 사람이 다듬음.
// 시나리오: scenarios/networking/vpc-create-delete.yaml.
//
// 콘솔 화면 사실 (2026-09-21 프로브):
//  - 목록의 생성 버튼 라벨은 "서비스 생성", 삭제 버튼 라벨은 "서비스 해지" (행 끝 버튼은 항상 활성, 상단 버튼은 행 선택 후 활성).
//  - 생성 폼은 label/aria 연결이 없다 (.scp-form-group-label "VPC명" 아래에 input). 라벨 바로 아래의 컨트롤을 :below 로 잡는다.
//  - "생성" 은 폼이 유효해질 때까지 aria-disabled. 누르면 "VPC를 생성하시겠습니까?" 모달 → "확인".
//  - 행의 "서비스 해지" → "VPC를 해지하시겠습니까?" 모달 → "확인" → 수 초 안에 목록에서 사라진다.
import { expect, test } from '../../src/fixtures/test';
import { logWriteRequests } from '../../src/console/api-log';
import {
  editDescriptionRoundTrip,
  logDetail,
  openDetail,
  probeEdits,
  saveModal,
} from '../../src/console/detail-edit';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { visibleText } from '../../src/console/frames';
import { settleConsole } from '../../src/console/overlays';
import { confirmModal, fillStable, row, visibleModal, waitForRow } from '../../src/console/ui';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/networking/vpc-create-delete.yaml');
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined; // 픽스처 실행 시에는 콘솔 제목/SSO 검사를 끈다
/** 실행마다 고유한 리소스 이름. teardown 과 공유한다. */
const vars = scenarioVars(scenario);

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.afterEach('정리', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await test.step('teardown[0] VPC 목록 화면으로 이동한다', async () => {
      await gotoRoute(page, '#/vpc/vpc/list');
      await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 0,
        testInfo: test.info(),
      });
    });
    // 생성 전에 실패했으면 지울 것이 없다.
    if ((await visibleText(page, vars.name!, 3_000)) === null) return;
    await test.step('teardown[1] 행의 서비스 해지 버튼을 누르고 확인 창에서 확인을 눌러 해지한다', async () => {
      const row = page.locator('tr.scp-body-row').filter({ hasText: vars.name! });
      await row.getByRole('button', { name: '서비스 해지', exact: true }).click();
      const modal = page.locator('.scp-modal').filter({ visible: true }).last();
      await modal.getByText('해지하시겠습니까').waitFor();
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await expectStep(page, resolveExpectation(scenario.teardown[1]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 1,
        testInfo: test.info(),
      });
    });
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );
    await test.step('steps[0] VPC 목록 화면으로 이동한다', async () => {
      await gotoRoute(page, '#/vpc/vpc/list');
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 0,
        testInfo: test.info(),
      });
    });
    await test.step('steps[1] 서비스 생성 버튼을 눌러 생성 화면을 연다', async () => {
      await page.getByRole('button', { name: '서비스 생성', exact: true }).first().click();
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 1,
        testInfo: test.info(),
      });
    });
    await test.step('steps[2] VPC명과 IP 대역을 입력하고 생성 → 확인', async () => {
      // 생성 화면은 클릭 후 0.4초쯤 뒤에 섹션 로더(.loader-overlay)가 붙고 폼이 inert 가 된다. 그 전에 fill 하면
      // 로딩이 끝나며 폼이 초기화되어 값이 사라진다 (2026-09-21 재생 실패). 로더가 걷힌 뒤 입력하고 값이 남았는지 확인한다.
      await settleConsole(page, { appearGraceMs: 800 });
      const name = page.locator('input:below(:text-is("VPC명"))').first();
      const cidr = page.locator('input:below(:text-is("IP 대역"))').first();
      // 검증(→ "생성" 활성화)은 change/blur 에서 돈다. fill 만으로는 버튼이 살아나지 않아 Tab 으로 포커스를 뺀다.
      await name.fill(vars.name!);
      await name.press('Tab');
      await cidr.fill(vars.cidr!);
      await cidr.press('Tab');
      await expect(name).toHaveValue(vars.name!);
      await expect(cidr).toHaveValue(vars.cidr!);
      await page.getByRole('button', { name: '생성', exact: true }).click(); // 폼이 유효해질 때까지 aria-disabled
      const modal = page.locator('.scp-modal').filter({ visible: true }).last();
      await modal.getByText('생성하시겠습니까').waitFor();
      await modal.getByRole('button', { name: '확인', exact: true }).click();
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 2,
        testInfo: test.info(),
      });
    });
    // 동작(L3, 2026-10-13 6E): 상세 설명 수정 → 반영 → 되돌림 (API setvpc). 상세 버튼·연필 라벨을 로그로 남긴다.
    await test.step('steps[3] VPC 상세 설명 수정 → 반영 → 되돌림 (L3)', async () => {
      const log = (line: string) => console.log(line);
      await logWriteRequests(page, log);
      await openDetail(page, '#/vpc/vpc/list', vars.name!);
      await logDetail(page, log, 'VPC 상세');
      await probeEdits(page, log, 'VPC');
      await editDescriptionRoundTrip(page, `scp-console-tests ${vars.run_id} edited`, log);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 3,
        testInfo: test.info(),
      });
    });
    // 동작(L3, 2026-10-16 에이전트 A, API addvpccidr): 상세 "IP 대역 관리" 탭 → "IP 대역 추가" 모달(입력란 1개) → 확인 → 표에 행.
    await test.step(`steps[4] VPC 상세 IP 대역 관리 탭에서 IP 대역 ${vars.cidr2} 추가 (L3)`, async () => {
      const log = (line: string) => console.log(line);
      await logWriteRequests(page, log);
      await openDetail(page, '#/vpc/vpc/list', vars.name!);
      await page
        .locator('div.tabs-header')
        .filter({ hasText: /^IP 대역 관리/ })
        .first()
        .click();
      await settleConsole(page, { appearGraceMs: 800 });
      await page.getByRole('button', { name: 'IP 대역 추가', exact: true }).click();
      const modal = visibleModal(page);
      await modal.getByText('IP 대역 추가').first().waitFor({ timeout: 10_000 });
      await fillStable(page, modal.locator('input[type=text]:visible').first(), vars.cidr2!, 'IP 대역');
      await saveModal(page, log);
      const route = '#' + page.url().split('#')[1]!;
      await waitForRow(page, route, vars.cidr2!, { timeoutMs: 120_000, intervalMs: 5_000, log });
      log(
        `  IP 대역 탭: ${(
          await page
            .locator('div.tabs-header')
            .filter({ hasText: /^IP 대역 관리/ })
            .first()
            .innerText()
        ).trim()}`,
      );
      log(
        `  IP 대역 행: ${JSON.stringify((await page.locator('tr.scp-body-row:visible').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ')))}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 4,
        testInfo: test.info(),
      });
    });
    // 추가한 IP 대역 삭제: 2026-10-16 프로브(기본 대역 1개)에서는 행 버튼·선택 아이콘이 없었다. 추가된 대역에만 생길 수 있어 있으면 쓰고, 없으면 로그만 남긴다(VPC 해지가 함께 지운다).
    await test.step(`steps[5] 추가한 IP 대역 ${vars.cidr2} 삭제 (진입점이 있을 때만)`, async () => {
      const log = (line: string) => console.log(line);
      const r = row(page, vars.cidr2!).first();
      const rowButtons = await r
        .locator('button, i[class*="i-"]')
        .evaluateAll((els) =>
          els.map(
            (e) =>
              (e as HTMLElement).innerText.trim() ||
              (e.className.toString().match(/i-[a-z-]+|table-select/)?.[0] ?? ''),
          ),
        );
      const buttons = (await page.locator('button:visible:not(tr button)').allInnerTexts())
        .map((s) => s.trim())
        .filter(Boolean);
      log(`  IP 대역 행 버튼: ${JSON.stringify(rowButtons)} / 화면 버튼: ${JSON.stringify(buttons)}`);
      const route = '#' + page.url().split('#')[1]!;
      const rowDelete = r.getByRole('button', { name: /^(삭제|IP 대역 삭제)$/ });
      const top = page
        .locator('button:visible:not(tr button)')
        .filter({ hasText: /^(삭제|IP 대역 삭제)$/ })
        .first();
      if (await rowDelete.count()) {
        await rowDelete.first().click();
        await confirmModal(page, /하시겠습니까/, '확인', { agree: true });
        await waitForRow(page, route, vars.cidr2!, {
          gone: true,
          timeoutMs: 120_000,
          intervalMs: 5_000,
          log,
        });
        log('  IP 대역 삭제: 행 버튼으로 삭제 확인');
      } else if ((await r.locator('i.table-select').count()) && (await top.count())) {
        await r.locator('i.table-select').first().click();
        await top.click();
        await confirmModal(page, /하시겠습니까/, '확인', { agree: true });
        await waitForRow(page, route, vars.cidr2!, {
          gone: true,
          timeoutMs: 120_000,
          intervalMs: 5_000,
          log,
        });
        log('  IP 대역 삭제: 행 선택 → 상단 버튼으로 삭제 확인');
      } else {
        log('  IP 대역 삭제 진입점 없음 (콘솔에 IP 대역 삭제 동작이 없음) → 건너뜀, VPC 해지가 함께 지운다');
      }
      await expectStep(page, resolveExpectation(scenario.steps[5]!.expect, vars), {
        consoleTitle: CONSOLE_CHECKS,
        scenario: scenario.id,
        step: 5,
        testInfo: test.info(),
      });
    });
  });
});
