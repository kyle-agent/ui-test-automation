import { expect, test } from '@playwright/test';
import { causeOf, errorSignature, failureViews, isFlakySpec, parseParity, suiteViews } from '../../src/report/insights';
import type { RunRecord } from '../../src/report/run-record';

const rec = (spec: string, started: string, status: 'pass' | 'fail', extra: Partial<RunRecord> = {}): RunRecord => ({
  spec,
  started,
  ended: started,
  seconds: 60,
  status,
  class: status === 'pass' ? 'pass' : 'unclassified',
  annotations: {},
  tests: [],
  ...extra,
});

test.describe('대시보드 파생 지표', () => {
  test('실패 원인: 알려진 이슈 > 환경 문구 > 정리 실패 > 다음 실행 통과(간헐) > 미분류', () => {
    const fail = (error: string, extra: Partial<RunRecord> = {}) => rec('a', '2026-10-01T00:00:00Z', 'fail', { error, ...extra });
    const nextPass = [rec('a', '2026-10-01T05:00:00Z', 'pass')];
    expect(causeOf(fail('x', { class: 'product' }), nextPass)).toBe('product');
    expect(causeOf(fail('Error: page.title: Target page, context or browser has been closed'), [])).toBe('environment');
    expect(causeOf(fail('Error: 정리 중 실패 (남은 리소스를 확인하세요):'), nextPass)).toBe('cleanup');
    expect(causeOf(fail('TimeoutError: locator.click: Timeout 15000ms exceeded.'), nextPass)).toBe('flaky');
    // 다음 통과가 48시간 뒤면 간헐로 보지 않는다
    expect(causeOf(fail('TimeoutError: x'), [rec('a', '2026-10-04T00:00:00Z', 'pass')])).toBe('unclassified');
    expect(causeOf(fail('TimeoutError: x'), [])).toBe('unclassified');
  });

  test('오류 시그니처는 숫자·run_id·따옴표 안 이름을 지운다', () => {
    const a = errorSignature('Error: cr09291650b80d 상태 /Running/ 대기 600초 초과. 마지막: (행 없음)');
    const b = errorSignature('Error: cr09301042818a 상태 /Running/ 대기 600초 초과. 마지막: (행 없음)');
    expect(a).toBe(b);
    expect(errorSignature('Error: "vpn0930" 텍스트가 보이면 안 됩니다')).toBe(errorSignature('Error: "vpn1001" 텍스트가 보이면 안 됩니다'));
    expect(errorSignature(undefined)).toBe('(오류 문구 없음)');
  });

  test('실패 기록마다 원인을 붙이고 최신 순으로 돌려준다', () => {
    const v = failureViews([
      rec('a', '2026-10-01T00:00:00Z', 'fail', { error: 'TimeoutError: x' }),
      rec('a', '2026-10-01T01:00:00Z', 'pass'),
      rec('b', '2026-10-01T02:00:00Z', 'fail', { error: 'TimeoutError: y' }),
    ]);
    expect(v.map((x) => [x.record.spec, x.cause])).toEqual([
      ['b', 'unclassified'],
      ['a', 'flaky'],
    ]);
  });

  test('불안정 spec: 최근 기록에 실패가 섞이고 마지막이 통과', () => {
    expect(isFlakySpec([rec('a', '1', 'fail'), rec('a', '2', 'pass')])).toBe(true);
    expect(isFlakySpec([rec('a', '1', 'pass'), rec('a', '2', 'fail')])).toBe(false);
    expect(isFlakySpec([rec('a', '1', 'pass')])).toBe(false);
  });

  test('API 대응표의 ✅ 🔧 ⏭ 행만 읽는다', () => {
    const rows = parseParity(
      [
        '| 분류 | API 리소스 | UI spec | 상태 |',
        '| --- | --- | --- | --- |',
        '| Compute | servers | compute.vm-stack | ✅ |',
        '| Storage | backup | 제외 | ⏭ |',
        '| Network | x | y | 🔧 |',
        '상태: ✅ UI spec 통과 · 🔧 진행 중',
      ].join('\n'),
    );
    expect(rows.map((r) => r.status)).toEqual(['done', 'skip', 'wip']);
    expect(rows[0]).toMatchObject({ category: 'Compute', ui: 'compute.vm-stack' });
  });

  test('같은 스위트의 시도를 합쳐 첫 시도·최종 통과를 계산한다', () => {
    const base = { started: '2026-10-02T07:00:00Z', ended: '', wall_minutes: 60, serial_minutes: 300, max_tabs: 5, leftovers_end: [] };
    const [v] = suiteViews([
      { ...base, suite_id: 'S1', attempt: 1, results: [{ spec: 'a', status: 'pass', seconds: 1 }, { spec: 'b', status: 'fail', seconds: 1 }, { spec: 'c', status: 'fail', seconds: 1 }] },
      { ...base, suite_id: 'S1', attempt: 2, wall_minutes: 10, results: [{ spec: 'b', status: 'pass', seconds: 1 }, { spec: 'c', status: 'fail', seconds: 1 }] },
    ]);
    expect(v).toMatchObject({ specs: 3, first_pass: 1, final_pass: 2, attempts: 2, wall_minutes: 70, still_failing: ['c'] });
  });
});

test.describe('탐색 발견 사항·커버리지 추세', () => {
  test('보고서의 판정 줄을 id·종류·동작·스크린샷으로 나눈다', async () => {
    const { parseFindings, parseFindingStatus } = await import('../../src/report/insights');
    const md = [
      '# 탐색 보고서: vpc-list',
      '## 이상·정보 판정',
      '- #9 정보 **validation-text** — 3~20자로 입력하세요 (동작: button "생성", [스크린샷](screenshots' + String.fromCharCode(92) + '09.jpg))',
      '- #12 이상 **console-error** — TypeError (동작: click)',
    ].join('\n');
    const f = parseFindings(md, 'vpc-list-1');
    expect(f).toHaveLength(2);
    expect(f[0]).toMatchObject({ id: 'vpc-list-1#9', severity: '정보', kind: 'validation-text', text: '3~20자로 입력하세요', action: 'button "생성"', screenshot: 'recordings/explore/vpc-list-1/screenshots/09.jpg' });
    expect(f[1]).toMatchObject({ id: 'vpc-list-1#12', severity: '이상', action: 'click' });
    const st = parseFindingStatus('vpc-list-1#9: 정상 | 안내 문구\n"vpc-list-1#12": 결함\n# 주석');
    expect(st.get('vpc-list-1#9')).toEqual({ status: '정상', note: '안내 문구' });
    expect(st.get('vpc-list-1#12')?.status).toBe('결함');
  });

  test('장부 본문에서 level 분포를 센다', async () => {
    const { countLevels } = await import('../../src/report/insights');
    expect(countLevels('  - key: a\n    level: 1\n  - key: b\n    level: 3\n  - key: c\n    level: 2\n')).toEqual({ resources: 3, at_least_2: 2, at_least_3: 1 });
  });
});
