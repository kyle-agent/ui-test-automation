import { expect, test } from '@playwright/test';
import type { ProductMatrix } from '../../src/report/product-matrix';
import type { RunRecord } from '../../src/report/run-record';
import {
  buildScreenBoard,
  countScreenStatuses,
  judgeScreen,
  orderCategories,
  screenBoardBlock,
  type BoardSpec,
} from '../../src/report/screen-board';

const rec = (spec: string, started: string, status: 'pass' | 'fail', error?: string): RunRecord => ({
  spec,
  started,
  ended: started,
  seconds: 60,
  status,
  class: status === 'pass' ? 'pass' : 'unclassified',
  annotations: {},
  tests: [],
  error,
  attachments:
    status === 'fail' ? ['test-results/x/screenshot-a.png', 'test-results/x/test-failed-1.png'] : [],
});

const bs = (spec: string, own: boolean, status?: 'pass' | 'fail', flaky = false): BoardSpec => ({
  spec,
  own,
  steps: 1,
  status,
  runs: status ? 1 : 0,
  passes: status === 'pass' ? 1 : 0,
  attachments: [],
  flaky,
});

test.describe('화면 상태판', () => {
  test('화면 하나의 상태 판정', () => {
    const row = { state: '시나리오' as const };
    expect(judgeScreen(row, [bs('a', true, 'pass')], false)).toBe('pass');
    expect(judgeScreen(row, [bs('a', true, 'pass'), bs('b', true, 'fail')], false)).toBe('fail');
    // 자기 상품 spec 이 통과하면 다른 상품 spec 의 실패는 무시
    expect(judgeScreen(row, [bs('a', true, 'pass'), bs('x', false, 'fail')], false)).toBe('pass');
    // 전제 단계로만 지나는 화면: 통과가 하나라도 있으면 정상, 전부 실패면 실패
    expect(judgeScreen(row, [bs('x', false, 'fail'), bs('y', false, 'pass')], false)).toBe('pass');
    expect(judgeScreen(row, [bs('x', false, 'fail'), bs('y', false, 'fail')], false)).toBe('fail');
    expect(judgeScreen(row, [bs('a', true, 'pass', true)], false)).toBe('flaky');
    expect(judgeScreen(row, [bs('a', true)], false)).toBe('unrun');
    expect(judgeScreen(row, [bs('a', true), bs('b', true, 'pass')], false)).toBe('pass');
    expect(judgeScreen({ state: '스모크만' }, [], false)).toBe('smoke');
    expect(judgeScreen({ state: '제외' }, [], false)).toBe('excluded');
    expect(judgeScreen({ state: '시나리오' }, [bs('a', true, 'pass')], true)).toBe('excluded');
    expect(judgeScreen({ state: '홈' }, [], false)).toBe('home');
  });

  test('카테고리는 콘솔 순서, 모르는 것은 뒤에 이름순', () => {
    expect(orderCategories(['Zeta', 'Networking', 'Compute', 'Alpha'])).toEqual([
      'Compute',
      'Networking',
      'Alpha',
      'Zeta',
    ]);
  });

  test('판단표·실행 기록 → 상태판 JSON·HTML', () => {
    const matrix: ProductMatrix[] = [
      {
        category: 'Networking',
        service: 'VPC',
        screens: [
          { name: 'Service Home', route: '/vpc/dashboard', state: '홈', specs: [] },
          {
            name: 'VPC',
            route: '/vpc/vpc/list',
            state: '시나리오',
            level: 4,
            specs: [
              { spec: 'networking.vpc.create-delete', steps: 2, status: 'pass' },
              { spec: 'database.mysql', steps: 1, status: 'fail' },
            ],
          },
          {
            name: 'Subnet <x>',
            route: '/vpc/subnet/list',
            state: '시나리오',
            level: 4,
            specs: [{ spec: 'database.mysql', steps: 1, status: 'fail' }],
          },
          {
            name: 'Port',
            route: '/vpc/port/list',
            state: '스모크만',
            level: 1,
            specs: [],
            decision: { decision: '해라', note: '포트' },
          },
        ],
        specs: [
          {
            spec: 'networking.vpc.create-delete',
            title: 't',
            file: 'f',
            category: 'Networking',
            service: 'VPC',
            screens: [],
            steps: [],
            runs: 1,
            passes: 1,
          },
        ],
      },
      {
        category: 'Database',
        service: 'MySQL',
        screens: [
          {
            name: 'MySQL',
            route: '/mysql/mysql/list',
            state: '시나리오',
            level: 2,
            specs: [{ spec: 'database.mysql', steps: 3, status: 'fail' }],
          },
        ],
        specs: [
          {
            spec: 'database.mysql',
            title: 't',
            file: 'f',
            category: 'Database',
            service: 'MySQL',
            screens: [],
            steps: [],
            runs: 1,
            passes: 0,
          },
        ],
      },
      {
        category: 'Database',
        service: 'Vertica(DBaaS)',
        excluded: '라이선스 없음',
        screens: [{ name: 'Vertica', route: '/vertica/list', state: '시나리오', specs: [] }],
        specs: [],
      },
    ];
    const records = [
      rec('networking.vpc.create-delete', '2026-10-20T01:00:00.000Z', 'pass'),
      rec('database.mysql', '2026-10-20T02:00:00.000Z', 'fail', 'Worker teardown timeout <90s>'),
    ];
    const board = buildScreenBoard(matrix, records);
    expect(board.categories.map((c) => c.name)).toEqual(['Networking', 'Database']);
    const vpc = board.products.find((p) => p.name === 'VPC')!;
    const by = (route: string) => vpc.screens.find((s) => s.route === route)!;
    expect(by('/vpc/vpc/list').status).toBe('pass'); // 자기 spec 통과, DBaaS 실패는 전제 단계
    expect(by('/vpc/subnet/list').status).toBe('fail'); // 전제 단계 spec 만 있고 통과한 것이 없음
    expect(by('/vpc/port/list').status).toBe('smoke');
    expect(by('/vpc/dashboard').status).toBe('home');
    const mysql = board.products.find((p) => p.name === 'MySQL')!.screens[0]!;
    expect(mysql.status).toBe('fail');
    expect(mysql.specs[0]).toMatchObject({
      own: true,
      status: 'fail',
      error: 'Worker teardown timeout <90s>',
    });
    expect(mysql.specs[0]!.attachments).toEqual(['test-results/x/screenshot-a.png']); // test-failed-N.png 는 뺀다
    expect(board.products.find((p) => p.name === 'Vertica(DBaaS)')!.screens[0]!.status).toBe('excluded');
    expect(countScreenStatuses(board)).toMatchObject({ pass: 1, fail: 2, smoke: 1, home: 1, excluded: 1 });

    const html = screenBoardBlock(board);
    expect(html).toContain('id="sb-data"');
    expect(html).not.toContain('</script>Worker'); // JSON 안의 < 는 < 로
    expect(html).toContain('\\u003c90s>');
    expect(html).toContain('Subnet \\u003cx>');
  });
});
