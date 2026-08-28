import type { PickerOption } from './components/picker-sheet';

import type { Language } from '@/lib/i18n';

import { LANGUAGE_NAMES, resolveLanguage, SUPPORTED_LANGUAGES, useSelectedLanguage } from '@/lib/i18n';
import { PickerSheet } from './components/picker-sheet';

const options: PickerOption<Language>[] = SUPPORTED_LANGUAGES.map(lang => ({
  value: lang,
  label: LANGUAGE_NAMES[lang],
}));

export function LanguagePickerScreen() {
  const { language, setLanguage } = useSelectedLanguage();

  return (
    <PickerSheet
      options={options}
      selectedValue={resolveLanguage(language) ?? 'en'}
      onSelect={setLanguage}
    />
  );
}
