import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RAW_SOURCE = join(ROOT, 'docs/marketing/v1.0.0/app-store-screenshots/raw');
const FRAMES = JSON.parse(
  readFileSync(join(ROOT, 'docs/marketing/v1.0.0/screenshot-frames.json'), 'utf8'),
) as { frames: Array<{ device: string; source: string; dest: string }> };
const LOCALIZATIONS = JSON.parse(
  readFileSync(join(ROOT, 'docs/marketing/v1.0.0/screenshot-localizations.json'), 'utf8'),
) as Record<string, { appLanguage: string; playLocale: string }>;
const IOS_ROOT = join(ROOT, 'fastlane/screenshots');
const PLAY_ROOT = join(ROOT, 'fastlane/metadata/android');
const PLAY_OUT = join(
  PLAY_ROOT,
  'en-US/images/phoneScreenshots',
);
const PLAY_PHONE = { width: 1080, height: 1920 };

function pngSize(filePath: string) {
  const buf = readFileSync(filePath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('prepare-store-screenshots', () => {
  it('stages a 9:16 Play crop of the iPhone 6.9" marketing set', () => {
    const sourceIphone = FRAMES.frames.filter(frame => frame.device === 'iphone').map(frame => frame.dest);
    expect(sourceIphone).toHaveLength(5);

    for (const [appleLocale, { appLanguage }] of Object.entries(LOCALIZATIONS)) {
      expect(appLanguage).toBeTruthy();
      for (const frame of FRAMES.frames) {
        expect(existsSync(join(RAW_SOURCE, appleLocale, frame.source))).toBe(true);
      }
    }

    const staleIos = join(IOS_ROOT, 'zz-stale');
    const stalePlay = join(PLAY_ROOT, 'zz-ZZ');
    mkdirSync(staleIos, { recursive: true });
    mkdirSync(stalePlay, { recursive: true });
    writeFileSync(join(staleIos, 'old.png'), 'stale');
    writeFileSync(join(stalePlay, 'title.txt'), 'stale');

    execFileSync(process.execPath, ['scripts/prepare-store-screenshots.mjs'], {
      cwd: ROOT,
    });

    expect(existsSync(staleIos)).toBe(false);
    expect(existsSync(stalePlay)).toBe(false);

    for (const name of sourceIphone) {
      const dest = join(PLAY_OUT, name);
      expect(existsSync(dest)).toBe(true);
      expect(pngSize(dest)).toEqual(PLAY_PHONE);
    }
    const staged = readdirSync(PLAY_OUT).filter(name => name.endsWith('.png'));
    expect(staged.sort()).toEqual(sourceIphone.sort());

    expect(Object.keys(LOCALIZATIONS)).toHaveLength(17);
    expect(new Set(Object.values(LOCALIZATIONS).map(({ playLocale }) => playLocale)).size).toBe(17);
    for (const [appleLocale, { playLocale }] of Object.entries(LOCALIZATIONS)) {
      const iosFiles = readdirSync(join(IOS_ROOT, appleLocale)).filter(name => name.endsWith('.png'));
      const playFiles = readdirSync(
        join(PLAY_ROOT, playLocale, 'images/phoneScreenshots'),
      ).filter(name => name.endsWith('.png'));
      expect(iosFiles).toHaveLength(10);
      expect(playFiles).toHaveLength(5);
      const title = readFileSync(join(PLAY_ROOT, playLocale, 'title.txt'), 'utf8').trim();
      const shortDescription = readFileSync(
        join(PLAY_ROOT, playLocale, 'short_description.txt'),
        'utf8',
      ).trim();
      const fullDescription = readFileSync(
        join(PLAY_ROOT, playLocale, 'full_description.txt'),
        'utf8',
      ).trim();
      expect([...title].length).toBeLessThanOrEqual(30);
      expect([...shortDescription].length).toBeLessThanOrEqual(80);
      expect([...fullDescription].length).toBeLessThanOrEqual(4000);
    }

    expect(
      readFileSync(join(IOS_ROOT, 'ja', 'iphone-69-05-home.png')).equals(
        readFileSync(join(IOS_ROOT, 'en-US', 'iphone-69-05-home.png')),
      ),
    ).toBe(false);
  });
});
