import { expect, test } from '@playwright/test';
import { parseExploreReport, renderDashboardHtml } from '../../src/report/dashboard';
import type { RunRecord } from '../../src/report/run-record';

const rec = (
  spec: string,
  started: string,
  status: 'pass' | 'fail',
  extra: Partial<RunRecord> = {},
): RunRecord => ({
  spec,
  started,
  ended: started,
  seconds: 61,
  status,
  class: status === 'pass' ? 'pass' : 'unclassified',
  annotations: { run_id: '0923-1700-abcd' },
  tests: [],
  ...extra,
});

test.describe('대시보드 HTML', () => {
  test('탐색 보고서 머리 부분을 읽는다', () => {
    const md = [
      '# 탐색 보고서: vpc-form',
      '',
      '- 라우트: `#/vpc/vpc/list` · run_id 0923-1654-49e5 · 2026-09-23T07:54 ~ 07:55',
      '- 종료 사유: 시도할 컨트롤이 더 없음',
      '- 결정 20회, 동작 20회, 비용 $0.0025, 이상 0건, 정보 6건',
    ].join('\n');
    const s = parseExploreReport(md, 'vpc-form-202609230754');
    expect(s).toMatchObject({
      name: 'vpc-form',
      route: '#/vpc/vpc/list',
      run_id: '0923-1654-49e5',
      decisions: 20,
      cost: 0.0025,
      anomalies: 0,
      infos: 6,
    });
    expect(parseExploreReport('없는 내용', 'x')).toBeNull();
  });

  test('실행 기록·커버리지·탐색이 한 HTML 에 들어가고 값이 이스케이프된다', () => {
    const html = renderDashboardHtml({
      generated: '2026-09-23 18:00',
      records: [
        rec('networking.vpc.create-delete', '2026-09-23T08:00:00.000Z', 'pass'),
        rec('compute.vm-stack', '2026-09-23T08:10:00.000Z', 'fail', {
          error: 'Error: <b>세션이 끝났습니다</b>',
          class: 'environment',
        }),
      ],
      suiteOrder: ['networking.vpc.create-delete', 'compute.vm-stack', 'never.ran'],
      coverage: {
        totals: {
          services: 89,
          screens: 276,
          home_screens: 89,
          non_home_screens: 187,
          smoke_entries: 282,
          list_screens: 100,
          keyed_list_screens: 80,
        },
        resources: 80,
        levels: { 0: 0, 1: 70, 2: 3, 3: 2, 4: 5 },
        at_least_2: 10,
        at_least_3: 7,
        categories: [{ category: 'Networking', resources: 12, levels: { 0: 0, 1: 8, 2: 1, 3: 1, 4: 2 } }],
      },
      coverageErrors: [],
      entries: [
        {
          key: 'vpc',
          service: 'VPC',
          category: 'Networking',
          route: '/vpc/vpc/list',
          level: 4,
          specs: ['networking.vpc.create-delete'],
          last_pass: '2026-09-23',
          note: 'a<b',
        },
      ],
      issues: [{ id: 'KI-000', kind: 'test', spec: 'x', pattern: /x/, enabled: false, note: 'n' } as never],
      explores: [
        {
          name: 'vpc-form',
          dir: 'vpc-form-1',
          route: '#/vpc/vpc/list',
          run_id: 'r',
          started: '2026-09-23T07:54',
          stop_reason: 's',
          decisions: 20,
          actions: 20,
          cost: 0.0025,
          anomalies: 1,
          infos: 6,
        },
      ],
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('networking.vpc.create-delete');
    expect(html).toContain('기록 없음'); // never.ran
    expect(html).toContain('FAIL(environment)');
    expect(html).toContain('&lt;b&gt;세션이 끝났습니다&lt;/b&gt;');
    expect(html).not.toContain('<b>세션이');
    expect(html).toContain('a&lt;b');
    expect(html).toContain('13%'); // 10/80
    expect(html).toContain('vpc-form-1/report.md');
    expect(html).not.toMatch(/<script src=|<link /); // 외부 요청 없음
  });
});
