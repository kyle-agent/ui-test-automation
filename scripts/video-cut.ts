/**
 * 녹화 영상(PW_VIDEO_DIR, src/console/screencast.ts)을 시나리오 단계 경계로 잘라 데모용 짧은 영상을 만든다.
 *
 *   npx tsx scripts/video-cut.ts <video.webm> --until "steps[5]" [--from "steps[2]"] [--out <file>] [--report <json>]
 *
 *  --until  이 제목으로 시작하는 단계(test.step)가 "시작되는 시각"에서 끊는다 (예: steps[5] 앞 = 생성 단계까지)
 *  --from   이 단계가 시작되는 시각부터 (없으면 영상 처음부터)
 *  --report Playwright JSON 보고서. 없으면 test-results/stacks/ 에서 영상과 같은 spec 의 가장 최근 것
 *  --out    출력 파일. 없으면 <video>-cut.webm
 *
 * 영상 0초의 실제 시각·배속은 녹화기가 남긴 <video>.json 에서 읽는다. 스트림 복사(-c copy)라 재인코딩 없이 몇 초면 끝난다.
 * VP8 키프레임 단위로 잘리므로 --from 은 몇 초 앞뒤로 어긋날 수 있다(--until 은 정확).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findFfmpeg } from '../src/console/screencast';

type Step = { title: string; startTime?: string; duration?: number; steps?: Step[] };
type Report = { suites?: Suite[] };
type Suite = {
  suites?: Suite[];
  specs?: { file?: string; tests?: { results?: { startTime?: string; steps?: Step[] }[] }[] }[];
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * JSON 보고서의 step 에는 duration 만 있고 시작 시각이 없다 → 결과(result.startTime)부터 최상위 step 의 duration 을 차례로 더해
 * 각 최상위 step 의 시작 시각을 만든다(step 사이 틈은 무시하므로 몇 초 어긋날 수 있다). test.step 은 순서대로 실행되니 이 정도면 데모 자르기엔 충분.
 */
function walkSteps(suite: Suite, out: Step[]): void {
  for (const s of suite.specs ?? [])
    for (const t of s.tests ?? [])
      for (const r of t.results ?? []) {
        if (!r.startTime) continue;
        let at = Date.parse(r.startTime);
        for (const step of r.steps ?? []) {
          out.push({ ...step, startTime: new Date(at).toISOString() });
          at += step.duration ?? 0;
        }
      }
  for (const child of suite.suites ?? []) walkSteps(child, out);
}

function latestReportFor(video: string): string | null {
  // 영상 이름 <YYYYMMDD-HHMM>-<spec>.webm → test-results/stacks/<stamp>-<spec>.json 중 영상 시각 이전의 가장 최근 것
  const base = path.basename(video, '.webm');
  const m = /^(\d{8}-\d{4})-(.+)$/.exec(base);
  if (!m) return null;
  const dir = path.resolve('test-results', 'stacks');
  if (!fs.existsSync(dir)) return null;
  const cands = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(`-${m[2]}.json`))
    .sort();
  return cands.length ? path.join(dir, cands[cands.length - 1]!) : null;
}

function main(): void {
  const video = process.argv[2];
  const until = arg('until');
  if (!video || !until) {
    console.error(
      '사용법: npx tsx scripts/video-cut.ts <video.webm> --until "steps[5]" [--from "steps[2]"] [--out f] [--report f]',
    );
    process.exit(2);
  }
  const side = JSON.parse(fs.readFileSync(`${video}.json`, 'utf8')) as { videoStart: string; speed: number };
  const reportFile = arg('report') ?? latestReportFor(video);
  if (!reportFile || !fs.existsSync(reportFile))
    throw new Error('Playwright JSON 보고서를 못 찾았습니다. --report 로 주세요.');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')) as Report;
  const steps: Step[] = [];
  for (const s of report.suites ?? []) walkSteps(s, steps);

  const videoStart = Date.parse(side.videoStart) / 1000;
  const toVideoSec = (iso: string) => (Date.parse(iso) / 1000 - videoStart) / (side.speed || 1);
  const find = (prefix: string) => {
    const s = steps.find((x) => x.title.startsWith(prefix) && x.startTime);
    if (!s) throw new Error(`단계 "${prefix}" 를 보고서(${reportFile})에서 못 찾았습니다`);
    return s;
  };
  const endStep = find(until);
  const endSec = toVideoSec(endStep.startTime!);
  const from = arg('from');
  const startSec = from ? Math.max(0, toVideoSec(find(from).startTime!)) : 0;
  if (endSec <= startSec)
    throw new Error(`구간이 비었습니다 (${startSec.toFixed(1)}s → ${endSec.toFixed(1)}s)`);

  const out = arg('out') ?? video.replace(/\.webm$/, '-cut.webm');
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) throw new Error('ffmpeg 가 없습니다 (npx playwright install ffmpeg)');
  const args = ['-loglevel', 'error', '-y'];
  if (startSec > 0) args.push('-ss', startSec.toFixed(3));
  args.push('-i', video, '-c', 'copy', '-t', (endSec - startSec).toFixed(3), out);
  const r = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg 실패 (${r.status})`);
  console.log(
    `${out}: ${startSec.toFixed(1)}s → ${endSec.toFixed(1)}s (${Math.round(endSec - startSec)}초, "${endStep.title}" 직전까지, 보고서 ${path.relative(process.cwd(), reportFile)})`,
  );
}

main();
