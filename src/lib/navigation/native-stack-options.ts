import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';

/**
 * Screen options accepted by `<Stack.Screen options={...} />`, derived from
 * expo-router's public API. We avoid importing from
 * `@react-navigation/native-stack` (not a direct dependency in SDK 56) and from
 * expo-router's internal build paths.
 */
type NativeStackNavigationOptions = NonNullable<
  ComponentProps<typeof Stack.Screen>['options']
>;

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

/** Active game board — native header hosts the player label + options/reset actions. */
export const gamePlayScreenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: gameHeaderStyle,
  headerTintColor: GAME_PALETTE.accent,
  headerTitleStyle: gameHeaderTitleStyle,
  contentStyle: { backgroundColor: GAME_PALETTE.bg },
};

export function gameFormSheetOptions(): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    // Holds the scrollable game-preferences panel; let it grow when scrolled.
    sheetAllowedDetents: [0.7],
    sheetCornerRadius: 16,
    sheetExpandsWhenScrolledToEdge: true,
    // Title is rendered in-content (see GameOptionsScreen) rather than a native header.
    headerShown: false,
    contentStyle: { backgroundColor: GAME_PALETTE.surface },
  };
}

export function settingsStackOptions(): NativeStackNavigationOptions {
  return {
    title: translate('settings.title'),
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: { backgroundColor: GAME_PALETTE.bg },
    headerTintColor: GAME_PALETTE.accent,
    headerTitleStyle: gameHeaderTitleStyle,
    contentStyle: { backgroundColor: GAME_PALETTE.bg },
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
    headerStyle: gameHeaderStyle,
    headerTintColor: GAME_PALETTE.accent,
    headerTitleStyle: gameHeaderTitleStyle,
    contentStyle: { backgroundColor: GAME_PALETTE.surface },
  };
}
