import { existsSync, readFileSync } from 'node:fs';
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

  it('puts apple-touch-icon and og:image on the SPA HTML template Expo actually exports', () => {
    const html = readFileSync(join(process.cwd(), 'public/index.html'), 'utf8');
    expect(html).toContain('%WEB_TITLE%');
    expect(html).toContain('%LANG_ISO_CODE%');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('content="/apple-touch-icon.png"');
    expect(html).toContain('rel="icon" type="image/png"');
    expect(html).toContain('id="root"');
  });
});
