/**
 * reports/RESULTS.md 의 표 만들기. 실행 기록(RunRecord) 목록을 받아 Markdown 줄을 돌려준다. 파일 입출력은 scripts/results.ts 가 한다.
 */
import type { KnownIssue } from './known-issues';
import type { RunRecord } from './run-record';

export function fmtSeconds(s: number | undefined): string {
  if (s === undefined) return '-';
  const m = Math.floor(s / 60);
  return m ? `${m}분 ${Math.round(s % 60)}초` : `${Math.round(s)}초`;
}

/** 로컬 시간 YYYY-MM-DD HH:MM */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** PASS / FAIL(known: KI-001) / FAIL(environment) */
export function statusCell(r: RunRecord): string {
  if (r.status === 'pass') return 'PASS';
  return r.known_issue ? `FAIL(known: ${r.known_issue})` : `FAIL(${r.class})`;
}

/** 최근 n회 결과를 "PPFPP" 처럼 (오래된 것 → 최근) */
export function recentString(runs: readonly RunRecord[], n = 5): string {
  return runs
    .slice(-n)
    .map((r) => (r.status === 'pass' ? 'P' : 'F'))
    .join('');
}

/** 통과한 실행의 평균 소요(초). 통과가 없으면 undefined */
export function meanPassSeconds(runs: readonly RunRecord[]): number | undefined {
  const passes = runs.filter((r) => r.status === 'pass');
  return passes.length ? passes.reduce((n, r) => n + r.seconds, 0) / passes.length : undefined;
}

export function groupBySpec(records: readonly RunRecord[]): Map<string, RunRecord[]> {
  const bySpec = new Map<string, RunRecord[]>();
  for (const r of [...records].sort((a, b) => a.started.localeCompare(b.started)))
    bySpec.set(r.spec, [...(bySpec.get(r.spec) ?? []), r]);
  return bySpec;
}

/** spec 별 최근 상태 표. specOrder 에 있는 spec 은 기록이 없어도 "기록 없음" 으로 넣고, 그 외 spec 은 뒤에 이름순. */
export function resultsTable(records: readonly RunRecord[], specOrder: readonly string[]): string[] {
  const bySpec = groupBySpec(records);
  const specs = [...specOrder, ...[...bySpec.keys()].filter((s) => !specOrder.includes(s)).sort()];
  const lines = [
    '| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |',
    '| --- | --- | --- | ---: | --- | ---: |',
  ];
  for (const spec of specs) {
    const runs = bySpec.get(spec) ?? [];
    const last = runs[runs.length - 1];
    if (!last) {
      lines.push(`| ${spec} | 기록 없음 | - | - | - | - |`);
      continue;
    }
    lines.push(
      `| ${spec} | ${fmtTime(last.started)} | ${statusCell(last)} | ${fmtSeconds(last.seconds)} | ${recentString(runs)} | ${fmtSeconds(meanPassSeconds(runs))} |`,
    );
  }
  return lines;
}

/** 최근 실패 표 (최신 먼저, 최대 limit) */
export function failuresTable(records: readonly RunRecord[], limit = 10): string[] {
  const failed = records
    .filter((r) => r.status === 'fail')
    .slice(-limit)
    .reverse();
  if (failed.length === 0) return ['최근 실패 없음'];
  const lines = ['| 실행 | spec | class | 오류 | 첨부 |', '| --- | --- | --- | --- | --- |'];
  for (const r of failed) {
    const err = (r.error ?? '').replace(/\|/g, '\\|').slice(0, 160);
    const att = (r.attachments ?? []).map((a) => `\`${a}\``).join(', ');
    const cls = r.known_issue ? `${r.class} (${r.known_issue})` : r.class;
    lines.push(`| ${fmtTime(r.started)} | ${r.spec} | ${cls} | ${err} | ${att} |`);
  }
  return lines;
}

/** 알려진 이슈 절: 등록/활성 개수와 실행 기록에 실제 적용된 항목 */
export function knownIssuesSection(records: readonly RunRecord[], issues: readonly KnownIssue[]): string[] {
  const enabled = issues.filter((i) => i.enabled);
  const applied = new Map<string, RunRecord[]>();
  for (const r of records)
    if (r.known_issue) applied.set(r.known_issue, [...(applied.get(r.known_issue) ?? []), r]);
  const lines: string[] = [];
  lines.push(`등록 ${issues.length}개 (활성 ${enabled.length}개) — data/known-issues.yaml`);
  lines.push('');
  if (applied.size === 0) {
    lines.push('적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)');
    return lines;
  }
  lines.push('| id | kind | spec | 적용 횟수 | 마지막 적용 | note |');
  lines.push('| --- | --- | --- | ---: | --- | --- |');
  for (const [id, runs] of [...applied].sort(([a], [b]) => a.localeCompare(b))) {
    const issue = issues.find((i) => i.id === id);
    const last = runs[runs.length - 1]!;
    lines.push(
      `| ${id} | ${issue?.kind ?? '?'} | ${issue?.spec ?? '?'} | ${runs.length} | ${fmtTime(last.started)} ${last.spec} | ${issue?.note ?? '(known-issues.yaml 에 없음)'} |`,
    );
  }
  return lines;
}
