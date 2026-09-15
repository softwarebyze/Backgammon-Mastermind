#!/usr/bin/env node
/**
 * Stage store screenshots into Fastlane folder layouts from the marketing source of truth.
 *
 * Source: docs/marketing/v1.0.0/app-store-screenshots/ (composed PNGs, not raw/)
 *   iphone-69-*.png  1320×2868 → APP_IPHONE_67 (iOS, copied as-is)
 *   ipad-13-*.png    2064×2752 → iPad Pro 13" slot (iOS only)
 * Play phone: 9:16 crop of the iPhone set → 1080×1920 (Play long-side ≤ 2× short-side)
 * iOS:    fastlane/screenshots/en-US/
 * Play:   fastlane/metadata/android/en-US/images/phoneScreenshots/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(
  ROOT,
  'docs/marketing/v1.0.0/app-store-screenshots'
);
const IOS_OUT = path.join(ROOT, 'fastlane/screenshots/en-US');
const PLAY_OUT = path.join(
  ROOT,
  'fastlane/metadata/android/en-US/images/phoneScreenshots'
);

const PLAY_PHONE = { width: 1080, height: 1920 };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clearPngs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.png')) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
}

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

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing screenshot source: ${SOURCE}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SOURCE)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();

  if (files.length === 0) {
    console.error(`No PNGs in ${SOURCE}`);
    process.exit(1);
  }

  ensureDir(IOS_OUT);
  ensureDir(PLAY_OUT);
  clearPngs(IOS_OUT);
  clearPngs(PLAY_OUT);

  let iosCount = 0;
  let playCount = 0;
  for (const file of files) {
    const src = path.join(SOURCE, file);
    fs.copyFileSync(src, path.join(IOS_OUT, file));
    iosCount += 1;
    if (file.startsWith('iphone-')) {
      await stagePlayPhone(src, path.join(PLAY_OUT, file));
      playCount += 1;
    }
  }

  console.log(`Staged ${iosCount} iOS / ${playCount} Play screenshots →`);
  console.log(`  iOS:  ${path.relative(ROOT, IOS_OUT)} (Apple pixel sizes)`);
  console.log(
    `  Play: ${path.relative(ROOT, PLAY_OUT)} (${PLAY_PHONE.width}×${PLAY_PHONE.height} 9:16 crop, no new captures)`,
  );
  console.log('Next: pnpm screenshots:upload:ios  (or :android when Play creds exist)');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
