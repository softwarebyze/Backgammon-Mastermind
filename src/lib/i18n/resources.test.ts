import { resources, RTL_LANGUAGES, SUPPORTED_LANGUAGES } from './resources';

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

function placeholders(value: string) {
  return [...value.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]).sort();
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
      expect(Object.keys(localized)).toEqual(Object.keys(english));
      for (const [key, source] of Object.entries(english)) {
        expect(placeholders(localized[key] ?? '')).toEqual(placeholders(source));
      }
    }
  });
});
