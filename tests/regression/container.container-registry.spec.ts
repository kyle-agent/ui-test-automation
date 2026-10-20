// 직접 작성 (2026-09-29). 시나리오: scenarios/container/container-registry.yaml.
// simple-crud 팩토리 대신 흐름을 직접 쓴다: 해지 뒤 Terminating 이 수 분 이어지는데(실측 2026-09-29 약 3~5분),
// 팩토리의 소멸 대기는 목록을 다시 읽는 순간(행 0개)을 소멸로 보고 넘어가 not_text 검사(2분)에서 실패했다.
// 2026-10-06 L3 동작 추가(steps[2]·[3]): 상세 "엔드포인트" 프라이빗 → 프라이빗&퍼블릭(Editing → Running) → 프라이빗(되돌림), 태그 추가 → 삭제.
// 2026-10-16 에이전트 B: steps[2] 프라이빗 엔드포인트 접근 제어 사용 → 미사용 → 사용(updateprivateacl, PUT …/private-acl), steps[3] 태그,
// steps[4] 엔드포인트 퍼블릭 켬 → 퍼블릭 접근 허용 IP 추가(updatepublicacl, PUT …/public-acl) → 프라이빗 되돌림(KI-001 로 현재 실패). 근거 docs/service-facts/container-registry.md.
// 여기서는 표가 다 그려진 뒤(행, 또는 빈 목록 안내 "서비스를 생성하세요." / "데이터가 없습니다")에 이름이 없을 때만 소멸로 본다.
import { expect, type Locator, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { expectStep, gotoRoute } from '../../src/console/expect';
import { detailValue, openLabelEdit, saveModal, waitDetailValue } from '../../src/console/detail-edit';
import { allBodyText } from '../../src/console/frames';
import { settleConsole } from '../../src/console/overlays';
import {
  confirmModal,
  dismissModalIfAny,
  fillField,
  fillStable,
  isChecked,
  openCreateForm,
  row,
  submitForm,
  topButton,
  waitForRow,
} from '../../src/console/ui';
import { addTag, removeTag } from '../../src/console/tags';
import { loadScenario, resolveExpectation, scenarioVars } from '../../src/scenario/schema';

const scenario = loadScenario('scenarios/container/container-registry.yaml');
const vars = scenarioVars(scenario);
const ROUTE = '#/scr/registry';
const READY = /Running|Active|Ready|Available/i;
const CONSOLE_CHECKS = process.env.CONSOLE_BASE_PATH === undefined;
const log = (line: string) => console.log(line);
const ctx = (step: number) => ({
  consoleTitle: CONSOLE_CHECKS,
  scenario: scenario.id,
  step,
  testInfo: test.info(),
});

/** 표가 다 그려진 상태에서 이름이 사라질 때까지 새로 고치며 기다린다 */
async function waitGone(page: Page, name: string, timeoutMs = 600_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
    await page
      .locator('tr.scp-body-row, :text("서비스를 생성하세요"), :text("데이터가 없습니다")')
      .first()
      .waitFor({ timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_000);
    const loaded =
      (await page.locator('tr.scp-body-row').count()) > 0 ||
      (await page.getByText(/서비스를 생성하세요|데이터가 없습니다/).count()) > 0;
    const text = await allBodyText(page);
    const elapsed = Math.round((Date.now() - start) / 1000);
    if (loaded && !text.includes(name)) return;
    log(
      `  [${elapsed}s] ${name} 소멸 대기… ${
        loaded
          ? (
              await row(page, name)
                .first()
                .innerText()
                .catch(() => '')
            )
              .replace(/\s+/g, ' ')
              .slice(0, 100)
          : '(표 로딩 중)'
      }`,
    );
    if (Date.now() - start > timeoutMs) throw new Error(`${name} 소멸 대기 ${timeoutMs / 1000}초 초과`);
    await page.waitForTimeout(15_000);
  }
}

/**
 * 상세 "엔드포인트" 연필 → 모달 버튼(프라이빗 / 프라이빗&퍼블릭) → 확인. 저장하면 목록 상태가 Editing(≈1~2분) → Running 으로 돌아오고
 * 상세 값이 바뀐다(2026-10-06 실측). 퍼블릭을 켜도 퍼블릭 엔드포인트 접근 제어가 "사용"·허용 IP 0개라 외부에서 접근할 수 없다.
 */
async function setEndpoint(page: Page, name: string, mode: '프라이빗' | '프라이빗&퍼블릭'): Promise<void> {
  const modal = await openLabelEdit(page, '엔드포인트');
  await modal.getByRole('button', { name: mode, exact: true }).click();
  await saveModal(page, log);
  const detail = page.url();
  await waitForRow(page, ROUTE, name, { status: READY, timeoutMs: 600_000, intervalMs: 15_000, log });
  await page.goto(detail);
  await settleConsole(page, { appearGraceMs: 800 });
  const start = Date.now();
  for (;;) {
    const v = await detailValue(page, '엔드포인트');
    if (v === mode) break;
    if (Date.now() - start > 120_000)
      throw new Error(`엔드포인트가 ${mode} 로 바뀌지 않았습니다. 마지막: ${v}`);
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await settleConsole(page, { appearGraceMs: 800 });
  }
  log(`    엔드포인트 = ${mode}`);
}

const publicEndpointLabel = (page: Page) =>
  page.locator('.scp-form-group-label:visible').filter({ hasText: /^\s*퍼블릭 엔드포인트\s*$/ });

// 접근 제어 라벨은 안내 아이콘(i-info + svg)이 붙어 있어 textContent 가 라벨 글자만이 아니다 → ^…$ 가 아닌 부분 일치 정규식으로 찾는다
// (6D 2026-10-07 의 "연필이 열리지 않음" 은 anchored 라벨 검색이 빈 로케이터를 돌려준 것). detailValue/waitDetailValue 도 RegExp 를 그대로 쓴다.
// 라벨 글자 사이 공백이 일반 공백이 아니어서(2026-10-20 프로브: hasText 문자열은 맞고 /프라이빗 엔드포인트 접근 제어/ 는 0개) 단어 사이를 \s* 로 잇는다
const PRIVATE_ACL = /프라이빗\s*엔드포인트\s*접근\s*제어/;
const PUBLIC_ACL = /퍼블릭\s*엔드포인트\s*접근\s*제어/;
const PUBLIC_IP_LABEL = /퍼블릭\s*접근\s*허용\s*IP/;
const PUBLIC_IP = '192.0.2.10/32'; // 문서용 대역(RFC 5737)

/**
 * 접근 제어 수정 모달 저장: 모달 "확인" → 이어지는 알림("…사용을 해제하시겠습니까?"(사용 끔) / "수정한 정보를 저장하시겠습니까?") 의 "확인" → 모달이 모두 닫힐 때까지.
 * saveModal 은 알림이 수정 모달보다 DOM 앞에 떠서 수정 모달의 "확인" 만 되풀이 눌러 90초를 넘겼다(2026-10-20 1차) → 알림은 문구로 찍어 누른다.
 */
async function saveAclModal(page: Page, modal: Locator): Promise<void> {
  // "사용" 을 끄면 "확인" 이 aria-disabled 로 보이지만(2026-10-20 2차, 15초 대기 실패) 강제 클릭하면 "…해제하시겠습니까?" 알림이 뜬다(1차 실측) → confirmModal 과 같이 강제 클릭으로 보강
  const ok = modal.getByRole('button', { name: '확인', exact: true }).last();
  try {
    await ok.click({ timeout: 10_000 });
  } catch {
    await ok.click({ force: true });
  }
  const alert = page
    .locator('.scp-modal:visible')
    .filter({ hasText: /해제하시겠습니까|저장하시겠습니까|수정하시겠습니까/ });
  if (
    await alert
      .first()
      .waitFor({ timeout: 8_000 })
      .then(
        () => true,
        () => false,
      )
  ) {
    log(
      `    알림: ${(
        (await alert
          .first()
          .innerText()
          .catch(() => '')) || ''
      )
        .replace(/\s+/g, ' ')
        .slice(0, 120)}`,
    );
    await alert.first().getByRole('button', { name: '확인', exact: true }).click();
  }
  await expect(page.locator('.scp-modal:visible'), '접근 제어 수정 모달이 닫혀야 합니다').toHaveCount(0, {
    timeout: 60_000,
  });
  await settleConsole(page, { appearGraceMs: 800 });
}

/** 접근 제어 라벨의 연필(i.i-edit)을 보이게 스크롤한 뒤 눌러 수정 모달을 연다 (안 열리면 강제 클릭) */
async function openAclEdit(page: Page, label: RegExp) {
  const edit = page
    .locator('.scp-form-group-label:visible')
    .filter({ hasText: label })
    .first()
    .locator('i.i-edit')
    .first();
  await edit.waitFor({ timeout: 15_000 });
  await edit.scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(500);
  const modal = page.locator('.scp-modal:visible').last();
  await edit.click({ timeout: 5_000 }).catch(() => undefined);
  if (
    !(await modal.waitFor({ timeout: 5_000 }).then(
      () => true,
      () => false,
    ))
  ) {
    await edit.click({ force: true });
    await modal.waitFor({ timeout: 10_000 });
  }
  return modal;
}

test.describe(scenario.title, { tag: ['@regression', '@destructive', '@crud', '@light'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

  test.afterEach('정리', async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'phase', description: 'teardown' },
      );
    await gotoRoute(page, ROUTE);
    if ((await row(page, vars.name!).count()) === 0) return;
    await test.step(`teardown[0] ${vars.name} 해지`, async () => {
      if (!/Terminating/i.test(await row(page, vars.name!).first().innerText())) {
        await waitForRow(page, ROUTE, vars.name!, {
          status: READY,
          timeoutMs: 600_000,
          intervalMs: 15_000,
          log,
        });
        // 목록에는 해지 버튼이 없다 → 이름 링크로 상세에 들어가 상단 "서비스 해지"
        await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await topButton(page, '서비스 해지').click();
        await confirmModal(page, /해지|삭제/, '확인', { agree: true, resourceName: vars.name });
        for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
        await gotoRoute(page, ROUTE);
      }
      await waitGone(page, vars.name!);
      await expectStep(page, resolveExpectation(scenario.teardown[0]!.expect, vars), ctx(0));
    });
  });

  test(scenario.title, async ({ page }) => {
    test
      .info()
      .annotations.push(
        { type: 'scenario', description: scenario.id },
        { type: 'run_id', description: vars.run_id! },
      );
    await test.step(`steps[0] ${scenario.steps[0]!.goal}`, async () => {
      await gotoRoute(page, ROUTE);
      await expectStep(page, resolveExpectation(scenario.steps[0]!.expect, vars), ctx(0));
    });
    await test.step(`steps[1] ${vars.name} 생성`, async () => {
      await openCreateForm(page, ROUTE, '서비스 생성');
      await fillField(page, '레지스트리명', vars.name!);
      await submitForm(page, '생성');
      await confirmModal(page, /생성|신청/, '확인', { agree: true });
      for (let i = 0; i < 2 && (await dismissModalIfAny(page)); i++) await page.waitForTimeout(300);
      await waitForRow(page, ROUTE, vars.name!, {
        status: READY,
        timeoutMs: 600_000,
        intervalMs: 15_000,
        log,
      });
      log(
        `  Registry 행: ${(await row(page, vars.name!).first().innerText()).replace(/\s+/g, ' ').slice(0, 160)}`,
      );
      await expectStep(page, resolveExpectation(scenario.steps[1]!.expect, vars), ctx(1));
    });
    await test.step(`steps[2] ${scenario.steps[2]!.goal}`, async () => {
      // updateprivateacl(2026-10-16): 연필 → "사용" 끔 → 저장 → 상세 "미사용" → 다시 켬 → "사용" (PUT …/private-acl). 허용 리소스는 0개 그대로.
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      // 상세 본문은 settle 뒤에도 늦게 그려진다(1차 실행: 값 "" ) → 라벨이 보일 때까지 기다리고 값은 다시 읽으며 확인
      await page
        .locator('.scp-form-group-label:visible')
        .filter({ hasText: /^\s*레지스트리명\s*$/ })
        .first()
        .waitFor({ timeout: 30_000 });
      await waitDetailValue(page, PRIVATE_ACL, (v) => /^사용/.test(v), { log, timeoutMs: 60_000 });
      for (const on of [false, true]) {
        const modal = await openAclEdit(page, PRIVATE_ACL);
        await modal.getByText('프라이빗 엔드포인트 접근 제어 수정').first().waitFor({ timeout: 10_000 });
        const use = modal
          .locator('.scp-select:visible')
          .filter({ hasText: /^\s*사용\s*$/ })
          .first();
        if ((await isChecked(use)) !== on) await use.click();
        await saveAclModal(page, modal);
        await waitForRow(page, ROUTE, vars.name!, {
          status: READY,
          timeoutMs: 300_000,
          intervalMs: 10_000,
          log,
        });
        await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
        await settleConsole(page, { appearGraceMs: 800 });
        await waitDetailValue(page, PRIVATE_ACL, (v) => (on ? /^사용/.test(v) : /^미사용/.test(v)), {
          log,
          timeoutMs: 60_000,
        });
      }
      await expectStep(page, resolveExpectation(scenario.steps[2]!.expect, vars), ctx(2));
    });
    await test.step(`steps[3] ${scenario.steps[3]!.goal}`, async () => {
      await addTag(page, 'qa-tag', vars.run_id!, log);
      await removeTag(page, 'qa-tag', log);
      await expectStep(page, resolveExpectation(scenario.steps[3]!.expect, vars), ctx(3));
    });
    await test.step(`steps[4] ${scenario.steps[4]!.goal}`, async () => {
      await page
        .getByText(/^\s*상세 정보\s*$/)
        .first()
        .click();
      await settleConsole(page, { appearGraceMs: 800 });
      await waitDetailValue(page, '엔드포인트', (v) => v === '프라이빗', { log, timeoutMs: 60_000 });
      await setEndpoint(page, vars.name!, '프라이빗&퍼블릭');
      await expect(publicEndpointLabel(page), '퍼블릭 엔드포인트 주소가 보여야 합니다').toHaveCount(1);
      // updatepublicacl(2026-10-16): 퍼블릭을 켠 동안만 보이는 연필 → IP 입력 → 첫 "추가" → 저장 → 상세 "퍼블릭 접근 허용 IP 총 1 192.0.2.10/32" (PUT …/public-acl)
      const modal = await openAclEdit(page, PUBLIC_ACL);
      await modal.getByText('퍼블릭 엔드포인트 접근 제어 수정').first().waitFor({ timeout: 10_000 });
      await fillStable(
        page,
        modal.locator('input[type=text]:visible').first(),
        PUBLIC_IP,
        '퍼블릭 접근 허용 IP',
      );
      await modal.getByRole('button', { name: '추가', exact: true }).first().click();
      await modal.getByText(PUBLIC_IP, { exact: true }).first().waitFor({ timeout: 5_000 });
      await saveAclModal(page, modal);
      await waitForRow(page, ROUTE, vars.name!, {
        status: READY,
        timeoutMs: 300_000,
        intervalMs: 10_000,
        log,
      });
      await row(page, vars.name!).getByText(vars.name!, { exact: true }).first().click();
      await settleConsole(page, { appearGraceMs: 800 });
      await waitDetailValue(page, PUBLIC_IP_LABEL, (v) => v.includes(PUBLIC_IP), {
        log,
        timeoutMs: 60_000,
      });
      // 되돌림: KI-001(10-14~, 10-16 재현) 동안은 여기서 "엔드포인트가 프라이빗 로 바뀌지 않았습니다" 로 실패한다(결함을 그대로 잡는다)
      await setEndpoint(page, vars.name!, '프라이빗');
      await expect(publicEndpointLabel(page)).toHaveCount(0);
      await expectStep(page, resolveExpectation(scenario.steps[4]!.expect, vars), ctx(4));
    });
  });
});
