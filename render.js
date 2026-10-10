#!/usr/bin/env node
/*
 * Render video "If Historical Flags Had Sound"
 *
 *   node render.js                         -> Puppeteer (Chrome) + ffmpeg  (default, dipakai di GitHub Actions)
 *   node render.js --backend=canvas        -> @napi-rs/canvas + ffmpeg     (tanpa browser, lebih cepat)
 *
 * Opsi: --fps=60  --seconds=6 (render sebagian untuk tes)  --tail=1.2 (detik tahan di akhir)
 *       --out=out/flags-sound.mp4  --footer="@channelku"  (atau env FOOTER)
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return [m[1], m[2] === undefined ? true : m[2]];
}));
['config', 'geometry', 'timeline', 'flags', 'audio', 'renderer'].forEach(m => require(`./src/${m}.js`));
const FS = globalThis.FS, C = FS.config;
const FOOTER = args.footer || process.env.FOOTER || C.FOOTER;
C.FOOTER = FOOTER;

const backend = args.backend || 'puppeteer';
const fps = Number(args.fps || process.env.FPS || C.FPS);
const tail = Number(args.tail ?? 1.2);
const flagsTotal = FS.getFlags().total;
const duration = args.seconds ? Math.min(Number(args.seconds), flagsTotal + tail) : flagsTotal + tail;
const frames = Math.round(duration * fps);
const outFile = args.out || 'out/flags-sound.mp4';
const wavFile = 'out/audio.wav';

async function makeFrameSource() {
  if (backend === 'canvas') {
    const { createCanvas } = require('@napi-rs/canvas');
    const cv = createCanvas(C.W, C.H), ctx = cv.getContext('2d');
    const r = FS.createRenderer(ctx, (w, h) => createCanvas(w, h));
    return { frame: async t => { r.draw(t); return cv.toBuffer('image/png'); }, close: async () => {} };
  }
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: C.W, height: C.H, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page error]', e.message));
  const url = pathToFileURL(path.join(__dirname, 'public', 'index.html')).href + '?render=1&footer=' + encodeURIComponent(FOOTER);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  return {
    frame: async t => {
      const b64 = await page.evaluate(tt => { window.__drawFrame(tt); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, t);
      return Buffer.from(b64, 'base64');
    },
    close: () => browser.close()
  };
}

(async () => {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.mkdirSync('out', { recursive: true });

  console.log(`[1/3] Audio ... (${flagsTotal.toFixed(2)} dtk bendera + ${tail}s tahan)`);
  const a = FS.renderAudio();
  fs.writeFileSync(wavFile, Buffer.from(FS.encodeWav(a.L, a.R, a.sr)));

  console.log(`[2/3] Frame: ${frames} @ ${fps}fps, backend=${backend}, ${C.W}x${C.H}`);
  const src = await makeFrameSource();
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0',
    '-i', wavFile,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k',
    '-t', String(duration), '-movflags', '+faststart', outFile
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); ff.on('error', rej); });
  ff.stdin.on('error', () => {});

  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const png = await src.frame(f / fps);
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) console.log(`   frame ${f}/${frames}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await done;
  await src.close();
  console.log(`[3/3] Selesai -> ${outFile}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
})().catch(e => { console.error(e); process.exit(1); });
