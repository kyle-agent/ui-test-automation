/**
 * 메뉴 스냅샷 두 개를 비교해 화면 추가/삭제/이름·경로 변경을 보고한다. 브라우저 불필요.
 *
 *   npm run menu:diff                                  # snapshots/ 의 최근 두 개
 *   npm run menu:diff -- before.json after.json
 *   npm run menu:diff -- --fail-on-change --json out.json --md out.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { diffScreenMaps, formatDiffMarkdown, hasChanges, type ScreenMap } from '../src/service-map/screens';
import { listSnapshots, parseArgs, readJson, writeJson } from '../src/service-map/io';

const { flags, positional } = parseArgs(process.argv.slice(2));
let [beforeFile, afterFile] = positional;
if (!beforeFile || !afterFile) {
  const snaps = listSnapshots();
  if (snaps.length < 2) {
    console.log(
      `비교할 스냅샷이 ${snaps.length}개뿐입니다 (service-map/snapshots/). 변경 없음으로 처리합니다.`,
    );
    process.exit(0);
  }
  beforeFile = snaps[snaps.length - 2]!;
  afterFile = snaps[snaps.length - 1]!;
}
const before = readJson<ScreenMap>(beforeFile);
const after = readJson<ScreenMap>(afterFile);
const diff = diffScreenMaps(before, after);
const label = (f: string) => path.basename(f, '.json');
const md = formatDiffMarkdown(diff, label(beforeFile), label(afterFile));
process.stdout.write(md);
if (typeof flags.json === 'string') writeJson(flags.json, { before: beforeFile, after: afterFile, ...diff });
if (typeof flags.md === 'string') {
  fs.mkdirSync(path.dirname(flags.md), { recursive: true });
  fs.writeFileSync(flags.md, md);
}
if (flags['fail-on-change'] && hasChanges(diff)) process.exit(1);
