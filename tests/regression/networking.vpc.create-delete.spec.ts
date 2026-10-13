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
import { editDescriptionRoundTrip, logDetail, openDetail, probeEdits } from '../../src/console/detail-edit';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { visibleText } from '../../src/console/frames';
import { settleConsole } from '../../src/console/overlays';
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
  });
});
