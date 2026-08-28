#!/usr/bin/env node
/**
 * Dress raw App Store captures in BM marketing frames (headline + bezel + wordmark).
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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = path.join(
  ROOT,
  'docs/marketing/v1.0.0/screenshot-frames.json',
);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const LAYOUT = {
  iphone: {
    padTop: 72,
    padX: 88,
    padBottom: 56,
    headlineSize: 78,
    subSize: 28,
    wordmarkSize: 18,
    radius: 48,
    rim: 5,
    copyGap: 14,
  },
  ipad: {
    padTop: 64,
    padX: 140,
    padBottom: 48,
    headlineSize: 92,
    subSize: 32,
    wordmarkSize: 22,
    radius: 36,
    rim: 6,
    copyGap: 12,
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

function fontFaceCss() {
  const dir = process.env.INTER_FONT_DIR || '/tmp/inter-fonts';
  const faces = [
    { file: 'inter-800.woff2', weight: 800 },
    { file: 'inter-600.woff2', weight: 600 },
  ];
  return faces.flatMap((face) => {
    const abs = path.join(dir, face.file);
    if (!fs.existsSync(abs))
      return [];
    const b64 = fs.readFileSync(abs).toString('base64');
    return [`@font-face{font-family:Inter;font-style:normal;font-weight:${face.weight};src:url(data:font/woff2;base64,${b64}) format("woff2");font-display:block;}`];
  }).join('');
}

function layoutFor(device) {
  const layout = LAYOUT[device];
  if (!layout)
    throw new Error(`No layout for device ${device}`);
  return layout;
}

function frameHtml({ frame, spec, colors, wordmark, dataUrl }) {
  const layout = layoutFor(frame.device);
  const sub = frame.sub
    ? `<p class="sub">${esc(frame.sub)}</p>`
    : '';
  const fonts = fontFaceCss();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
${fonts}
html,body{margin:0;padding:0;width:${spec.width}px;height:${spec.height}px;overflow:hidden;background:${colors.background};}
*{box-sizing:border-box;}
.frame{
  width:${spec.width}px;height:${spec.height}px;
  background:radial-gradient(ellipse 78% 52% at 50% 46%, ${colors.backgroundMid} 0%, ${colors.background} 72%);
  display:flex;flex-direction:column;align-items:center;
  padding:${layout.padTop}px ${layout.padX}px ${layout.padBottom}px;
  font-family:Inter,Liberation Sans,Nimbus Sans,sans-serif;
  color:${colors.headline};
}
.copy{flex:0 0 auto;text-align:center;width:100%;padding:0 8px;}
h1{
  margin:0;font-weight:800;font-size:${layout.headlineSize}px;line-height:1.08;
  letter-spacing:-0.03em;color:${colors.headline};text-wrap:balance;
}
.sub{
  margin:${layout.copyGap}px 0 0;font-weight:600;font-size:${layout.subSize}px;
  line-height:1.25;color:${colors.sub};letter-spacing:0.01em;
}
.divider{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:${layout.copyGap + 6}px;}
.divider .line{width:72px;height:1px;background:rgba(255,196,153,0.22);}
.divider .diamond{width:9px;height:9px;background:${colors.headline};transform:rotate(45deg);flex:0 0 auto;}
.stage{flex:1 1 auto;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:18px 0 22px;}
.device{
  height:100%;width:auto;max-width:100%;max-height:100%;
  aspect-ratio:${spec.width} / ${spec.height};
  border-radius:${layout.radius}px;
  padding:${layout.rim}px;
  background:linear-gradient(180deg,#F0C070 0%,${colors.rim} 42%,#C4843A 100%);
  box-shadow:0 36px 80px rgba(0,0,0,0.58),0 0 48px rgba(232,160,74,0.16);
  overflow:hidden;
}
.device img{
  display:block;width:100%;height:100%;object-fit:cover;
  border-radius:${Math.max(8, layout.radius - layout.rim)}px;
}
.foot{flex:0 0 auto;text-align:center;padding-top:4px;}
.wordmark{
  font-weight:700;font-size:${layout.wordmarkSize}px;letter-spacing:0.34em;
  text-transform:uppercase;color:${colors.wordmark};opacity:0.92;
  font-variant:small-caps;
}
</style>
</head>
<body>
  <div class="frame">
    <div class="copy">
      <h1>${esc(frame.headline)}</h1>
      ${sub}
      <div class="divider"><span class="line"></span><span class="diamond"></span><span class="line"></span></div>
    </div>
    <div class="stage">
      <div class="device"><img src="${dataUrl}" alt=""/></div>
    </div>
    <div class="foot"><div class="wordmark">${esc(wordmark)}</div></div>
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
    wordmark: manifest.wordmark,
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
