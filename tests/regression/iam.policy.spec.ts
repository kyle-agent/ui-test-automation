// 직접 작성 (2026-09-23). 시나리오: scenarios/iam/policy.yaml. 공용 팩토리: src/console/simple-crud.ts
// 3단계 마법사라 폼 채우기 뒤(beforeSubmit) "다음" → JSON 모드 → ACE 편집기 입력 → "다음" 까지 가고, 마지막 확인 단계의 "생성" 을 팩토리가 누른다.
import { defineSimpleCrudSpec } from '../../src/console/simple-crud';
import { settleConsole } from '../../src/console/overlays';
import { dismissModalIfAny } from '../../src/console/ui';

const POLICY = JSON.stringify(
  {
    Version: '2024-07-01',
    Statement: [{ Sid: 'ScpConsoleTests', Effect: 'Allow', Action: ['vpc:ListVpcs'], Resource: ['*'] }],
  },
  null,
  2,
);

defineSimpleCrudSpec({
  scenario: 'scenarios/iam/policy.yaml',
  route: '#/iam/policy/list',
  createButton: '정책 생성',
  fields: [
    { label: '정책명', value: '{{name}}' },
    { label: '설명', value: 'scp-console-tests {{run_id}}', selector: 'textarea' },
  ],
  beforeSubmit: async (page) => {
    await page.getByRole('button', { name: '다음', exact: true }).last().click();
    await settleConsole(page, { appearGraceMs: 800 });
    await page.getByRole('button', { name: 'JSON 모드', exact: true }).click();
    await page.waitForTimeout(600);
    await dismissModalIfAny(page); // 첫 전환 안내 모달 (생성 과정 중 1회)
    const editor = page.locator('.ace_editor:visible .ace_content, .ace_editor:visible').first();
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    // ACE 는 자동 닫는 괄호를 넣으므로 한 줄씩이 아니라 insertText 로 통째로 넣는다
    await page.keyboard.insertText(POLICY);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '다음', exact: true }).last().click();
    await settleConsole(page, { appearGraceMs: 800 });
  },
  confirmText: /생성/,
  deleteButton: '삭제',
  tags: ['@light'],
});
