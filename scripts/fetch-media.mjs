import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TRACKS = JSON.parse(readFileSync(join(root, 'src/engine/tracks.json'), 'utf8'));
const out = join(root, 'public/media');
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);

const onPath = !spawnSync('ffmpeg', ['-version']).error;
const FFMPEG = onPath ? 'ffmpeg' : ffmpegStatic;
if (!FFMPEG) {
  console.error(
    'No ffmpeg available. Run npm install again, or install ffmpeg: https://ffmpeg.org/download.html',
  );
  process.exit(1);
}
console.log(`Using ${onPath ? 'ffmpeg from PATH' : 'bundled ffmpeg-static'}`);

function ffmpeg(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  });
  return !r.error && r.status === 0;
}
const size = (f) => (existsSync(f) ? statSync(f).size : 0);

let failed = 0;
for (const t of TRACKS) {
  if (only.length && !only.includes(t.id)) continue;
  const mp4 = join(out, `${t.id}.mp4`),
    jpg = join(out, `${t.id}.jpg`);
  console.log(`\n${t.id}  <-  ${t.source}`);
  if (t.kind === 'video') {
    const enc = (ss) =>
      ffmpeg([
        '-ss',
        String(ss),
        '-t',
        String(t.t),
        '-i',
        t.source,
        '-an',
        '-vf',
        'scale=960:-2:flags=lanczos,fps=24',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '27',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        mp4,
      ]);
    if (!enc(t.ss) || size(mp4) < 20000) {
      console.log('  retrying from the start of the clip');
      enc(0);
    }
    if (size(mp4) < 20000) {
      console.error('  FAILED video');
      failed++;
      continue;
    }
    ffmpeg(['-ss', '2', '-i', mp4, '-frames:v', '1', '-q:v', '4', jpg]);
    console.log(`  ok  ${(size(mp4) / 1e6).toFixed(1)} MB video + poster`);
  } else {
    if (
      !ffmpeg([
        '-i',
        t.source,
        '-vf',
        'scale=1280:-2:flags=lanczos',
        '-frames:v',
        '1',
        '-q:v',
        '3',
        jpg,
      ]) ||
      !size(jpg)
    ) {
      console.error('  FAILED still');
      failed++;
      continue;
    }
    console.log(`  ok  ${(size(jpg) / 1e3).toFixed(0)} KB still`);
  }
}
console.log(
  failed
    ? `\n${failed} track(s) failed. Re-run with the track id to retry.`
    : '\nAll media ready in public/media/.',
);
process.exit(failed ? 1 : 0);
