#!/usr/bin/env node
/**
 * Dress raw App Store captures as two-zone frames.
 *
 * Zone 1 (top, optional): opaque copy band, solid #1E0C02, headline only.
 * Zone 2 (the rest): the raw capture cropped by cropTop (fraction of raw
 * height clipped from the top) so in-app chrome does not sit under the type.
 * Product fills the remaining canvas at full width. No gradient overlay,
 * no gold bezel, no side letterbox, no wordmark footer.
 *
 * Reads docs/marketing/v1.0.0/screenshot-frames.json
 * Writes composed PNGs at exact Apple pixel sizes.
 *
 *   node scripts/compose-store-screenshots.mjs
 *   node scripts/compose-store-screenshots.mjs --check
 *
 * Playwright-core is loaded from PLAYWRIGHT_CORE or /tmp/pw-store (same as capture).
 */
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = path.join(
  ROOT,
  'docs/marketing/v1.0.0/screenshot-frames.json',
);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const FRAUNCES_WOFF2_URL
  = 'https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58njr1a03gg7S2nfgRYIcUByTCf7T.woff2';
const FRAUNCES_FILE = 'fraunces-700.woff2';

const LAYOUT = {
  iphone: {
    bandPct: 0.20,
    headlineSize: 184,
    padX: 72,
    padY: 56,
  },
  ipad: {
    bandPct: 0.18,
    headlineSize: 148,
    padX: 96,
    padY: 48,
  },
};

function parseArgs(argv) {
  const args = { check: false, manifest: DEFAULT_MANIFEST };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check')
      args.check = true;
    else if (argv[i] === '--manifest')
      args.manifest = path.resolve(argv[++i]);
    else
      throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

export function readPngSize(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(24);
  try {
    const n = fs.readSync(fd, buf, 0, 24, 0);
    if (n < 24)
      throw new Error(`${filePath} is too small to be a PNG`);
  }
  finally {
    fs.closeSync(fd);
  }
  if (!buf.subarray(0, 8).equals(PNG_SIG))
    throw new Error(`${filePath} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function loadManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  if (!manifest.devices || !Array.isArray(manifest.frames))
    throw new Error(`Invalid manifest: ${manifestPath}`);
  const dir = path.dirname(manifestPath);
  manifest.rawAbs = path.join(dir, manifest.rawDir);
  manifest.outAbs = path.join(dir, manifest.outDir);
  manifest.path = manifestPath;
  return manifest;
}

function assertDevicePixels(manifest, deviceName) {
  const spec = manifest.devices[deviceName];
  if (!spec?.width || !spec?.height)
    throw new Error(`Manifest missing devices.${deviceName} pixels`);
  return spec;
}

function assertRawSize(filePath, spec, label) {
  const size = readPngSize(filePath);
  if (size.width !== spec.width || size.height !== spec.height) {
    throw new Error(
      `${label} is ${size.width}×${size.height}, expected ${spec.width}×${spec.height}`,
    );
  }
  return size;
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fontDir() {
  return process.env.DISPLAY_FONT_DIR || '/tmp/display-fonts';
}

function fontPath() {
  return path.join(fontDir(), FRAUNCES_FILE);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const request = (href) => {
      https.get(href, {
        headers: { 'User-Agent': 'BackgammonMastermind-compose/1.0' },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Font download failed: HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (buf.length < 4 || buf.subarray(0, 4).toString() !== 'wOF2') {
            reject(new Error('Font download was not a woff2'));
            return;
          }
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, buf);
          resolve(dest);
        });
      }).on('error', reject);
    };
    request(url);
  });
}

async function ensureDisplayFont() {
  const dest = fontPath();
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000)
    return dest;
  console.log(`  downloading Fraunces 700 → ${dest}`);
  await downloadFile(FRAUNCES_WOFF2_URL, dest);
  return dest;
}

function fontFaceCss() {
  const abs = fontPath();
  if (!fs.existsSync(abs))
    throw new Error(`Missing display font ${abs} — run compose (not --check) first`);
  const b64 = fs.readFileSync(abs).toString('base64');
  return `@font-face{font-family:Fraunces;font-style:normal;font-weight:700;src:url(data:font/woff2;base64,${b64}) format("woff2");font-display:block;}`;
}

function layoutFor(device) {
  const layout = LAYOUT[device];
  if (!layout)
    throw new Error(`No layout for device ${device}`);
  return layout;
}

export function clampCropTop(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0)
    return 0;
  if (n >= 1)
    return 1;
  return n;
}

export function bandHeightPx(frame, spec) {
  const headline = (frame.headline || '').trim();
  if (!headline)
    return 0;
  const layout = layoutFor(frame.device);
  return Math.round(spec.height * layout.bandPct);
}

function frameHtml({ frame, spec, colors, dataUrl }) {
  const layout = layoutFor(frame.device);
  const headline = (frame.headline || '').trim();
  const cropTop = clampCropTop(frame.cropTop);
  const bandH = bandHeightPx(frame, spec);
  const cropY = Math.round(cropTop * spec.height);
  const fonts = fontFaceCss();
  const headlineColor = colors.headline || '#F3E6C8';
  const field = colors.background || '#1E0C02';
  const copy = headline
    ? `<div class="band">
    <h1>${esc(headline)}</h1>
  </div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
${fonts}
html,body{margin:0;padding:0;width:${spec.width}px;height:${spec.height}px;overflow:hidden;background:${field};}
*{box-sizing:border-box;}
.frame{
  position:relative;width:${spec.width}px;height:${spec.height}px;
  overflow:hidden;background:${field};
}
.product{
  position:absolute;top:${bandH}px;left:0;right:0;bottom:0;
  overflow:hidden;background:${field};
}
.shot{
  position:absolute;left:0;top:-${cropY}px;
  width:${spec.width}px;height:${spec.height}px;
  object-fit:cover;object-position:top center;
  display:block;
}
.band{
  position:absolute;top:0;left:0;right:0;height:${bandH}px;
  background:${field};
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  padding:${layout.padY}px ${layout.padX}px;
  text-align:center;z-index:2;
  font-family:Fraunces,Georgia,"Times New Roman",serif;
  color:${headlineColor};
}
h1{
  margin:0;font-family:Fraunces,Georgia,"Times New Roman",serif;
  font-weight:700;font-size:${layout.headlineSize}px;line-height:1.05;
  letter-spacing:-0.02em;color:${headlineColor};text-wrap:balance;
}
</style>
</head>
<body>
  <div class="frame">
    <div class="product">
      <img class="shot" src="${dataUrl}" alt=""/>
    </div>
    ${copy}
  </div>
</body>
</html>`;
}

async function launchBrowser() {
  const playwrightPath
    = process.env.PLAYWRIGHT_CORE
      || '/tmp/pw-store/node_modules/playwright-core/index.mjs';
  const { chromium } = await import(playwrightPath);
  return chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--font-render-hinting=none',
      '--disable-gpu',
    ],
  });
}

async function composeFrame(page, manifest, frame) {
  const spec = assertDevicePixels(manifest, frame.device);
  const src = path.join(manifest.rawAbs, frame.source);
  const dest = path.join(manifest.outAbs, frame.dest);
  if (!fs.existsSync(src))
    throw new Error(`Missing raw screenshot: ${src}`);
  assertRawSize(src, spec, frame.source);
  const dataUrl = `data:image/png;base64,${fs.readFileSync(src).toString('base64')}`;
  const html = frameHtml({
    frame,
    spec,
    colors: manifest.colors,
    dataUrl,
  });
  const htmlPath = path.join(os.tmpdir(), `bm-frame-${frame.dest}.html`);
  fs.writeFileSync(htmlPath, html);
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load', timeout: 60_000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready)
      await document.fonts.ready;
    const img = document.querySelector('img');
    if (img && !img.complete)
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('frame image failed to load'));
      });
  });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await page.screenshot({
    path: dest,
    type: 'png',
    clip: { x: 0, y: 0, width: spec.width, height: spec.height },
    animations: 'disabled',
    caret: 'hide',
  });
  fs.unlinkSync(htmlPath);
  assertRawSize(dest, spec, frame.dest);
  return dest;
}

function preflightRaws(manifest) {
  for (const frame of manifest.frames) {
    const spec = assertDevicePixels(manifest, frame.device);
    const src = path.join(manifest.rawAbs, frame.source);
    if (!fs.existsSync(src))
      throw new Error(`Missing raw screenshot: ${src}`);
    assertRawSize(src, spec, frame.source);
  }
}

async function composeAll(manifest) {
  preflightRaws(manifest);
  await ensureDisplayFont();
  const browser = await launchBrowser();
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });
  const written = [];
  try {
    for (const frame of manifest.frames) {
      const dest = await composeFrame(page, manifest, frame);
      written.push(dest);
      console.log(`  wrote ${path.relative(ROOT, dest)}`);
    }
  }
  finally {
    await browser.close();
  }
  return written;
}

function checkOutputs(manifest) {
  const errors = [];
  for (const frame of manifest.frames) {
    const spec = assertDevicePixels(manifest, frame.device);
    const dest = path.join(manifest.outAbs, frame.dest);
    if (!fs.existsSync(dest)) {
      errors.push(`missing ${path.relative(ROOT, dest)}`);
      continue;
    }
    try {
      assertRawSize(dest, spec, frame.dest);
    }
    catch (err) {
      errors.push(err.message);
    }
  }
  if (errors.length) {
    throw new Error(`--check failed:\n  ${errors.join('\n  ')}`);
  }
  console.log(`OK ${manifest.frames.length} composed PNGs at Apple pixel sizes.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest(args.manifest);
  if (args.check) {
    checkOutputs(manifest);
    return;
  }
  console.log(`Composing ${manifest.frames.length} frames from ${path.relative(ROOT, args.manifest)}`);
  await composeAll(manifest);
  checkOutputs(manifest);
  console.log('Done.');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

export { assertRawSize, checkOutputs, loadManifest, parseArgs };
