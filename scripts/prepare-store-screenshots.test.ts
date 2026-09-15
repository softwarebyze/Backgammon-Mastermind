import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'docs/marketing/v1.0.0/app-store-screenshots');
const PLAY_OUT = join(
  ROOT,
  'fastlane/metadata/android/en-US/images/phoneScreenshots',
);
const PLAY_PHONE = { width: 1080, height: 1920 };

function pngSize(filePath: string) {
  const buf = readFileSync(filePath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('prepare-store-screenshots', () => {
  it('stages a 9:16 Play crop of the iPhone 6.9" marketing set', () => {
    const sourceIphone = readdirSync(SOURCE).filter(name =>
      name.startsWith('iphone-69-') && name.endsWith('.png'),
    );
    expect(sourceIphone).toHaveLength(5);

    execFileSync(process.execPath, ['scripts/prepare-store-screenshots.mjs'], {
      cwd: ROOT,
    });

    for (const name of sourceIphone) {
      const dest = join(PLAY_OUT, name);
      expect(existsSync(dest)).toBe(true);
      expect(pngSize(dest)).toEqual(PLAY_PHONE);
    }
    const staged = readdirSync(PLAY_OUT).filter(name => name.endsWith('.png'));
    expect(staged.sort()).toEqual(sourceIphone.sort());
  });
});
