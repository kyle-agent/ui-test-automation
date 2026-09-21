import fs from 'node:fs';
import path from 'node:path';
import type { ScreenMap } from './screens';

export const SERVICE_MAP_DIR = path.resolve(process.cwd(), 'service-map');
export const SCREENS_JSON = path.join(SERVICE_MAP_DIR, 'screens.json');
export const SCREENS_TXT = path.join(SERVICE_MAP_DIR, 'screens.txt');
export const SNAPSHOTS_DIR = path.join(SERVICE_MAP_DIR, 'snapshots');
export const RAW_DIR = path.join(SERVICE_MAP_DIR, 'raw');
export const TITLES_JSON = path.join(SERVICE_MAP_DIR, 'titles.json');

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

export function readScreenMap(file = SCREENS_JSON): ScreenMap {
  if (!fs.existsSync(file)) {
    throw new Error(
      `${path.relative(process.cwd(), file)} 이(가) 없습니다. npm run menu:import-txt 또는 npm run menu:snapshot 을 먼저 실행하세요.`,
    );
  }
  return readJson<ScreenMap>(file);
}

/** service-map/snapshots/*.json 을 날짜순으로 돌려준다. */
export function listSnapshots(): string[] {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
  return fs
    .readdirSync(SNAPSHOTS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}(-\d+)?\.json$/.test(f))
    .sort()
    .map((f) => path.join(SNAPSHOTS_DIR, f));
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 같은 날 두 번 저장하면 -2, -3 … 을 붙인다. */
export function snapshotPath(date = today()): string {
  let file = path.join(SNAPSHOTS_DIR, `${date}.json`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(SNAPSHOTS_DIR, `${date}-${n}.json`);
  return file;
}

export function parseArgs(argv: string[]): { flags: Record<string, string | true>; positional: string[] } {
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (argv[i + 1] && !argv[i + 1]!.startsWith('--')) flags[a.slice(2)] = argv[++i]!;
      else flags[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}
