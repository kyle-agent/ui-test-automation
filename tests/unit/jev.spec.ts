import { expect, test } from '@playwright/test';
import {
  actionSpace,
  asText,
  buildRequest,
  interpret,
  validateChoice,
  type ObservedAction,
  type PageState,
} from '../../src/jev/decide';
import { filterCandidates, pickVarForField } from '../../src/jev/recorder';

const actions: ObservedAction[] = [
  { id: 'e1', kind: 'click', node: 1, role: 'button', label: 'VPC 생성', value: '' },
  { id: 'e2', kind: 'fill', node: 2, role: 'textbox', label: 'VPC 이름', value: '' },
  { id: 'e3', kind: 'click', node: 2, role: 'textbox', label: 'Open VPC 이름', value: '' },
  {
    id: 'e4',
    kind: 'select',
    node: 3,
    role: 'combobox',
    label: '리전 → kr-west1',
    value: 'kr-west1',
    current_value: 'kr-east1',
  },
  {
    id: 'e5',
    kind: 'select',
    node: 3,
    role: 'combobox',
    label: '리전 → kr-east2',
    value: 'kr-east2',
    current_value: 'kr-east1',
  },
  { id: 'e6', kind: 'click', node: 4, role: 'button', label: '삭제', value: '' },
  { id: 'e7', kind: 'click', node: 5, role: 'button', label: '로그아웃', value: '' },
  { id: 'scroll_down', kind: 'scroll', label: 'Scroll down', delta: 560 },
  { id: 'wait', kind: 'wait', label: 'Wait for the page to update' },
];
const state: PageState = {
  url: 'https://console.example/console/#/vpc/vpc/create',
  title: 'VPC 생성 | VPC | kr-west1 | Console',
  w: 1440,
  h: 900,
  text: 'VPC 생성 VPC 이름',
  scroll: { y: 0, height: 900 },
  actions,
  marker: [],
  page_key: [],
  guards: {},
  omitted_actions: 0,
  fingerprint: 'x',
};

test.describe('Jev 결정 요청', () => {
  test('요소당 인덱스 하나, 동작별 대상 후보', () => {
    const { elements, targets, controls } = actionSpace(actions);
    expect(elements.map((e) => e.label)).toEqual(['VPC 생성', 'VPC 이름', '리전', '삭제', '로그아웃']);
    expect(elements[1]?.operations).toEqual(['TYPE_TEXT', 'CLICK']);
    expect(Object.keys(targets.CLICK!)).toEqual(['1', '2', '4', '5']);
    expect(Object.keys(targets.TYPE_TEXT!)).toEqual(['2']);
    expect(Object.keys(targets.SELECT!)).toEqual(['3:1', '3:2']);
    expect((elements[2]?.options as unknown[]).length).toBe(2);
    expect(Object.keys(controls)).toEqual(['SCROLL_DOWN', 'WAIT']);
  });

  test('criteria 와 instructions 는 문자열로 직렬화된다 (OpenRouter 요구)', () => {
    const { body, operations } = buildRequest(state, 'VPC 생성 폼을 연다', []);
    expect(Object.keys(operations)).toEqual([
      'CLICK',
      'TYPE_TEXT',
      'SELECT',
      'SCROLL_DOWN',
      'WAIT',
      'DONE',
      'BLOCKED',
    ]);
    const questions = body.questions as Record<
      string,
      { type: string; criteria: Record<string, unknown>; instructions: unknown }
    >;
    for (const q of Object.values(questions)) {
      expect(q.type).toBe('choice');
      expect(typeof q.instructions).toBe('string');
      for (const v of Object.values(q.criteria)) expect(typeof v).toBe('string');
    }
    expect(questions.click_target?.criteria['1']).toContain('[1] VPC 생성');
    expect((body.state as { page: { title: string } }).page.title).toBe(state.title);
    expect(asText({ a: 1 })).toBe('{"a":1}');
  });

  test('응답 검증: 확률 합, 선택 일치, 미지의 id 거부', () => {
    expect(() => validateChoice({ choice: 'x', probabilities: { a: 1 }, confidence: 1 }, ['a'])).toThrow();
    expect(() =>
      validateChoice({ choice: 'a', probabilities: { a: 0.4, b: 0.4 }, confidence: 1 }, ['a', 'b']),
    ).toThrow();
    expect(() =>
      validateChoice({ choice: 'a', probabilities: { a: 0.3, b: 0.7 }, confidence: 1 }, ['a', 'b']),
    ).toThrow();
    expect(
      validateChoice({ choice: 'a', probabilities: { a: 0.7, b: 0.3 }, confidence: 0.9 }, ['a', 'b']).choice,
    ).toBe('a');
  });

  test('선택된 동작의 대상 헤드만 해석한다', () => {
    const built = buildRequest(state, 'goal', []);
    const result = {
      model: 'typesafe/jev-1.13',
      answers: {
        operation: {
          choice: 'TYPE_TEXT',
          probabilities: {
            CLICK: 0.1,
            TYPE_TEXT: 0.8,
            SELECT: 0.05,
            SCROLL_DOWN: 0.02,
            WAIT: 0.01,
            DONE: 0.01,
            BLOCKED: 0.01,
          },
          confidence: 0.9,
        },
        type_text_target: { choice: '2', probabilities: { '2': 1 }, confidence: 1 },
        click_target: {
          choice: '1',
          probabilities: { '1': 0.7, '2': 0.1, '4': 0.1, '5': 0.1 },
          confidence: 0.5,
        },
      },
      usage: { cost: 0.00003 },
    };
    const d = interpret(result, built);
    expect(d.operation).toBe('TYPE_TEXT');
    expect(d.choice).toBe('e2');
    expect(d.probabilities).toEqual({ e2: 1 });
    const done = interpret(
      {
        answers: {
          operation: {
            choice: 'DONE',
            probabilities: { ...result.answers.operation.probabilities, TYPE_TEXT: 0.01, DONE: 0.8 },
            confidence: 0.8,
          },
        },
      },
      built,
    );
    expect(done.choice).toBe('DONE');
  });
});

test.describe('기록 안전장치', () => {
  test('위험 라벨은 goal 이 명시할 때만, 로그아웃은 절대 후보에 넣지 않는다', () => {
    const ids = (goal: string) => filterCandidates(actions, goal).map((a) => a.id);
    expect(ids('VPC 생성 폼을 연다')).toEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'scroll_down', 'wait']);
    expect(ids('목록에서 선택하고 삭제한다')).toContain('e6');
    expect(ids('목록에서 선택하고 삭제한다')).not.toContain('e7');
  });

  test('TYPE_TEXT 값은 vars 에서 라벨로 고른다', () => {
    const vars = { name: 'qa-vpc-1', cidr: '10.250.0.0/16', description: '테스트' };
    expect(pickVarForField('VPC 이름', vars)).toBe('name');
    expect(pickVarForField('IP 대역(CIDR)', vars)).toBe('cidr');
    expect(pickVarForField('설명', vars)).toBe('description');
    expect(pickVarForField('알 수 없는 필드', vars)).toBeNull();
    expect(pickVarForField('아무 필드', { only: 'x' })).toBe('only');
  });
});
