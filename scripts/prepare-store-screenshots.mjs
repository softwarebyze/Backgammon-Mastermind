#!/usr/bin/env node
/**
 * Stage store screenshots into Fastlane folder layouts from the marketing source of truth.
 *
 * Source: docs/marketing/v1.0.0/app-store-screenshots/*.png (1320×2868 → APP_IPHONE_67)
 * iOS:    fastlane/screenshots/en-US/
 * Play:   fastlane/metadata/android/en-US/images/phoneScreenshots/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function main() {
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

  for (const file of files) {
    const src = path.join(SOURCE, file);
    fs.copyFileSync(src, path.join(IOS_OUT, file));
    fs.copyFileSync(src, path.join(PLAY_OUT, file));
  }

  console.log(`Staged ${files.length} screenshots →`);
  console.log(`  iOS:  ${path.relative(ROOT, IOS_OUT)}`);
  console.log(`  Play: ${path.relative(ROOT, PLAY_OUT)}`);
  console.log('Next: pnpm screenshots:upload:ios  (or :android when Play creds exist)');
}

main();
