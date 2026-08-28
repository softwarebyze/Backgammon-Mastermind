import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const STORE_LOCALES = join(ROOT, 'store/locales');
const PLAY_METADATA = join(ROOT, 'fastlane/metadata/android');

const ASC_PACKS = [
  'ar',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'fi',
  'fr',
  'he',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'nl',
  'no',
  'pl',
  'pt',
  'pt-BR',
  'ro',
  'ru',
  'sk',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
  'zh-Hans',
  'zh-Hant',
];

const PLAY_LOCALES = [
  'en-US',
  'ar',
  'ca',
  'cs-CZ',
  'da-DK',
  'de-DE',
  'el-GR',
  'es-ES',
  'es-419',
  'fi-FI',
  'fr-FR',
  'iw-IL',
  'hi-IN',
  'hr',
  'hu-HU',
  'id',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'ms',
  'nl-NL',
  'no-NO',
  'pl-PL',
  'pt-BR',
  'pt-PT',
  'ro',
  'ru-RU',
  'sk',
  'sv-SE',
  'th',
  'tr-TR',
  'uk',
  'vi',
  'zh-CN',
  'zh-TW',
];

describe('store listings', () => {
  it('has ASC locale packs that mention Learn to Play', () => {
    const onDisk = readdirSync(STORE_LOCALES).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
    expect(onDisk.sort()).toEqual([...ASC_PACKS].sort());

    for (const pack of ASC_PACKS) {
      const data = JSON.parse(readFileSync(join(STORE_LOCALES, `${pack}.json`), 'utf8')) as {
        subtitle: string;
        promoText: string;
        description: string;
        keywords: string[];
        releaseNotes: string;
      };
      expect(data.subtitle.length).toBeGreaterThan(0);
      expect(data.promoText.length).toBeGreaterThan(0);
      expect(data.description.length).toBeGreaterThan(0);
      expect(data.keywords.length).toBeGreaterThan(0);
      expect(data.keywords.join(',').length).toBeLessThanOrEqual(100);
      expect(data.releaseNotes.length).toBeGreaterThan(0);
      if (pack === 'en') {
        expect(data.description).toMatch(/Learn to Play/);
        expect(data.promoText).toMatch(/Learn to Play/);
      }
      else {
        expect(data.description.length).toBeGreaterThan(300);
        expect(data.promoText.length).toBeGreaterThan(20);
      }
    }
  });

  it('has Play listing files within length limits', () => {
    for (const locale of PLAY_LOCALES) {
      const dir = join(PLAY_METADATA, locale);
      const title = readFileSync(join(dir, 'title.txt'), 'utf8').trim();
      const short = readFileSync(join(dir, 'short_description.txt'), 'utf8').trim();
      const full = readFileSync(join(dir, 'full_description.txt'), 'utf8').trim();
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(50);
      expect(short.length).toBeGreaterThan(0);
      expect(short.length).toBeLessThanOrEqual(80);
      expect(full.length).toBeGreaterThan(0);
      expect(full.length).toBeLessThanOrEqual(4000);
    }
    const enShort = readFileSync(join(PLAY_METADATA, 'en-US/short_description.txt'), 'utf8');
    expect(enShort).toMatch(/Learn/);
  });

  it('does not require invented Play screenshots', () => {
    expect(existsSync(join(PLAY_METADATA, 'en-US/images/phoneScreenshots/.gitkeep'))).toBe(true);
  });
});
