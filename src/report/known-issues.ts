/**
 * 알려진 이슈 목록(data/known-issues.yaml). 실행 기록의 실패를 분류할 때 쓴다.
 *
 *   - id: KI-001
 *     spec: compute.vm-volume        # spec id 또는 "*" (모든 spec)
 *     match: "In Use.*Available"     # 오류 메시지(첫 줄 포함 전체)에 대한 정규식
 *     kind: product                  # product(제품 결함) | test(테스트 결함) | environment(세션·브라우저·네트워크)
 *     since: 2026-09-23
 *     note: 무엇이 왜 알려진 문제인지
 *     expires: 2026-10-31            # 선택. 지나면 매칭하지 않는다
 *     enabled: true                  # 선택. false 면 형식만 남기고 매칭하지 않는다
 *
 * 매칭되면 실행 기록의 class 가 kind 로, known_issue 가 id 로 기록된다. 실패 자체를 숨기지는 않는다(RESULTS.md 에 FAIL(known: KI-xxx) 로 남는다).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export const KNOWN_ISSUES_YAML = path.resolve(process.cwd(), 'data', 'known-issues.yaml');

export type IssueKind = 'product' | 'test' | 'environment';
export const ISSUE_KINDS: readonly IssueKind[] = ['product', 'test', 'environment'];

export interface KnownIssue {
  id: string;
  spec: string;
  match: string;
  kind: IssueKind;
  since: string;
  note: string;
  expires?: string;
  enabled: boolean;
}

export function parseKnownIssues(text: string, file = 'known-issues.yaml'): KnownIssue[] {
  const fail = (msg: string): never => {
    throw new Error(`${file}: ${msg}`);
  };
  const raw: unknown = parseYaml(text);
  if (raw === null || raw === undefined) return [];
  if (!isRecord(raw) || !Array.isArray(raw.issues)) return fail('최상위에 issues 배열이 필요합니다');
  const ids = new Set<string>();
  return (raw.issues as unknown[]).map((item, i): KnownIssue => {
    if (!isRecord(item)) return fail(`issues[${i}] 가 객체가 아닙니다`);
    const id = str(item.id) ?? fail(`issues[${i}].id 가 없습니다`);
    if (!/^KI-\d{3,}$/.test(id)) fail(`${id}: id 는 KI-000 형식이어야 합니다`);
    if (ids.has(id)) fail(`${id}: id 중복`);
    ids.add(id);
    const spec = str(item.spec) ?? fail(`${id}: spec 이 없습니다 (spec id 또는 "*")`);
    const match = str(item.match) ?? fail(`${id}: match(정규식)가 없습니다`);
    try {
      new RegExp(match);
    } catch (err) {
      fail(`${id}: match 정규식 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
    const kind = str(item.kind);
    if (!kind || !ISSUE_KINDS.includes(kind as IssueKind))
      fail(`${id}: kind 는 product|test|environment 여야 합니다 (현재 ${String(item.kind)})`);
    const since = dateStr(item.since) ?? fail(`${id}: since 는 YYYY-MM-DD 여야 합니다`);
    const expires = item.expires === undefined || item.expires === null ? undefined : dateStr(item.expires);
    if (item.expires !== undefined && item.expires !== null && !expires)
      fail(`${id}: expires 는 YYYY-MM-DD 여야 합니다`);
    const enabled = item.enabled === undefined ? true : item.enabled === true;
    return {
      id,
      spec,
      match,
      kind: kind as IssueKind,
      since,
      note: item.note === undefined || item.note === null ? '' : String(item.note),
      ...(expires ? { expires } : {}),
      enabled,
    };
  });
}

/** 파일이 없으면 빈 목록. */
export function loadKnownIssues(file = KNOWN_ISSUES_YAML): KnownIssue[] {
  if (!fs.existsSync(file)) return [];
  return parseKnownIssues(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file));
}

/** 활성이고 만료되지 않았고 spec 이 맞는 항목 중 오류 텍스트에 처음 매칭되는 것. 없으면 null. */
export function matchKnownIssue(
  issues: readonly KnownIssue[],
  specId: string,
  errorText: string,
  today = new Date().toISOString().slice(0, 10),
): KnownIssue | null {
  if (!errorText) return null;
  for (const issue of issues) {
    if (!issue.enabled) continue;
    if (issue.expires && issue.expires < today) continue;
    if (issue.spec !== '*' && issue.spec !== specId) continue;
    if (new RegExp(issue.match, 'm').test(errorText)) return issue;
  }
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function dateStr(v: unknown): string | undefined {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' ? v.trim() : undefined;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}
