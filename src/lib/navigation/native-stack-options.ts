import type { NativeStackNavigationOptions } from 'expo-router';

import { Platform } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';

/** Home — native header with settings in the top bar */
export const homeScreenOptions: NativeStackNavigationOptions = {
  title: '',
  headerShown: true,
  headerShadowVisible: false,
  headerTransparent: true,
};

/** Active game board */
export const gamePlayScreenOptions: NativeStackNavigationOptions = {
  // The in-game UI renders its own header; avoid a second native header.
  headerShown: false,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
};

export function gameFormSheetOptions(): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    // One option row + title — avoid a mostly empty 68% sheet.
    sheetAllowedDetents: [0.36],
    sheetCornerRadius: 16,
    sheetExpandsWhenScrolledToEdge: false,
    headerShown: false,
    contentStyle: { backgroundColor: GAME_PALETTE.surface },
  };
}

export function settingsStackOptions(): NativeStackNavigationOptions {
  return {
    title: translate('settings.title'),
    headerShown: true,
    headerStyle: { backgroundColor: GAME_PALETTE.bg },
    headerTintColor: GAME_PALETTE.accent,
    // on android, true causes header to cover up underlying content
    headerTransparent: Platform.OS === 'ios',
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: 'transparent' },
    headerLargeTitle: true,
    headerBlurEffect: 'none',
    headerBackButtonDisplayMode: 'minimal',
  };
}

export function pickerFormSheetOptions(title: string): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.32],
    sheetCornerRadius: 16,
    title,
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  };
}
