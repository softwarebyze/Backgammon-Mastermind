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

// Slots mirror Xcode's own "iMessage App Icon" stickersiconset, copied from
//   iOS/Application Extension/Sticker Pack Extension Component.xctemplate
//     /Stickers.xcstickers/iMessage App Icon.stickersiconset/Contents.json
//
// Two details are load-bearing and were wrong before:
//
//   * 27x20 and 32x24 are `universal` + `platform: ios`, **not** `iphone`. The
//     asset compiler silently drops slots whose idiom it does not recognise, so
//     declaring them as `iphone` produced a build with no 54x40 / 81x60 file in
//     it at all, and App Store Connect rejected the upload with
//     "Missing App Icon. iMessage app icons must be 54x40 / 81x60 pixels"
//     (iris 90649) — twice, for 54x40 and again for 81x60.
//   * There is no `universal 32x24 @1x`, and iPad ships @2x only. Extra
//     renditions are not an error, but matching the template keeps the catalog
//     minimal and stops anyone "fixing" the idioms back.
const SLOTS: Slot[] = [
  { idiom: 'iphone', width: 29, height: 29, scale: 2 },
  { idiom: 'iphone', width: 29, height: 29, scale: 3 },
  { idiom: 'iphone', width: 60, height: 45, scale: 2 },
  { idiom: 'iphone', width: 60, height: 45, scale: 3 },
  { idiom: 'ipad', width: 29, height: 29, scale: 2 },
  { idiom: 'ipad', width: 67, height: 50, scale: 2 },
  { idiom: 'ipad', width: 74, height: 55, scale: 2 },
  { idiom: 'universal', width: 27, height: 20, scale: 2, platform: 'ios' },
  { idiom: 'universal', width: 27, height: 20, scale: 3, platform: 'ios' },
  { idiom: 'universal', width: 32, height: 24, scale: 2, platform: 'ios' },
  { idiom: 'universal', width: 32, height: 24, scale: 3, platform: 'ios' },
  { idiom: 'ios-marketing', width: 1024, height: 768, scale: 1, platform: 'ios' },
];

/**
 * Average colour of the brand mark, used as the icon background.
 *
 * iMessage icons must be fully opaque — App Store Connect rejects the upload
 * with "Invalid Image Asset … can't be transparent or contain an alpha channel"
 * (iris 90647) if any pixel is transparent. Compositing on transparency, which
 * is what this did originally, therefore fails validation outright.
 *
 * Deriving the colour from the mark rather than hardcoding one keeps the badge
 * on-brand if the icon ever changes.
 */
async function averageColour(path: string): Promise<{ r: number; g: number; b: number }> {
  const { channels } = await sharp(path).stats();
  const [r, g, b] = channels.slice(0, 3);
  return {
    r: Math.round(r.mean),
    g: Math.round(g.mean),
    b: Math.round(b.mean),
  };
}

async function main() {
  mkdirSync(SET_DIR, { recursive: true });
  const background = await averageColour(SOURCE);
  console.log(`background rgb(${background.r}, ${background.g}, ${background.b})`);
  const images = [];
  for (const slot of SLOTS) {
    const canvasWidth = slot.width * slot.scale;
    const canvasHeight = slot.height * slot.scale;
    const filename = `icon-${slot.idiom}-${slot.width}x${slot.height}@${slot.scale}x.png`;
    // Fit the square brand mark inside the canvas, centered.
    const art = slot.width === slot.height
      ? sharp(SOURCE).resize(canvasWidth, canvasHeight)
      : sharp(SOURCE).resize(canvasHeight, canvasHeight);
    // eslint-disable-next-line no-await-in-loop
    await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background,
      },
    })
      .composite([{ input: await art.png().toBuffer(), gravity: 'center' }])
      // Belt and braces, and both are needed. `flatten` makes the composite
      // opaque but leaves a 4-channel image, and the validator rejects on the
      // alpha channel *existing*, not merely on transparent pixels — sharp keeps
      // writing PNG colour type 6 (RGBA) either way. `removeAlpha` is what
      // actually produces colour type 2 (truecolour RGB).
      .flatten({ background })
      .removeAlpha()
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
