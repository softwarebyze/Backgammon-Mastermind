import type { PickerOption } from './components/picker-sheet';

import type { Language } from '@/lib/i18n/resources';

import { translate, useSelectedLanguage } from '@/lib/i18n';
import { PickerSheet } from './components/picker-sheet';

export function LanguagePickerScreen() {
  const { language, setLanguage } = useSelectedLanguage();

  const options: PickerOption<Language>[] = [
    { value: 'en', label: translate('settings.english') },
    { value: 'ar', label: translate('settings.arabic') },
  ];

  return (
    <PickerSheet
      options={options}
      selectedValue={language}
      onSelect={setLanguage}
    />
  );
}
