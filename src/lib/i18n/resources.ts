import ar from '@/translations/ar.json';
import ca from '@/translations/ca.json';
import cs from '@/translations/cs.json';
import da from '@/translations/da.json';
import de from '@/translations/de.json';
import el from '@/translations/el.json';
import en from '@/translations/en.json';
import es from '@/translations/es.json';
import fi from '@/translations/fi.json';
import fr from '@/translations/fr.json';
import he from '@/translations/he.json';
import hi from '@/translations/hi.json';
import hr from '@/translations/hr.json';
import hu from '@/translations/hu.json';
import id from '@/translations/id.json';
import it from '@/translations/it.json';
import ja from '@/translations/ja.json';
import ko from '@/translations/ko.json';
import ms from '@/translations/ms.json';
import nl from '@/translations/nl.json';
import no from '@/translations/no.json';
import pl from '@/translations/pl.json';
import pt from '@/translations/pt.json';
import ro from '@/translations/ro.json';
import ru from '@/translations/ru.json';
import sk from '@/translations/sk.json';
import sv from '@/translations/sv.json';
import th from '@/translations/th.json';
import tr from '@/translations/tr.json';
import uk from '@/translations/uk.json';
import vi from '@/translations/vi.json';
import zhHant from '@/translations/zh-hant.json';
import zh from '@/translations/zh.json';

export const resources = {
  'en': { translation: en },
  'ar': { translation: ar },
  'ca': { translation: ca },
  'cs': { translation: cs },
  'da': { translation: da },
  'de': { translation: de },
  'el': { translation: el },
  'es': { translation: es },
  'fi': { translation: fi },
  'fr': { translation: fr },
  'he': { translation: he },
  'hi': { translation: hi },
  'hr': { translation: hr },
  'hu': { translation: hu },
  'id': { translation: id },
  'it': { translation: it },
  'ja': { translation: ja },
  'ko': { translation: ko },
  'ms': { translation: ms },
  'nl': { translation: nl },
  'no': { translation: no },
  'pl': { translation: pl },
  'pt': { translation: pt },
  'ro': { translation: ro },
  'ru': { translation: ru },
  'sk': { translation: sk },
  'sv': { translation: sv },
  'th': { translation: th },
  'tr': { translation: tr },
  'uk': { translation: uk },
  'vi': { translation: vi },
  'zh': { translation: zh },
  'zh-Hant': { translation: zhHant },
};

export type Language = keyof typeof resources;

/** Endonyms — each language named in itself, so the picker is readable to everyone. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  'en': 'English',
  'ar': 'العربية',
  'ca': 'Català',
  'cs': 'Čeština',
  'da': 'Dansk',
  'de': 'Deutsch',
  'el': 'Ελληνικά',
  'es': 'Español',
  'fi': 'Suomi',
  'fr': 'Français',
  'he': 'עברית',
  'hi': 'हिन्दी',
  'hr': 'Hrvatski',
  'hu': 'Magyar',
  'id': 'Bahasa Indonesia',
  'it': 'Italiano',
  'ja': '日本語',
  'ko': '한국어',
  'ms': 'Bahasa Melayu',
  'nl': 'Nederlands',
  'no': 'Norsk',
  'pl': 'Polski',
  'pt': 'Português',
  'ro': 'Română',
  'ru': 'Русский',
  'sk': 'Slovenčina',
  'sv': 'Svenska',
  'th': 'ไทย',
  'tr': 'Türkçe',
  'uk': 'Українська',
  'vi': 'Tiếng Việt',
  'zh': '中文（简体）',
  'zh-Hant': '中文（繁體）',
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_NAMES) as Language[];

export const RTL_LANGUAGES: ReadonlySet<Language> = new Set(['ar', 'he']);

function isSupportedLanguage(code: string | undefined): code is Language {
  return !!code && code in resources;
}

/**
 * Map a device locale (BCP-47) onto a catalog language.
 * Handles regional tags (pt-BR → pt) and Chinese script variants.
 */
export function resolveLanguage(tagOrCode: string | undefined): Language | undefined {
  if (!tagOrCode)
    return undefined;

  const normalized = tagOrCode.replace('_', '-');
  if (isSupportedLanguage(normalized))
    return normalized;

  const lower = normalized.toLowerCase();
  if (lower.startsWith('zh-hant') || lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo'))
    return 'zh-Hant';
  if (lower.startsWith('zh'))
    return 'zh';

  const base = normalized.split('-')[0];
  if (base === 'nb' || base === 'nn')
    return isSupportedLanguage('no') ? 'no' : undefined;

  return isSupportedLanguage(base) ? base : undefined;
}
