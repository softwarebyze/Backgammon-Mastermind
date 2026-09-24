/**
 * Generates the iMessage extension icon set from the brand icon.
 *
 * iMessage apps require their own icon (App Store validation fails without
 * one). Xcode's iMessage Extension template generates a *stickers icon set*
 * ("iMessage App Icon", type `stickersicon`) — not a regular appiconset —
 * with 4:3 canvases. This script renders those slots from
 * assets/brand/icon.png (1024×1024, centered on transparent 4:3 canvases)
 * into targets/imessage/Assets.xcassets/iMessage App Icon.stickersiconset/.
 *
 * Run: pnpm dlx tsx scripts/generate-imessage-icons.ts
 * (Run manually after changing the brand icon; output is committed.)
 */
/* eslint-disable no-console */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, 'assets/brand/icon.png');
const SET_DIR = join(ROOT, 'targets/imessage/Assets.xcassets/iMessage App Icon.stickersiconset');

type Slot = {
  idiom: 'universal' | 'ios-marketing' | 'iphone' | 'ipad';
  width: number;
  height: number;
  scale: number;
  platform?: 'ios';
};

// Slots mirror Xcode's iMessage Extension template (stickersicon type).
const SLOTS: Slot[] = [
  { idiom: 'universal', width: 32, height: 24, scale: 1, platform: 'ios' },
  { idiom: 'universal', width: 32, height: 24, scale: 2, platform: 'ios' },
  { idiom: 'universal', width: 32, height: 24, scale: 3, platform: 'ios' },
  { idiom: 'ios-marketing', width: 1024, height: 768, scale: 1, platform: 'ios' },
  { idiom: 'iphone', width: 29, height: 29, scale: 2 },
  { idiom: 'iphone', width: 29, height: 29, scale: 3 },
  { idiom: 'iphone', width: 60, height: 45, scale: 2 },
  { idiom: 'iphone', width: 60, height: 45, scale: 3 },
  { idiom: 'ipad', width: 29, height: 29, scale: 1 },
  { idiom: 'ipad', width: 29, height: 29, scale: 2 },
  { idiom: 'ipad', width: 67, height: 50, scale: 1 },
  { idiom: 'ipad', width: 67, height: 50, scale: 2 },
  { idiom: 'ipad', width: 74, height: 55, scale: 2 },
];

async function main() {
  mkdirSync(SET_DIR, { recursive: true });
  const images = [];
  for (const slot of SLOTS) {
    const canvasWidth = slot.width * slot.scale;
    const canvasHeight = slot.height * slot.scale;
    const filename = `icon-${slot.idiom}-${slot.width}x${slot.height}@${slot.scale}x.png`;
    // Fit the square brand mark inside the canvas, centered on transparency.
    const art = slot.width === slot.height
      ? sharp(SOURCE).resize(canvasWidth, canvasHeight)
      : sharp(SOURCE).resize(canvasHeight, canvasHeight);
    // eslint-disable-next-line no-await-in-loop
    await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: await art.png().toBuffer(), gravity: 'center' }])
      .png()
      .toFile(join(SET_DIR, filename));
    images.push({
      filename,
      idiom: slot.idiom,
      scale: `${slot.scale}x`,
      size: `${slot.width}x${slot.height}`,
      ...(slot.platform ? { platform: slot.platform } : {}),
    });
    console.log(`wrote ${filename} (${canvasWidth}x${canvasHeight})`);
  }
  writeFileSync(
    join(SET_DIR, 'Contents.json'),
    `${JSON.stringify({ images, info: { author: 'xcode', version: 1 } }, null, 2)}\n`,
  );
  console.log('wrote Contents.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
