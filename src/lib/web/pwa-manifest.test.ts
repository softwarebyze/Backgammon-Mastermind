import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Icon = { src: string; sizes: string; type: string; purpose: string };
type Manifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: Icon[];
};

const publicDir = join(__dirname, '../../../public');
const manifest = JSON.parse(
  readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8'),
) as Manifest;

function publicFile(src: string): string {
  return join(publicDir, src.replace(/^\//, ''));
}

/** PNG width/height live as big-endian uint32s at offsets 16 and 20. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('web app manifest', () => {
  it('installs as a standalone app at the site root', () => {
    expect(manifest.name).toBe('Backgammon Mastermind');
    expect(manifest.short_name).toBe('Backgammon');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#1E0C02');
    expect(manifest.theme_color).toBe('#1E0C02');
  });

  it('ships every declared icon at the size it advertises', () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect({ src: icon.src, type: icon.type }).toEqual({ src: icon.src, type: 'image/png' });
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
      expect({ src: icon.src, exists: existsSync(publicFile(icon.src)) }).toEqual({
        src: icon.src,
        exists: true,
      });
      const [width, height] = icon.sizes.split('x').map(Number);
      expect({ src: icon.src, size: pngSize(publicFile(icon.src)) }).toEqual({
        src: icon.src,
        size: { width, height },
      });
    }
    expect(manifest.icons.map(icon => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
  });

  it('provides a maskable icon for Android launchers', () => {
    expect(manifest.icons.some(icon => icon.purpose.split(' ').includes('maskable'))).toBe(true);
  });
});
