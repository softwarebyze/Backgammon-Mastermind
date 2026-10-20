import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const RAW_SOURCE = join(ROOT, 'docs/marketing/app-store-screenshots/raw');
const FRAMES = JSON.parse(
  readFileSync(join(ROOT, 'docs/marketing/screenshot-frames.json'), 'utf8'),
) as { frames: Array<{ device: string; source: string; dest: string }> };
const LOCALIZATIONS = JSON.parse(
  readFileSync(join(ROOT, 'docs/marketing/screenshot-localizations.json'), 'utf8'),
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
  it('selects deterministic font fallbacks for every non-Latin screenshot script', () => {
    const source = readFileSync(
      join(ROOT, 'scripts/prepare-store-screenshots.mjs'),
      'utf8',
    );

    expect(source).toContain('\'Noto Sans Arabic\'');
    expect(source).toContain('\'Noto Sans Hebrew\'');
    expect(source).toContain('\'Noto Sans Devanagari\'');
    expect(source).toContain('\'Noto Sans CJK JP\'');
    expect(source).toContain('\'Noto Sans CJK KR\'');
    expect(source).toContain('\'Noto Sans CJK SC\'');
    // eslint-disable-next-line no-template-curly-in-string -- asserting the literal placeholder in source
    expect(source).toContain('xml:lang="${language}"');
  });

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

    // iMessage-app screenshots: 4 iPhone (1206×2622) + 4 iPad (2064×2752) per locale.
    for (const appleLocale of Object.keys(LOCALIZATIONS)) {
      const dir = join(IOS_ROOT, 'iMessage', appleLocale);
      const sizes = readdirSync(dir)
        .filter(name => name.endsWith('.png'))
        .map(name => pngSize(join(dir, name)));
      expect(sizes.filter(({ width, height }) => width === 1206 && height === 2622)).toHaveLength(4);
      expect(sizes.filter(({ width, height }) => width === 2064 && height === 2752)).toHaveLength(4);
      expect(sizes).toHaveLength(8);
    }

    expect(
      readFileSync(join(IOS_ROOT, 'ja', 'iphone-69-05-home.png')).equals(
        readFileSync(join(IOS_ROOT, 'en-US', 'iphone-69-05-home.png')),
      ),
    ).toBe(false);
  });
});

describe('iMessage screenshot validation', () => {
  const SOURCE = join(ROOT, 'docs/marketing/app-store-screenshots/imessage');
  const FILES = readdirSync(SOURCE).filter(name => name.endsWith('.png')).sort();
  let dir: string;

  function runWith(sourceDir: string) {
    try {
      execFileSync(process.execPath, ['scripts/prepare-store-screenshots.mjs'], {
        cwd: ROOT,
        env: { ...process.env, IMESSAGE_SCREENSHOTS_DIR: sourceDir },
        stdio: 'pipe',
      });
      return '';
    }
    catch (error) {
      return String((error as { stderr?: { toString: () => string } }).stderr ?? error);
    }
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'imessage-shots-'));
    for (const name of FILES) copyFileSync(join(SOURCE, name), join(dir, name));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('ships exactly 4 iPhone 1206x2622 and 4 iPad 2064x2752 frames', () => {
    expect(FILES).toHaveLength(8);
    expect(FILES.filter(name => name.startsWith('imessage-iphone-61-'))).toHaveLength(4);
    expect(FILES.filter(name => name.startsWith('imessage-ipad-13-'))).toHaveLength(4);
    for (const name of FILES) {
      expect(pngSize(join(SOURCE, name))).toEqual(
        name.startsWith('imessage-iphone-61-')
          ? { width: 1206, height: 2622 }
          : { width: 2064, height: 2752 },
      );
    }
  });

  it('fails when a frame is missing', () => {
    rmSync(join(dir, FILES[0]));
    expect(runWith(dir)).toContain(`Missing: ${FILES[0]}`);
  });

  it('fails when an unexpected frame is present', () => {
    copyFileSync(join(dir, FILES[0]), join(dir, 'imessage-iphone-61-05-extra.png'));
    expect(runWith(dir)).toContain('Unexpected: imessage-iphone-61-05-extra.png');
  });

  it('fails when a frame has the wrong pixel size', () => {
    // An iPad-sized frame saved under an iPhone slot name.
    copyFileSync(join(dir, 'imessage-ipad-13-01-staged.png'), join(dir, 'imessage-iphone-61-01-staged.png'));
    expect(runWith(dir)).toContain('imessage-iphone-61-01-staged.png is 2064×2752; expected 1206×2622');
  });

  it('fails when a frame is not a PNG', () => {
    writeFileSync(join(dir, 'imessage-ipad-13-04-new.png'), 'not a png at all, just text');
    expect(runWith(dir)).toContain('is not a valid PNG');
  });
});
