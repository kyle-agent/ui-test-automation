/**
 * document.title 레지스트리.
 *  - service-map/titles.json : 라우트별로 확인된 정확한 제목. 있으면 정확히 일치해야 한다(회귀 판정).
 *  - test-results/observed-titles.jsonl : 실행 중 관측한 제목. `npm run titles:merge` 로 레지스트리에 반영한다.
 * 제목 형식: 서비스 화면은 "<화면명> | <서비스명> | <리전> | Console", 셸 화면(모든 서비스, Console Home)은
 * "<화면명> | <리전> | Console" 처럼 서비스명이 빠진다 (2026-09-21 실측: "모든 서비스 | Global | Console").
 */
import fs from 'node:fs';
import path from 'node:path';
import { TITLES_JSON } from '../service-map/io';

export const TITLE_PATTERN = /^.+ \| .+ \| Console$/;

export const OBSERVED_TITLES = path.resolve(process.cwd(), 'test-results', 'observed-titles.jsonl');

export interface ObservedTitle {
  route: string;
  title: string;
  scenario?: string;
  step?: number;
  at: string;
}

let registry: Record<string, string> | null = null;

export function knownTitles(): Record<string, string> {
  if (registry) return registry;
  registry = fs.existsSync(TITLES_JSON)
    ? (JSON.parse(fs.readFileSync(TITLES_JSON, 'utf8')) as Record<string, string>)
    : {};
  return registry;
}

export function knownTitle(route: string): string | undefined {
  return knownTitles()[normalizeRouteKey(route)];
}

export function recordObservedTitle(entry: Omit<ObservedTitle, 'at'>): void {
  fs.mkdirSync(path.dirname(OBSERVED_TITLES), { recursive: true });
  const line: ObservedTitle = {
    ...entry,
    route: normalizeRouteKey(entry.route),
    at: new Date().toISOString(),
  };
  fs.appendFileSync(OBSERVED_TITLES, JSON.stringify(line) + '\n');
}

export function readObservedTitles(file = OBSERVED_TITLES): ObservedTitle[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ObservedTitle);
}

export function parseTitle(title: string): { screen: string; service?: string; region: string } | null {
  const parts = title.split(' | ');
  if (parts[parts.length - 1] !== 'Console') return null;
  if (parts.length === 4) return { screen: parts[0]!, service: parts[1]!, region: parts[2]! };
  if (parts.length === 3) return { screen: parts[0]!, region: parts[1]! };
  return null;
}

export function normalizeRouteKey(route: string): string {
  let r = route.trim();
  if (r.startsWith('#')) r = r.slice(1);
  if (!r.startsWith('/')) r = `/${r}`;
  return r.replace(/\/+$/, '') || '/';
}
