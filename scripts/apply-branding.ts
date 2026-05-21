/**
 * Copy assets/brand/icon-source.png into Expo icon/splash/favicon outputs.
 * Run: pnpm brand:apply
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const root = join(scriptDir, '..');
const brandDir = join(root, 'assets', 'brand');
const assetsDir = join(root, 'assets');
const source = join(brandDir, 'icon-source.png');

if (!existsSync(source)) {
  console.error(`Missing ${source}`);
  console.error('Add a 1024×1024 PNG as assets/brand/icon-source.png');
  process.exit(1);
}

for (const name of ['icon.png', 'adaptive-icon.png', 'splash-icon.png'] as const) {
  copyFileSync(source, join(assetsDir, name));
  console.log(`✓ assets/${name}`);
}

const favicon = join(assetsDir, 'favicon.png');
execSync(`sips -z 48 48 "${source}" --out "${favicon}"`, { stdio: 'inherit' });
console.log('✓ assets/favicon.png');

console.log('\nBranding applied. Colors come from assets/brand/brand.config.json via app.config.ts.');
console.log('Rebuild dev client on device when icon/splash change (EAS Update QR is JS-only).');
