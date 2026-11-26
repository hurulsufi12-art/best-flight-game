// Merpati Senja — Island Hopper: hand-in program (Node 22, stdlib only).
// Validates the entry against the bounty gates BEFORE writing anything,
// then copies game/ and screenshots/ to /output and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const GAME = join(here, 'game');
const SHOTS = join(here, 'screenshots');

const MAX_DOSSIER_BYTES = 1572864;
const MAX_SHOT_TOTAL = 900 * 1024;
const MAX_SHOT_BYTES = 262144;

function fail(message: string): never {
  throw new Error('entry validation failed: ' + message);
}

function walk(dir: string, outList: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, outList);
    else outList.push(p);
  }
  return outList;
}

function imageDims(buf: Buffer): { w: number; h: number } {
  // PNG: width/height at bytes 16/20 of the IHDR chunk.
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG: scan markers for a Start Of Frame segment.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) fail('corrupt JPEG marker');
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xc3 && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    fail('JPEG without a frame header');
  }
  fail('screenshot is neither PNG nor JPEG');
}

function validateGame(): void {
  if (!existsSync(join(GAME, 'index.html'))) fail('game/index.html missing');
  const files = walk(GAME);
  let dirs = 0;
  const countDirs = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { dirs += 1; countDirs(join(d, e.name)); }
    }
  };
  countDirs(GAME);
  if (files.length + dirs > 993) fail('game/ has too many entries: ' + (files.length + dirs));
  let total = 0;
  for (const f of files) {
    if (lstatSync(f).isSymbolicLink()) fail('symlink in game/: ' + f);
    total += lstatSync(f).size;
    if (Buffer.byteLength(f.slice(GAME.length + 1), 'utf8') > 1000) fail('game path too long: ' + f);
  }
  if (total > 48 * 1024 * 1024) fail('game/ over 48 MiB: ' + total);
  if (lstatSync(join(GAME, 'index.html')).size > 1024 * 1024) fail('index.html over 1 MiB');
  const html = readFileSync(join(GAME, 'index.html'), 'utf8');
  if (html.includes('type="module"')) fail('index.html uses a module script');
  if (html.includes('importmap')) fail('index.html uses an import map');
  for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
    if (!existsSync(join(GAME, m[1].replace(/^\.\//, '')))) fail('script src missing: ' + m[1]);
  }
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (text.includes('http')) fail('forbidden "http" substring in ' + f);
    if (text.includes('://')) fail('forbidden "://" in ' + f);
    if (text.includes('eval(')) fail('eval( in ' + f);
    if (text.includes('cookie')) fail('cookie in ' + f);
  }
}

function validateScreenshots(): void {
  if (!existsSync(SHOTS)) fail('screenshots/ missing');
  const names = readdirSync(SHOTS).filter((n) => !n.startsWith('.')).sort();
  if (names.length < 3 || names.length > 4) fail('need 3-4 screenshots, found ' + names.length);
  let total = 0;
  for (const n of names) {
    if (!/^[A-Za-z0-9._-]+$/.test(n) || n.startsWith('-') || n.startsWith('.') || n.length > 128) {
      fail('bad screenshot name: ' + n);
    }
    const buf = readFileSync(join(SHOTS, n));
    if (buf.length > MAX_SHOT_BYTES) fail(n + ' over 256 KiB: ' + buf.length);
    const { w, h } = imageDims(buf);
    if (Math.max(w, h) > 1280) fail(n + ' long side over 1280: ' + Math.max(w, h));
    if (Math.min(w, h) < 480) fail(n + ' short side under 480: ' + Math.min(w, h));
    total += buf.length;
  }
  if (total > MAX_SHOT_TOTAL) fail('screenshots total over 900 KiB: ' + total);
  if (names[0] !== '1-cover.jpg') fail('cover must sort first by name, found ' + names[0]);
}

function validateRepo(): void {
  if (!existsSync(join(here, 'LICENSE'))) fail('LICENSE missing');
  if (!existsSync(join(here, 'vendor', 'makefun-game.ts'))) fail('vendor/makefun-game.ts missing');
}

// Gate checks run before any file is written to /output.
validateGame();
validateScreenshots();
validateRepo();

mkdirSync(out, { recursive: true });
cpSync(GAME, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(SHOTS)) cpSync(SHOTS, join(out, 'screenshots'), { recursive: true });

// buildDossier throws above 4 MiB, but the gate caps the dossier at 1.5 MiB,
// so check the size ourselves before writing it out.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
if (dossier.length > MAX_DOSSIER_BYTES) {
  rmSync(out, { recursive: true, force: true });
  fail('dossier.json over 1.5 MiB: ' + dossier.length);
}
writeFileSync(join(out, 'dossier.json'), dossier);
