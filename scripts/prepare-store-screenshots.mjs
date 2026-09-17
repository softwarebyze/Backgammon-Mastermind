#!/usr/bin/env node
import { Buffer } from 'node:buffer';
/**
 * Stage store screenshots into Fastlane folder layouts from the marketing source of truth.
 *
 * Source: docs/marketing/v1.0.0/app-store-screenshots/ (composed PNGs, not raw/)
 *   iphone-69-*.png  1320×2868 → APP_IPHONE_67 (iOS, copied as-is)
 *   ipad-13-*.png    2064×2752 → iPad Pro 13" slot (iOS only)
 * Play phone: 9:16 crop of the iPhone set → 1080×1920 (Play long-side ≤ 2× short-side)
 * iOS:    fastlane/screenshots/<App Store locale>/
 * Play:   fastlane/metadata/android/<Play locale>/images/phoneScreenshots/
 *
 * Localized marketing bands are rendered from screenshot-localizations.json.
 * The same locale pass also stages localized Play title/description files from
 * store.config.json so Apple and Google Play stay in sync.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(
  ROOT,
  'docs/marketing/v1.0.0/app-store-screenshots',
);
const LOCALIZATIONS_PATH = path.join(
  ROOT,
  'docs/marketing/v1.0.0/screenshot-localizations.json',
);
const STORE_CONFIG_PATH = path.join(ROOT, 'store.config.json');
const IOS_ROOT = path.join(ROOT, 'fastlane/screenshots');
const PLAY_ROOT = path.join(ROOT, 'fastlane/metadata/android');

const PLAY_PHONE = { width: 1080, height: 1920 };
const LAYOUT = {
  iphone: { bandPct: 0.20, headlineSize: 142, subSize: 54, padX: 72 },
  ipad: { bandPct: 0.18, headlineSize: 126, subSize: 48, padX: 96 },
};
const BAND_BACKGROUND = '#1E0C02';
const HEADLINE_COLOR = '#F3E6C8';
const SUB_COLOR = '#E8A04A';

/** Create a staging directory when it does not exist. */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Remove previously generated PNGs while leaving metadata files intact. */
function clearPngs(dir) {
  if (!fs.existsSync(dir))
    return;
  for (const name of fs.readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.png')) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
}

/** Crop an App Store phone image to Google Play's accepted 9:16 size. */
async function stagePlayPhone(src, dest) {
  await sharp(src)
    .resize(PLAY_PHONE.width, PLAY_PHONE.height, {
      fit: 'cover',
      position: 'top',
    })
    .removeAlpha()
    .png()
    .toFile(dest);
}

/** Escape user-facing copy before inserting it into an SVG text node. */
function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Map a screenshot filename to its localized marketing-copy key. */
function copyKeyFor(file) {
  if (file.includes('learn-to-play'))
    return 'learn';
  if (file.includes('pass-and-play'))
    return 'pass';
  if (file.includes('vs-computer'))
    return 'computer';
  if (file.includes('learn-hub'))
    return 'lessons';
  return null;
}

/** Infer the layout family from the canonical screenshot filename. */
function deviceFor(file) {
  return file.startsWith('iphone-') ? 'iphone' : 'ipad';
}

/** Estimate rendered width while accounting for wide non-Latin glyphs. */
function visualLength(line) {
  return Array.from(line).reduce((total, char) => {
    if (/\s/.test(char))
      return total + 0.34;
    const point = char.codePointAt(0) ?? 0;
    const isNarrowScript = point <= 0x024F
      || (point >= 0x0370 && point <= 0x03FF)
      || (point >= 0x0400 && point <= 0x052F);
    if (!isNarrowScript)
      return total + 1;
    return total + 0.62;
  }, 0);
}

/** Shrink display type only when a localized line would exceed its band. */
function fittedSize(lines, baseSize, availableWidth) {
  const longest = Math.max(...lines.map(visualLength), 1);
  return Math.max(Math.round(baseSize * 0.66), Math.min(baseSize, Math.floor(availableWidth / longest)));
}

/** Render one localized, centered marketing band as an SVG buffer. */
function localizedBandSvg({ width, height, device, copy, key }) {
  const layout = LAYOUT[device];
  const bandHeight = Math.round(height * layout.bandPct);
  const lines = copy[key];
  const sub = key === 'pass' ? copy.passSub : '';
  const headlineSize = fittedSize(lines, layout.headlineSize, width - layout.padX * 2);
  const subSize = fittedSize([sub || ''], layout.subSize, width - layout.padX * 2);
  const headlineLineHeight = Math.round(headlineSize * 1.06);
  const subGap = sub ? Math.round(subSize * 0.34) : 0;
  const blockHeight = lines.length * headlineLineHeight + (sub ? subGap + subSize : 0);
  const firstBaseline = Math.round((bandHeight - blockHeight) / 2 + headlineSize * 0.84);
  const direction = copy.direction === 'rtl' ? 'rtl' : 'ltr';
  const textAnchor = 'middle';
  const headline = lines.map((line, index) => (
    `<text x="${width / 2}" y="${firstBaseline + index * headlineLineHeight}" text-anchor="${textAnchor}" direction="${direction}" unicode-bidi="plaintext" font-family="sans-serif" font-weight="800" font-size="${headlineSize}" fill="${HEADLINE_COLOR}">${xmlEscape(line)}</text>`
  )).join('');
  const subText = sub
    ? `<text x="${width / 2}" y="${firstBaseline + lines.length * headlineLineHeight + subGap}" text-anchor="${textAnchor}" direction="${direction}" unicode-bidi="plaintext" font-family="sans-serif" font-weight="600" font-size="${subSize}" fill="${SUB_COLOR}">${xmlEscape(sub)}</text>`
    : '';
  return Buffer.from(`<svg width="${width}" height="${bandHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${BAND_BACKGROUND}"/>${headline}${subText}</svg>`);
}

/** Replace the English marketing band while preserving the product capture. */
async function stageLocalizedIos({ src, dest, file, copy }) {
  const key = copyKeyFor(file);
  if (!key) {
    fs.copyFileSync(src, dest);
    return;
  }
  const image = sharp(src);
  const metadata = await image.metadata();
  const device = deviceFor(file);
  const band = localizedBandSvg({
    width: metadata.width,
    height: metadata.height,
    device,
    copy,
    key,
  });
  await image.composite([{ input: band, top: 0, left: 0 }]).png().toFile(dest);
}

/** Sync one Google Play text-listing locale from the Apple metadata source. */
function stagePlayListing(appleLocale, playLocale, storeInfo) {
  const info = storeInfo[appleLocale];
  if (!info)
    throw new Error(`Missing store.config.json metadata for ${appleLocale}`);
  const dir = path.join(PLAY_ROOT, playLocale);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'title.txt'), `${info.title}\n`);
  fs.writeFileSync(path.join(dir, 'short_description.txt'), `${info.subtitle}\n`);
  fs.writeFileSync(path.join(dir, 'full_description.txt'), `${info.description}\n`);
}

/** Generate localized Apple and Google Play screenshot staging trees. */
async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing screenshot source: ${SOURCE}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SOURCE)
    .filter(f => f.toLowerCase().endsWith('.png'))
    .sort();

  if (files.length === 0) {
    console.error(`No PNGs in ${SOURCE}`);
    process.exit(1);
  }

  const localizations = JSON.parse(fs.readFileSync(LOCALIZATIONS_PATH, 'utf8'));
  const storeInfo = JSON.parse(fs.readFileSync(STORE_CONFIG_PATH, 'utf8')).apple.info;

  let iosCount = 0;
  let playCount = 0;
  for (const [appleLocale, copy] of Object.entries(localizations)) {
    const iosOut = path.join(IOS_ROOT, appleLocale);
    const playOut = path.join(PLAY_ROOT, copy.playLocale, 'images/phoneScreenshots');
    ensureDir(iosOut);
    ensureDir(playOut);
    clearPngs(iosOut);
    clearPngs(playOut);
    stagePlayListing(appleLocale, copy.playLocale, storeInfo);

    for (const file of files) {
      const src = path.join(SOURCE, file);
      const localized = path.join(iosOut, file);
      if (appleLocale === 'en-US')
        fs.copyFileSync(src, localized);
      else await stageLocalizedIos({ src, dest: localized, file, copy });
      iosCount += 1;
      if (file.startsWith('iphone-')) {
        await stagePlayPhone(localized, path.join(playOut, file));
        playCount += 1;
      }
    }
  }

  console.log(`Staged ${iosCount} iOS / ${playCount} Play screenshots across ${Object.keys(localizations).length} locales →`);
  console.log(`  iOS:  ${path.relative(ROOT, IOS_ROOT)}/<locale> (Apple pixel sizes)`);
  console.log(
    `  Play: ${path.relative(ROOT, PLAY_ROOT)}/<locale>/images/phoneScreenshots (${PLAY_PHONE.width}×${PLAY_PHONE.height} 9:16 crop)`,
  );
  console.log('Next: pnpm screenshots:upload:ios  (or :android when Play creds exist)');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
