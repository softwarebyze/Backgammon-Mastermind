import type { PickerOption } from './components/picker-sheet';

import type { ColorSchemeType } from '@/lib/hooks/use-selected-theme';
import { useSelectedTheme } from '@/lib/hooks/use-selected-theme';

import { translate } from '@/lib/i18n';
import { PickerSheet } from './components/picker-sheet';

export function ThemePickerScreen() {
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();

  const options: PickerOption<ColorSchemeType>[] = [
    { value: 'dark', label: translate('settings.theme.dark') },
    { value: 'light', label: translate('settings.theme.light') },
    { value: 'system', label: translate('settings.theme.system') },
  ];

  return (
    <PickerSheet
      options={options}
      selectedValue={selectedTheme}
      onSelect={setSelectedTheme}
    />
  );
}
