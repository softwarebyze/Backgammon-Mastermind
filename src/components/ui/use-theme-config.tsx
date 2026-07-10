import { DarkTheme as _DarkTheme } from 'expo-router';

import colors from '@/components/ui/colors';

const DarkTheme = {
  ..._DarkTheme,
  colors: {
    ..._DarkTheme.colors,
    primary: colors.primary[200],
    background: colors.charcoal[950],
    text: colors.charcoal[100],
    border: colors.charcoal[500],
    card: colors.charcoal[850],
  },
};

export function getThemeConfig() {
  return DarkTheme;
}
