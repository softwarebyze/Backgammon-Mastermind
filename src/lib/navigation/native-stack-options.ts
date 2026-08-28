import type { NativeStackNavigationOptions } from 'expo-router';

import { Platform } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

const gameHeaderTitleStyle = {
  color: GAME_PALETTE.accent,
  ...interFont('bold'),
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
  // Opaque: iOS 26 transparent headers rubber-band non-ScrollView screens.
  headerTransparent: false,
  headerStyle: { backgroundColor: GAME_PALETTE.bg },
  contentStyle: { backgroundColor: GAME_PALETTE.bg },
  scrollEdgeEffects: {
    top: 'hidden',
    bottom: 'hidden',
    left: 'hidden',
    right: 'hidden',
  },
};

/** Active game board — native header hosts the player label + options/reset actions. */
export const gamePlayScreenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  // Home is a custom left item, not the system back control (refresh must keep it).
  headerBackVisible: false,
  gestureEnabled: false,
  headerStyle: gameHeaderStyle,
  headerTintColor: GAME_PALETTE.accent,
  headerTitleStyle: gameHeaderTitleStyle,
  contentStyle: { backgroundColor: GAME_PALETTE.bg },
};

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
    headerLargeTitle: Platform.OS === 'ios',
    headerBlurEffect: 'none',
    headerBackButtonDisplayMode: 'minimal',
  };
}

/**
 * Learn curriculum — opaque header, no large title.
 * Settings-style transparent/large titles overlap learn screen content.
 */
export function learnStackOptions(title: string): NativeStackNavigationOptions {
  return {
    title,
    headerShown: true,
    headerTransparent: false,
    headerLargeTitle: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: GAME_PALETTE.bg },
    headerTintColor: GAME_PALETTE.accent,
    headerTitleStyle: gameHeaderTitleStyle,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: GAME_PALETTE.bg },
    // Board drags near the left edge must not trigger iOS interactive pop.
    gestureEnabled: false,
    fullScreenGestureEnabled: false,
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
