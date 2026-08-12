import ar from '@/translations/ar.json';
import de from '@/translations/de.json';
import el from '@/translations/el.json';
import en from '@/translations/en.json';
import es from '@/translations/es.json';
import fr from '@/translations/fr.json';
import he from '@/translations/he.json';
import hi from '@/translations/hi.json';
import it from '@/translations/it.json';
import ja from '@/translations/ja.json';
import ko from '@/translations/ko.json';
import nl from '@/translations/nl.json';
import pl from '@/translations/pl.json';
import pt from '@/translations/pt.json';
import ru from '@/translations/ru.json';
import tr from '@/translations/tr.json';
import zh from '@/translations/zh.json';

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
  de: { translation: de },
  el: { translation: el },
  es: { translation: es },
  fr: { translation: fr },
  he: { translation: he },
  hi: { translation: hi },
  it: { translation: it },
  ja: { translation: ja },
  ko: { translation: ko },
  nl: { translation: nl },
  pl: { translation: pl },
  pt: { translation: pt },
  ru: { translation: ru },
  tr: { translation: tr },
  zh: { translation: zh },
};

export type Language = keyof typeof resources;

/** Endonyms — each language named in itself, so the picker is readable to everyone. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ar: 'العربية',
  de: 'Deutsch',
  el: 'Ελληνικά',
  es: 'Español',
  fr: 'Français',
  he: 'עברית',
  hi: 'हिन्दी',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  ru: 'Русский',
  tr: 'Türkçe',
  zh: '中文',
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_NAMES) as Language[];

export const RTL_LANGUAGES: ReadonlySet<Language> = new Set(['ar', 'he']);

export function isSupportedLanguage(code: string | undefined): code is Language {
  return !!code && code in resources;
}
