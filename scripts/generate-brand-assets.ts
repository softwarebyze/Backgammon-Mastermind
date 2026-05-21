/**
 * Generate Expo-compliant icon + splash assets from icon-source.png.
 *
 * Expo docs (required reading):
 * https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
 *
 * - App icon: 1024×1024, fills square (opaque background OK)
 * - Splash image: 1024×1024, TRANSPARENT background (logo only)
 * - Adaptive foreground: transparent PNG, content in center ~66% safe zone
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const root = join(scriptDir, '..');
const brandDir = join(root, 'assets', 'brand');

type BrandConfig = {
  splashBackgroundColor: string;
  adaptiveIconBackgroundColor: string;
  splashImageWidth: number;
  iconScale: number;
  splashScale: number;
  adaptiveScale: number;
};

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

async function trimmedBoard(source: string) {
  return sharp(source).trim({
    threshold: 30,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  });
}

async function main() {
  const source = join(brandDir, 'icon-source.png');
  const config = JSON.parse(
    readFileSync(join(brandDir, 'brand.config.json'), 'utf8'),
  ) as BrandConfig;

  const size = 1024;
  const bg = hexToRgb(config.adaptiveIconBackgroundColor);
  const board = await trimmedBoard(source);

  const iconBoard = await board
    .clone()
    .resize(Math.round(size * config.iconScale), Math.round(size * config.iconScale), {
      fit: 'inside',
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: bg,
    },
  })
    .composite([{ input: iconBoard, gravity: 'center' }])
    .png()
    .toFile(join(brandDir, 'icon.png'));

  const splashBoard = await board
    .clone()
    .resize(Math.round(size * config.splashScale), Math.round(size * config.splashScale), {
      fit: 'inside',
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: splashBoard, gravity: 'center' }])
    .png()
    .toFile(join(brandDir, 'splash-icon.png'));

  const adaptiveBoard = await board
    .clone()
    .resize(Math.round(size * config.adaptiveScale), Math.round(size * config.adaptiveScale), {
      fit: 'inside',
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: adaptiveBoard, gravity: 'center' }])
    .png()
    .toFile(join(brandDir, 'adaptive-foreground.png'));

  await sharp(join(brandDir, 'icon.png'))
    .resize(48, 48)
    .png()
    .toFile(join(brandDir, 'favicon.png'));

  // In-app logo: trimmed board at natural aspect (use contain in UI — not square cover crop)
  await board.clone().png().toFile(join(brandDir, 'display-logo.png'));

  console.log('Generated Expo brand assets in assets/brand/:');
  console.log('  icon.png              — app icon (opaque, full bleed)');
  console.log('  splash-icon.png       — splash logo (transparent PNG)');
  console.log('  adaptive-foreground.png — Android adaptive layer');
  console.log('  display-logo.png      — in-app home screen (natural aspect)');
  console.log('  favicon.png           — web');
  console.log('\nRebuild dev client to see icon/splash on device.');
  console.log('Note: dev-client splash ≠ production splash — use preview build to verify.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
