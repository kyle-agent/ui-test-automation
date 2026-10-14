/**
 * spec 실행 화면을 동영상(webm)으로 남긴다 (2026-10-14, 팀 공유용).
 *
 * 왜 Playwright 의 recordVideo 를 안 쓰나: 회귀 spec 은 살아 있는 로그인 브라우저의 기존 컨텍스트(PW_CDP_URL)에 붙어 돌고,
 * recordVideo 는 새 컨텍스트를 만들 때만 줄 수 있다. 쿠키를 복사해 새 컨텍스트를 만들면 콘솔이 세션을 무효화할 수 있다(src/console/browser.ts 머리말).
 * 그래서 Playwright 가 내부적으로 쓰는 것과 같은 CDP Page.startScreencast 로 화면이 바뀔 때마다 JPEG 프레임을 받고,
 * Playwright 가 내려받는 ffmpeg 로 webm(vp8) 을 만든다. 그 ffmpeg 는 최소 빌드라 concat demuxer 가 없다(2026-10-14 실측: "Unrecognized option 'safe'").
 * Playwright 와 같은 방식(image2pipe 로 JPEG 를 stdin 에 밀어 넣기)을 쓰고, 프레임 시각에 맞춰 같은 프레임을 반복해 고정 10fps 를 만든다.
 *
 * 켜는 법: PW_VIDEO_DIR=reports/videos (fixture 가 본다). PW_VIDEO_SPEED=2 면 2배속. PW_FFMPEG 로 ffmpeg 경로를 지정할 수 있다.
 *   ffmpeg 가 없으면 `npx playwright install ffmpeg`.
 * 프레임은 탭이 화면에 보일 때만 온다(Chromium 스크린캐스트 특성). 가려진 동안은 마지막 프레임이 그대로 이어진다.
 * 본문·비밀은 담지 않지만 화면에 보이는 것(계정·프로젝트명)은 그대로 찍히므로 공유 전에 한 번 보라.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';

export const VIDEO_DIR = process.env.PW_VIDEO_DIR?.trim() || '';
const FPS = 10;
const WIDTH = 1440;
const HEIGHT = 900;

export function recordingVideo(): boolean {
  return VIDEO_DIR !== '';
}

export type Frame = { file: string; t: number };

/** Playwright 가 내려받은 ffmpeg 를 찾는다 (PW_FFMPEG > PLAYWRIGHT_BROWSERS_PATH > 기본 캐시 폴더) */
export function findFfmpeg(): string | null {
  const explicit = process.env.PW_FFMPEG?.trim();
  if (explicit && fs.existsSync(explicit)) return explicit;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright')
      : process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
        : path.join(os.homedir(), '.cache', 'ms-playwright'),
  ].filter((r): r is string => !!r);
  const exe =
    process.platform === 'win32'
      ? 'ffmpeg-win64.exe'
      : process.platform === 'darwin'
        ? 'ffmpeg-mac'
        : 'ffmpeg-linux';
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs
      .readdirSync(root)
      .filter((d) => d.startsWith('ffmpeg-'))
      .sort()
      .reverse();
    for (const d of dirs) {
      const p = path.join(root, d, exe);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * 페이지의 스크린캐스트를 시작한다. 돌려주는 함수를 부르면 멈추고 webm 을 만들어 그 경로를 돌려준다(프레임이 없거나 ffmpeg 가 없으면 null).
 * framesDir 의 JPEG 는 인코딩에 성공하면 지우고, 실패하면 남겨 둔다.
 */
export async function startScreencast(
  page: Page,
  framesDir: string,
  log: (line: string) => void = () => undefined,
): Promise<(outFile: string) => Promise<string | null>> {
  fs.mkdirSync(framesDir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames: Frame[] = [];
  cdp.on(
    'Page.screencastFrame',
    (ev: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
      const file = path.join(framesDir, `f${String(frames.length).padStart(6, '0')}.jpg`);
      try {
        fs.writeFileSync(file, Buffer.from(ev.data, 'base64'));
        frames.push({ file, t: ev.metadata.timestamp ?? Date.now() / 1000 });
      } catch {
        /* 디스크 문제면 프레임 하나를 버린다 */
      }
      cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => undefined);
    },
  );
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 80,
    maxWidth: WIDTH,
    maxHeight: HEIGHT,
    everyNthFrame: 1,
  });
  const startedAt = Date.now() / 1000;

  return async (outFile: string) => {
    await cdp.send('Page.stopScreencast').catch(() => undefined);
    await cdp.detach().catch(() => undefined);
    const endedAt = Date.now() / 1000;
    const out = await encodeFrames(frames, startedAt, endedAt, outFile, log);
    if (out) fs.rmSync(framesDir, { recursive: true, force: true });
    else log(`[video] 프레임은 남겨 둠: ${framesDir}`);
    return out;
  };
}

/**
 * 프레임(시각 순)을 고정 fps 의 webm 으로 만든다. 각 출력 프레임 시각에 "그때 화면에 있던" 마지막 프레임을 쓴다.
 * speed 배속이면 실제 speed 초가 영상 1초.
 */
export async function encodeFrames(
  frames: readonly Frame[],
  startedAt: number,
  endedAt: number,
  outFile: string,
  log: (line: string) => void = () => undefined,
  speed = Math.max(0.25, Number(process.env.PW_VIDEO_SPEED) || 1),
): Promise<string | null> {
  if (!frames.length) {
    log('[video] 프레임이 없어 동영상을 만들지 않습니다 (탭이 화면에 보이지 않았나?)');
    return null;
  }
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    log('[video] ffmpeg 가 없습니다. `npx playwright install ffmpeg` 뒤 다시 실행하세요.');
    return null;
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const first = frames[0]!.t;
  const last = frames[frames.length - 1]!.t;
  const end = Math.max(endedAt, last + 0.5);
  const step = speed / FPS; // 출력 프레임 하나가 덮는 실제 시간
  const total = Math.max(1, Math.ceil((end - first) / step));
  if (total > 60 * 60 * FPS) {
    log(`[video] 너무 길어(${Math.round(total / FPS)}초) 만들지 않습니다. PW_VIDEO_SPEED 를 올리세요.`);
    return null;
  }

  // Playwright 의 VideoRecorder 와 같은 인자. 크기가 다른 프레임이 섞여도 되게 고정 캔버스에 맞춰 넣는다.
  const args = [
    '-loglevel',
    'error',
    '-f',
    'image2pipe',
    '-framerate',
    String(FPS),
    '-c:v',
    'mjpeg',
    '-i',
    'pipe:0',
    '-y',
    '-an',
    '-r',
    String(FPS),
    '-c:v',
    'vp8',
    '-qmin',
    '0',
    '-qmax',
    '50',
    '-crf',
    '8',
    '-deadline',
    'realtime',
    '-speed',
    '8',
    '-b:v',
    '1M',
    '-threads',
    '1',
    '-vf',
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=gray`,
    outFile,
  ];
  const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  let stderr = '';
  proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
  let stdinError: Error | null = null;
  proc.stdin.on('error', (e) => (stdinError = e));
  const done = new Promise<number | null>((resolve) => proc.on('close', (code) => resolve(code)));
  const write = (buf: Buffer) =>
    new Promise<void>((resolve) => {
      if (stdinError || proc.stdin.destroyed) return resolve();
      if (proc.stdin.write(buf)) resolve();
      else proc.stdin.once('drain', () => resolve());
    });

  let idx = 0;
  let cached: { idx: number; buf: Buffer } | null = null;
  for (let n = 0; n < total && !stdinError; n++) {
    const t = first + n * step;
    while (idx + 1 < frames.length && frames[idx + 1]!.t <= t) idx++;
    if (!cached || cached.idx !== idx) {
      try {
        cached = { idx, buf: fs.readFileSync(frames[idx]!.file) };
      } catch {
        continue; // 프레임 파일이 없으면 그 순간은 건너뛴다
      }
    }
    await write(cached.buf);
  }
  proc.stdin.end();
  const code = await done;
  if (code !== 0 || !fs.existsSync(outFile)) {
    log(`[video] ffmpeg 실패 (${code}): ${stderr.trim().split('\n').slice(-3).join(' | ')}`);
    return null;
  }
  log(
    `[video] ${outFile} (프레임 ${frames.length}개 → ${Math.round(total / FPS)}초${speed !== 1 ? `, ${speed}배속` : ''})`,
  );
  return outFile;
}
