import type { NativeStackNavigationOptions } from 'expo-router/build/react-navigation/native-stack/types';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';

const gameHeaderTitleStyle = {
  color: GAME_PALETTE.accent,
  fontFamily: 'Inter_700Bold',
  fontSize: 17,
} as const;

const gameHeaderStyle = {
  backgroundColor: GAME_PALETTE.surface,
} as const;

/** Home — native header with settings in the top bar */
export const homeScreenOptions: NativeStackNavigationOptions = {
  title: '',
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: GAME_PALETTE.bg },
  headerTintColor: GAME_PALETTE.accent,
  headerTitleStyle: gameHeaderTitleStyle,
  contentStyle: { backgroundColor: GAME_PALETTE.bg },
};

/** Active game board */
export const gamePlayScreenOptions: NativeStackNavigationOptions = {
  // The in-game UI renders its own header; avoid a second native header.
  headerShown: false,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: gameHeaderStyle,
  headerTintColor: GAME_PALETTE.accent,
  headerTitleStyle: gameHeaderTitleStyle,
  contentStyle: { backgroundColor: GAME_PALETTE.bg },
};

export const gameFormSheetOptions: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.68],
  sheetCornerRadius: 16,
  sheetExpandsWhenScrolledToEdge: true,
  title: 'Game options',
  headerShown: true,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: gameHeaderStyle,
  headerTintColor: GAME_PALETTE.accent,
  headerTitleStyle: gameHeaderTitleStyle,
  contentStyle: { backgroundColor: GAME_PALETTE.surface },
};

export const settingsStackOptions: NativeStackNavigationOptions = {
  title: translate('settings.title'),
  headerShown: true,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: { backgroundColor: GAME_PALETTE.bg },
  headerTintColor: GAME_PALETTE.accent,
  headerTitleStyle: gameHeaderTitleStyle,
  contentStyle: { backgroundColor: GAME_PALETTE.bg },
};

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
    headerStyle: gameHeaderStyle,
    headerTintColor: GAME_PALETTE.accent,
    headerTitleStyle: gameHeaderTitleStyle,
    contentStyle: { backgroundColor: GAME_PALETTE.surface },
  };
}
