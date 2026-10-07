/**
 * 모수 제외 목록(data/population-exclusions.yaml): 사람이 "대상 모수에서 뺀다" 고 정한 상품.
 * 빠진 상품은 커버리지 분모(coverage 요약·화면 vs API·동작 n/m)에서 제외하고, 대시보드에는 회색으로 따로 보여 준다.
 */
import fs from 'node:fs';
import path from 'node:path';

export const EXCLUSIONS_FILE = path.resolve(process.cwd(), 'data', 'population-exclusions.yaml');

export function parseExclusions(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const i = line.indexOf(':');
    if (i <= 0) continue;
    m.set(line.slice(0, i).trim().replace(/^"|"$/g, ''), line.slice(i + 1).trim());
  }
  return m;
}

export function readExclusions(file = EXCLUSIONS_FILE): Map<string, string> {
  return fs.existsSync(file) ? parseExclusions(fs.readFileSync(file, 'utf8')) : new Map();
}
