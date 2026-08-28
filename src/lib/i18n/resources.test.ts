import {
  LANGUAGE_NAMES,
  resolveLanguage,
  resources,
  RTL_LANGUAGES,
  SUPPORTED_LANGUAGES,
} from './resources';

function flatten(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return flatten(child, path);
    });
  }
  return prefix ? [prefix] : [];
}

const EXPECTED_LANGUAGES = [
  'en',
  'ar',
  'ca',
  'cs',
  'da',
  'de',
  'el',
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
  'ro',
  'ru',
  'sk',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
  'zh',
  'zh-Hant',
] as const;

describe('i18n catalogs', () => {
  const englishKeys = flatten(resources.en.translation).sort();

  it('registers 33 languages with endonyms', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(33);
    expect([...SUPPORTED_LANGUAGES].sort()).toEqual([...EXPECTED_LANGUAGES].sort());
    expect(Object.keys(LANGUAGE_NAMES).sort()).toEqual([...EXPECTED_LANGUAGES].sort());
    expect(LANGUAGE_NAMES.ar).toBe('العربية');
    expect(LANGUAGE_NAMES.he).toBe('עברית');
    expect(LANGUAGE_NAMES.ja).toBe('日本語');
    expect(LANGUAGE_NAMES['zh-Hant']).toBe('中文（繁體）');
  });

  it('keeps every catalog keyed identically to English', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(flatten(resources[lang].translation).sort()).toEqual(englishKeys);
    }
  });

  it('includes Learn to Play + current Settings strings in every locale', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const catalog = resources[lang].translation as {
        learn: { title: string; continue: string; graduation: { quiz_title: string } };
        game: { preferences: { fast_computer: string }; controls: { skip_wait: string; cancel: string } };
        home: { title: string };
      };
      expect(catalog.learn.title.length).toBeGreaterThan(0);
      expect(catalog.learn.continue.length).toBeGreaterThan(0);
      expect(catalog.learn.graduation.quiz_title.length).toBeGreaterThan(0);
      expect(catalog.game.preferences.fast_computer.length).toBeGreaterThan(0);
      expect(catalog.game.controls.skip_wait.length).toBeGreaterThan(0);
      expect(catalog.game.controls.cancel.length).toBeGreaterThan(0);
      expect(catalog.home.title.length).toBeGreaterThan(0);
    }
  });

  it('maps device locales onto catalogs', () => {
    expect(resolveLanguage('pt-BR')).toBe('pt');
    expect(resolveLanguage('zh-Hant-TW')).toBe('zh-Hant');
    expect(resolveLanguage('zh-TW')).toBe('zh-Hant');
    expect(resolveLanguage('nb')).toBe('no');
    expect(resolveLanguage('nn-NO')).toBe('no');
    expect(resolveLanguage('zh-CN')).toBe('zh');
    expect(resolveLanguage('es-MX')).toBe('es');
    expect(resolveLanguage(undefined)).toBeUndefined();
    expect(resolveLanguage('xx-ZZ')).toBeUndefined();
  });

  it('loads RTL catalogs for Arabic and Hebrew', () => {
    expect([...RTL_LANGUAGES].sort()).toEqual(['ar', 'he']);
    expect(resources.ar.translation).toBeDefined();
    expect(resources.he.translation).toBeDefined();
    expect(resources.ar.translation.learn.title).not.toBe(resources.en.translation.learn.title);
    expect(resources.he.translation.settings.title).not.toBe(resources.en.translation.settings.title);
  });
});
