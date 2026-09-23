import { expect, test } from '@playwright/test';
import {
  formatCoverageMarkdown,
  formatCoverageText,
  keyedListScreens,
  mapTotals,
  parseCoverageYaml,
  summarizeCoverage,
  validateCoverage,
  type CoverageLedger,
} from '../../src/report/coverage';
import { matchKnownIssue, parseKnownIssues } from '../../src/report/known-issues';
import { buildRunRecord, classifyFailure, testsFromReport } from '../../src/report/run-record';
import { meanPassSeconds, recentString, resultsTable, statusCell } from '../../src/report/results';
import type { RunRecord } from '../../src/report/run-record';
import { parseScreensTxt } from '../../src/service-map/screens';
import type { JSONReport } from '@playwright/test/reporter';

// 작은 서비스 맵: 서비스 3개, Service Home 2개, 목록 화면 4개 (키 있음 3개, 그중 keypair 는 두 서비스에 겹친다)
const MAP = parseScreensTxt(
  [
    '## Networking > VPC | /vpc/dashboard',
    'Service Home | /vpc/dashboard',
    'VPC | /vpc/vpc/list (vpc)',
    'Subnet | /vpc/subnet/create',
    '## Compute > Virtual Server | /virtualserver/dashboard',
    'Service Home | /virtualserver/dashboard',
    'Keypair | /virtualserver/keypair/list (keypair)',
    'Image | /virtualserver/image/list',
    '## Compute > GPU Server | /gpuserver/dashboard',
    'Keypair | /gpuserver/keypair/list (keypair)',
  ].join('\n'),
);

const LEDGER_YAML = `
resources:
  - key: vpc
    service: VPC
    category: Networking
    route: /vpc/vpc/list
    level: 4
    specs: [networking.vpc.create-delete, compute.vm-stack]
    last_pass: 2026-09-23
    note: ""
  - key: keypair@virtual-server
    service: Virtual Server
    category: Compute
    route: /virtualserver/keypair/list
    level: 1
    specs: [smoke.virtual-server]
    last_pass: null
    note: 공유 keypair 재사용만
  - key: keypair@gpu-server
    service: GPU Server
    category: Compute
    route: /gpuserver/keypair/list
    level: 1
    specs: [smoke.gpu-server]
    last_pass: null
    note: ""
`;

const SPEC_IDS = new Set([
  'networking.vpc.create-delete',
  'compute.vm-stack',
  'smoke.virtual-server',
  'smoke.gpu-server',
]);

test.describe('커버리지 장부', () => {
  test('서비스 맵에서 키 있는 목록 화면을 뽑고, 겹치는 resource_type 은 @서비스 로 구분한다', () => {
    const rows = keyedListScreens(MAP);
    expect(rows.map((r) => r.key)).toEqual(['keypair@gpu-server', 'keypair@virtual-server', 'vpc']);
    expect(rows.find((r) => r.key === 'vpc')).toMatchObject({
      service: 'VPC',
      category: 'Networking',
      route: '/vpc/vpc/list',
      resource_type: 'vpc',
    });
    expect(mapTotals(MAP)).toEqual({
      services: 3,
      screens: 7,
      home_screens: 2,
      non_home_screens: 5,
      smoke_entries: 8,
      list_screens: 4,
      keyed_list_screens: 3,
    });
  });

  test('올바른 장부는 검증을 통과하고 요약 수치가 맞는다', () => {
    const ledger = parseCoverageYaml(LEDGER_YAML);
    expect(ledger.resources).toHaveLength(3);
    expect(ledger.resources[0]!.last_pass).toBe('2026-09-23');
    expect(ledger.resources[1]!.last_pass).toBeNull();
    expect(validateCoverage(ledger, MAP, SPEC_IDS)).toEqual([]);

    const s = summarizeCoverage(ledger, MAP);
    expect(s.resources).toBe(3);
    expect(s.levels).toEqual({ 0: 0, 1: 2, 2: 0, 3: 0, 4: 1 });
    expect(s.at_least_2).toBe(1);
    expect(s.at_least_3).toBe(1);
    expect(s.categories).toEqual([
      { category: 'Compute', resources: 2, levels: { 0: 0, 1: 2, 2: 0, 3: 0, 4: 0 } },
      { category: 'Networking', resources: 1, levels: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1 } },
    ]);

    const text = formatCoverageText(s);
    expect(text).toContain('서비스 3 · 화면 7 (Service Home 2, 그 외 5) · 스모크 진입 8');
    expect(text).toContain('level ≥ 2 (CRUD 이상): 1/3 (33%)');
    const md = formatCoverageMarkdown(s);
    expect(md).toContain('| Networking | 1 | 0 | 0 | 0 | 1 |');
    expect(md).toContain('| **합계** | **3** | **2** | **0** | **0** | **1** |');
  });

  test('빠진 화면·모르는 키·없는 spec·level 에 맞지 않는 값을 잡아낸다', () => {
    const ledger: CoverageLedger = parseCoverageYaml(LEDGER_YAML);
    const broken: CoverageLedger = {
      resources: [
        { ...ledger.resources[0]!, specs: ['networking.vpc.create-delete', 'compute.nope'] },
        { ...ledger.resources[1]!, key: 'keypair' }, // 겹치는 resource_type 은 @서비스 접미가 있어야 한다
        {
          key: 'ghost',
          service: 'VPC',
          category: 'Networking',
          route: '/vpc/ghost/list',
          level: 2,
          specs: [],
          last_pass: null,
          note: '',
        },
        // keypair@gpu-server 가 빠졌다
      ],
    };
    const errors = validateCoverage(broken, MAP, SPEC_IDS);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('spec compute.nope 가 없습니다'),
        expect.stringContaining('key 는 keypair@virtual-server 입니다'),
        expect.stringContaining('ghost: 서비스 맵에 없는 목록 화면 route'),
        expect.stringContaining('장부에 없음: keypair@gpu-server'),
      ]),
    );
    const noSpec: CoverageLedger = {
      resources: [{ ...ledger.resources[0]!, specs: [] }, ledger.resources[1]!, ledger.resources[2]!],
    };
    expect(validateCoverage(noSpec, MAP, SPEC_IDS)).toEqual([expect.stringContaining('specs 가 비어')]);
    const noDate: CoverageLedger = {
      resources: [{ ...ledger.resources[0]!, last_pass: null }, ledger.resources[1]!, ledger.resources[2]!],
    };
    expect(validateCoverage(noDate, MAP, SPEC_IDS)).toEqual([
      expect.stringContaining('last_pass 가 없습니다'),
    ]);
  });

  test('형식이 틀린 장부는 명확한 오류를 낸다', () => {
    expect(() => parseCoverageYaml('resources: 3')).toThrow(/resources 배열/);
    expect(() =>
      parseCoverageYaml(
        'resources:\n  - key: a\n    service: s\n    category: c\n    route: /a/list\n    level: 7',
      ),
    ).toThrow(/level 은 0~4/);
    expect(() =>
      parseCoverageYaml(
        'resources:\n  - key: a\n    service: s\n    category: c\n    route: /a/list\n    level: 2\n    last_pass: 어제',
      ),
    ).toThrow(/last_pass/);
  });
});

const ISSUES_YAML = `
issues:
  - id: KI-000
    spec: "*"
    match: "예시"
    kind: product
    since: 2026-09-23
    note: 예시 항목
    enabled: false
  - id: KI-001
    spec: compute.vm-volume
    match: "In Use.*Available"
    kind: product
    since: 2026-09-23
    note: 볼륨 상태 표기
  - id: KI-002
    spec: "*"
    match: "만료된 우회"
    kind: test
    since: 2026-09-01
    expires: 2026-09-10
    note: 만료된 항목
`;

function report(
  tests: { title: string; status: 'passed' | 'failed'; error?: string; steps?: [string, boolean][] }[],
): JSONReport {
  return {
    config: {} as JSONReport['config'],
    stats: { startTime: '', duration: 0, expected: 0, unexpected: 0, flaky: 0, skipped: 0 },
    errors: [],
    suites: [
      {
        title: 'x.spec.ts',
        file: 'x.spec.ts',
        line: 0,
        column: 0,
        specs: [],
        suites: [
          {
            title: 'describe',
            file: 'x.spec.ts',
            line: 0,
            column: 0,
            specs: tests.map((t) => ({
              title: t.title,
              ok: t.status === 'passed',
              tags: [],
              id: t.title,
              file: 'x.spec.ts',
              line: 0,
              column: 0,
              tests: [
                {
                  timeout: 0,
                  annotations: [
                    { type: 'scenario', description: 'compute.vm-volume' },
                    { type: 'run_id', description: '0923-1000-ab12' },
                  ],
                  expectedStatus: 'passed',
                  projectName: 'regression',
                  projectId: 'regression',
                  status: t.status === 'passed' ? 'expected' : 'unexpected',
                  results: [
                    {
                      workerIndex: 0,
                      parallelIndex: 0,
                      status: t.status,
                      duration: 12_345,
                      error: undefined,
                      errors: t.error
                        ? [{ message: `\u001b[31m${t.error}\u001b[39m\n    at x.spec.ts:1` }]
                        : [],
                      stdout: [],
                      stderr: [],
                      retry: 0,
                      startTime: '2026-09-23T01:00:00.000Z',
                      attachments: t.error
                        ? [{ name: 'screenshot', path: 'C:\\x\\shot.png', contentType: 'image/png' }]
                        : [],
                      annotations: [],
                      steps: (t.steps ?? []).map(([title, ok]) => ({
                        title,
                        duration: 1500,
                        error: ok ? undefined : { message: 'step failed' },
                      })),
                    },
                  ],
                },
              ],
            })),
          },
        ],
      },
    ],
  };
}

test.describe('실행 기록과 결과 표', () => {
  test('알려진 이슈: 비활성·만료·spec 불일치는 건너뛰고 첫 매칭을 돌려준다', () => {
    const issues = parseKnownIssues(ISSUES_YAML);
    expect(issues).toHaveLength(3);
    expect(issues[0]!.enabled).toBe(false);
    const today = '2026-09-23';
    expect(matchKnownIssue(issues, 'compute.vm-stack', '예시', today)).toBeNull();
    expect(matchKnownIssue(issues, 'compute.vm-stack', 'In Use → Available', today)).toBeNull();
    expect(matchKnownIssue(issues, 'compute.vm-volume', 'volume In Use, expected Available', today)?.id).toBe(
      'KI-001',
    );
    expect(matchKnownIssue(issues, 'compute.vm-stack', '만료된 우회', today)).toBeNull();
    expect(matchKnownIssue(issues, 'compute.vm-stack', '만료된 우회', '2026-09-05')?.id).toBe('KI-002');
    expect(() =>
      parseKnownIssues(
        'issues:\n  - id: X-1\n    spec: "*"\n    match: a\n    kind: product\n    since: 2026-09-23',
      ),
    ).toThrow(/KI-000 형식/);
    expect(() =>
      parseKnownIssues(
        'issues:\n  - id: KI-001\n    spec: "*"\n    match: "("\n    kind: product\n    since: 2026-09-23',
      ),
    ).toThrow(/정규식 오류/);
  });

  test('실패 분류: 알려진 이슈 > 환경 문구 > unclassified', () => {
    const issues = parseKnownIssues(ISSUES_YAML);
    expect(classifyFailure('compute.vm-stack', 'Error: 세션이 끝났습니다', issues)).toEqual({
      class: 'environment',
    });
    expect(
      classifyFailure('compute.vm-stack', 'SSO 로그인 페이지로 이동했습니다 (https://sso…)', issues),
    ).toEqual({
      class: 'environment',
    });
    expect(
      classifyFailure('compute.vm-stack', 'PW_CDP_URL=http://127.0.0.1:9222 에 연결하지 못했습니다', issues),
    ).toEqual({
      class: 'environment',
    });
    expect(classifyFailure('compute.vm-stack', 'browserType.connectOverCDP: Timeout', issues)).toEqual({
      class: 'environment',
    });
    expect(
      classifyFailure('compute.vm-volume', 'volume In Use, expected Available', issues, '2026-09-23'),
    ).toEqual({
      class: 'product',
      known_issue: 'KI-001',
    });
    expect(classifyFailure('compute.vm-stack', 'expect(locator).toBeVisible() failed', issues)).toEqual({
      class: 'unclassified',
    });
  });

  test('Playwright JSON 리포트에서 step·annotation·오류 첫 줄·첨부를 뽑아 기록을 만든다', () => {
    const rep = report([
      {
        title: '본문',
        status: 'failed',
        error: 'Error: 볼륨이 In Use 가 아님\n둘째 줄',
        steps: [
          ['steps[0] Keypair 확인', true],
          ['steps[1] 볼륨 생성', false],
        ],
      },
      { title: '정리', status: 'passed', steps: [['teardown[0] VPC 해지', true]] },
    ]);
    const tests = testsFromReport(rep);
    expect(tests).toHaveLength(2);
    expect(tests[0]).toMatchObject({
      title: '본문',
      status: 'failed',
      seconds: 12.3,
      annotations: { scenario: 'compute.vm-volume', run_id: '0923-1000-ab12' },
      steps: [
        { title: 'steps[0] Keypair 확인', status: 'pass', seconds: 1.5 },
        { title: 'steps[1] 볼륨 생성', status: 'fail', seconds: 1.5 },
      ],
      error: 'Error: 볼륨이 In Use 가 아님',
    });
    expect(tests[0]!.attachments).toEqual(['C:/x/shot.png']);
    expect(tests[1]!.attachments).toBeUndefined();

    const started = new Date('2026-09-23T01:00:00.000Z');
    const ended = new Date('2026-09-23T01:10:30.000Z');
    const issues = parseKnownIssues(ISSUES_YAML);
    const rec = buildRunRecord({
      spec: 'compute.vm-volume',
      started,
      ended,
      ok: false,
      report: rep,
      issues,
      today: '2026-09-23',
    });
    expect(rec).toMatchObject({
      spec: 'compute.vm-volume',
      seconds: 630,
      status: 'fail',
      class: 'unclassified',
      error: 'Error: 볼륨이 In Use 가 아님',
      attachments: ['C:/x/shot.png'],
      annotations: { scenario: 'compute.vm-volume', run_id: '0923-1000-ab12' },
    });
    expect(rec.known_issue).toBeUndefined();

    const known = buildRunRecord({
      spec: 'compute.vm-volume',
      started,
      ended,
      ok: false,
      report: report([{ title: '본문', status: 'failed', error: 'state In Use but expected Available' }]),
      issues,
      today: '2026-09-23',
    });
    expect(known.class).toBe('product');
    expect(known.known_issue).toBe('KI-001');

    const pass = buildRunRecord({
      spec: 'x',
      started,
      ended,
      ok: true,
      report: report([{ title: 't', status: 'passed' }]),
      issues,
    });
    expect(pass).toMatchObject({ status: 'pass', class: 'pass' });
    expect(pass.error).toBeUndefined();

    // 러너가 실패했는데 리포트가 없으면 실패로 기록하고 이유를 남긴다
    const noReport = buildRunRecord({
      spec: 'x',
      started,
      ended,
      ok: false,
      report: null,
      reportError: 'JSON 리포트가 없습니다',
      issues,
    });
    expect(noReport).toMatchObject({
      status: 'fail',
      class: 'unclassified',
      report_error: 'JSON 리포트가 없습니다',
    });
  });

  test('결과 표: 최근 5회 문자열, 통과 평균, 기록 없음, known 표시', () => {
    const mk = (
      spec: string,
      day: number,
      status: 'pass' | 'fail',
      seconds: number,
      known?: string,
    ): RunRecord => ({
      spec,
      started: `2026-09-${String(day).padStart(2, '0')}T01:00:00.000Z`,
      ended: `2026-09-${String(day).padStart(2, '0')}T01:10:00.000Z`,
      seconds,
      status,
      class: status === 'pass' ? 'pass' : known ? 'product' : 'unclassified',
      ...(known ? { known_issue: known } : {}),
      annotations: {},
      tests: [],
    });
    const runs = [
      mk('a', 10, 'pass', 100),
      mk('a', 11, 'pass', 120),
      mk('a', 12, 'fail', 50),
      mk('a', 13, 'pass', 110),
      mk('a', 14, 'pass', 130),
      mk('a', 15, 'fail', 40, 'KI-001'),
    ];
    expect(recentString(runs)).toBe('PFPPF');
    expect(meanPassSeconds(runs)).toBe(115);
    expect(statusCell(runs[5]!)).toBe('FAIL(known: KI-001)');
    expect(statusCell(runs[2]!)).toBe('FAIL(unclassified)');
    const table = resultsTable([...runs].reverse(), ['a', 'b']);
    expect(table).toHaveLength(4);
    expect(table[2]).toMatch(
      /^\| a \| 2026-09-15 \d\d:\d\d \| FAIL\(known: KI-001\) \| 40초 \| PFPPF \| 1분 55초 \|$/,
    );
    expect(table[3]).toBe('| b | 기록 없음 | - | - | - | - |');
  });
});
