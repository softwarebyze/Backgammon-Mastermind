import { existsSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

describe('public web share icons', () => {
  it('serves a 180×180 PNG apple-touch-icon (not an SPA HTML fallback)', async () => {
    const path = join(process.cwd(), 'public/apple-touch-icon.png');
    expect(existsSync(path)).toBe(true);
    const meta = await sharp(path).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(180);
    expect(meta.height).toBe(180);
  });

  it('serves a PNG favicon alongside the Expo .ico', async () => {
    const path = join(process.cwd(), 'public/favicon.png');
    expect(existsSync(path)).toBe(true);
    const meta = await sharp(path).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(48);
    expect(meta.height).toBe(48);
  });
});
