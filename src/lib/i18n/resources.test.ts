import { resources, RTL_LANGUAGES, SUPPORTED_LANGUAGES } from './resources';

/** Flatten nested locale objects for key and placeholder parity checks. */
function flatten(node: unknown, path = '', output: Record<string, string> = {}) {
  if (typeof node === 'string') {
    output[path] = node;
    return output;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      flatten(value, path ? `${path}.${key}` : key, output);
    }
  }
  return output;
}

/** Return the sorted interpolation placeholders embedded in a message. */
function placeholders(value: string) {
  return [...value.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]).sort();
}

/**
 * New Learn curriculum keys, intentionally English-only while the curriculum
 * stabilizes (decision 2026-09-24: do not translate the partial curriculum
 * yet). i18next falls back to English for these at runtime.
 * Keep in sync with `settings['i18n-json/ignore-keys']` in eslint.config.mjs.
 */
const PENDING_TRANSLATION_KEYS = [
  'learn.lessons.pip_count',
  'learn.lessons.strategies',
  'learn.quiz.pip_ahead',
  'learn.quiz.pip_meaning',
  'learn.quiz.strat_blitz',
  'learn.quiz.strat_prime',
];

/** True when a flattened key path falls under a pending-translation parent. */
function isPendingTranslation(key: string) {
  return PENDING_TRANSLATION_KEYS.some(
    parent => key === parent || key.startsWith(`${parent}.`),
  );
}

describe('translation resources', () => {
  it('ships the 17 languages planned for 1.0.2', () => {
    expect(SUPPORTED_LANGUAGES).toEqual([
      'en',
      'ar',
      'de',
      'el',
      'es',
      'fr',
      'he',
      'hi',
      'it',
      'ja',
      'ko',
      'nl',
      'pl',
      'pt',
      'ru',
      'tr',
      'zh',
    ]);
    expect([...RTL_LANGUAGES]).toEqual(['ar', 'he']);
  });

  it('keeps every locale structurally complete with matching placeholders', () => {
    const english = flatten(resources.en.translation);

    for (const language of SUPPORTED_LANGUAGES) {
      const localized = flatten(resources[language].translation);
      const expectedKeys
        = language === 'en'
          ? Object.keys(english)
          : Object.keys(english).filter(key => !isPendingTranslation(key));
      expect(Object.keys(localized)).toEqual(expectedKeys);
      for (const [key, source] of Object.entries(english)) {
        if (language !== 'en' && isPendingTranslation(key))
          continue;
        expect(placeholders(localized[key] ?? '')).toEqual(placeholders(source));
      }
    }
  });

  it('keeps release-critical actions and lesson copy readable', () => {
    expect(resources.it.translation.error.retry).toBe('Riprova');
    expect(resources.he.translation.error.retry).toBe('נסה שוב');
    expect(resources.hi.translation.error.retry).toBe('फिर से कोशिश करें');
    expect(resources.ja.translation.home.confirm_continue).toBe('続ける');
    expect(resources.ja.translation.learn.continue).toBe('続ける');
    expect(resources.ko.translation.game.controls.cancel).toBe('취소');
    expect(resources.pl.translation.error.retry).toBe('Spróbuj ponownie');
    expect(resources.pt.translation.game.controls.bear_off_a11y).toBe('Retirar pedra');
    expect(resources.ru.translation.game.controls.bear_off_a11y).toBe('Снять шашку с доски');
    expect(resources.es.translation.learn.lessons.direction_setup.title).not.toContain('&quot;');
    expect(resources.tr.translation.learn.feedback.move_progress).toBe(
      'Güzel — {{needed}} hamleden {{done}} tanesi tamamlandı.',
    );
  });
});
