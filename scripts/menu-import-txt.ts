/**
 * 부트스트랩: 사람이 평탄화해 둔 service-map/screens.txt 를 정규화본(screens.json)과 첫 스냅샷으로 변환한다.
 * 메뉴 API 스냅샷(npm run menu:snapshot)을 한 번이라도 받은 뒤에는 이 스크립트를 쓸 일이 없다.
 *
 *   npm run menu:import-txt -- [--date 2026-09-21]
 */
import fs from 'node:fs';
import path from 'node:path';
import { countScreens, parseScreensTxt } from '../src/service-map/screens';
import { SCREENS_JSON, SCREENS_TXT, parseArgs, snapshotPath, writeJson } from '../src/service-map/io';

const { flags } = parseArgs(process.argv.slice(2));
const text = fs.readFileSync(SCREENS_TXT, 'utf8');
const map = parseScreensTxt(text);
const headerDate = /(\d{4}-\d{2}-\d{2})/.exec(text.split('\n')[0] ?? '')?.[1];
const date = typeof flags.date === 'string' ? flags.date : headerDate;
if (date) map.generated_at = `${date}T00:00:00.000Z`;

writeJson(SCREENS_JSON, map);
const snap = snapshotPath(date);
writeJson(snap, map);
console.log(
  `services ${map.services.length}, screens ${countScreens(map)} → ${path.relative(process.cwd(), SCREENS_JSON)}, ${path.relative(process.cwd(), snap)}`,
);
