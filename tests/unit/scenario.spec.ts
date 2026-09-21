import { expect, test } from '@playwright/test';
import { compareCount } from '../../src/console/expect';
import { normalizeRouteKey, parseTitle, TITLE_PATTERN } from '../../src/console/titles';
import {
  loadScenario,
  loadScenarios,
  newRunId,
  resolveExpectation,
  resolveVars,
  scenarioVars,
  validateScenario,
} from '../../src/scenario/schema';

test.describe('시나리오 로더', () => {
  test('저장소의 모든 시나리오가 형식을 만족한다', () => {
    const smoke = loadScenarios('scenarios/smoke');
    expect(smoke.length).toBe(89);
    for (const sc of smoke) {
      expect(sc.tags).toContain('smoke');
      for (const step of sc.steps) expect(step.expect?.url, `${sc.file}: ${step.goal}`).toMatch(/^#\//);
    }
    const auth = loadScenario('scenarios/auth/login-page-smoke.yaml');
    expect(auth.precondition.session).toBe('none');
    expect(auth.links).toHaveLength(3);
    expect(auth.steps[0]?.expect?.title).toContain('Samsung Cloud Platform Console');
  });

  test('필수 필드와 지원하지 않는 expect 키를 검사한다', () => {
    expect(() => validateScenario({ id: 'x', title: 't', service: 's', steps: [] }, 'f.yaml')).toThrow(
      /steps 가 비어/,
    );
    expect(() =>
      validateScenario(
        { id: 'x', title: 't', service: 's', steps: [{ goal: 'g', expect: { visible: true } }] },
        'f.yaml',
      ),
    ).toThrow(/지원하지 않는 기대값/);
    expect(() =>
      validateScenario(
        { id: 'x', title: 't', service: 's', steps: [{ goal: 'g', expect: { count: { row: 'many' } } }] },
        'f.yaml',
      ),
    ).toThrow(/count/);
    expect(() =>
      validateScenario(
        { id: 'x', title: 't', service: 's', precondition: { session: 'admin' }, steps: [{ goal: 'g' }] },
        'f.yaml',
      ),
    ).toThrow(/session/);
  });

  test('{{run_id}} 와 vars 를 치환한다', () => {
    const sc = validateScenario(
      {
        id: 'compute.vm.create',
        title: 'VM 생성',
        service: 'compute',
        tags: ['destructive'],
        steps: [
          {
            goal: '이름에 {{name}} 입력',
            vars: { name: 'qa-vm-{{run_id}}' },
            expect: { text: ['{{name}}'], not_text: ['오류'] },
          },
        ],
        teardown: [{ goal: '{{name}} 삭제', expect: { not_text: ['{{name}}'] } }],
      },
      'f.yaml',
    );
    const vars = scenarioVars(sc, '0921-1305-ab12');
    expect(vars).toEqual({ run_id: '0921-1305-ab12', name: 'qa-vm-0921-1305-ab12' });
    expect(resolveVars(sc.teardown[0]!.goal, vars)).toBe('qa-vm-0921-1305-ab12 삭제');
    expect(resolveExpectation(sc.steps[0]!.expect, vars)).toEqual({
      text: ['qa-vm-0921-1305-ab12'],
      not_text: ['오류'],
    });
    expect(() => resolveVars('{{missing}}', vars)).toThrow(/정의되지 않은 변수/);
    expect(newRunId(new Date(2026, 8, 21, 13, 5))).toMatch(/^0921-1305-[0-9a-f]{4}$/);
  });
});

test.describe('판정 도우미', () => {
  test('count 조건', () => {
    expect(compareCount(3, '>=1')).toBe(true);
    expect(compareCount(0, '>=1')).toBe(false);
    expect(compareCount(2, '2')).toBe(true);
    expect(compareCount(2, '==3')).toBe(false);
    expect(compareCount(2, '<3')).toBe(true);
    expect(() => compareCount(1, 'lots')).toThrow();
  });

  test('document.title 형식', () => {
    const t = '사용자 목록 | Identity and Access Management(IAM) | Global | Console';
    expect(TITLE_PATTERN.test(t)).toBe(true);
    expect(parseTitle(t)).toEqual({
      screen: '사용자 목록',
      service: 'Identity and Access Management(IAM)',
      region: 'Global',
    });
    expect(TITLE_PATTERN.test('Samsung Cloud Platform Console')).toBe(false);
    expect(parseTitle('로그인 | Samsung Cloud Platform Console')).toBeNull();
    expect(normalizeRouteKey('#/iam/user/list/')).toBe('/iam/user/list');
  });
});
