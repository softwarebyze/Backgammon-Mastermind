import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, Text } from '@/components/ui';
import { GamePreferencesPanel } from '@/features/game/components/game-preferences-panel';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { SettingsChevron } from '@/features/settings/components/settings-chevron';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';
import { SETTINGS_ROW_PADDING_H } from '@/lib/ui/settings-layout';

export function GameOptionsScreen() {
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setShowPointNumbers,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
    setSoundEnabled,
  } = useGamePreferences();

  const trackPreference = React.useCallback(
    (preference: string, value: boolean | string) => {
      posthog.capture('game_preference_changed', { preference, value });
    },
    [posthog],
  );

  const onShowMoveHintsChange = React.useCallback((v: boolean) => {
    trackPreference('move_hints', v);
    setShowMoveHints(v);
  }, [trackPreference, setShowMoveHints]);
  const onShowDirectionOverlayChange = React.useCallback((v: boolean) => {
    trackPreference('direction_overlay', v);
    setShowDirectionOverlay(v);
  }, [trackPreference, setShowDirectionOverlay]);
  const onShowPointNumbersChange = React.useCallback((v: boolean) => {
    trackPreference('point_numbers', v);
    setShowPointNumbers(v);
  }, [trackPreference, setShowPointNumbers]);
  const onDiceDisplayStyleChange = React.useCallback((v: Parameters<typeof setDiceDisplayStyle>[0]) => {
    trackPreference('dice_display_style', v);
    setDiceDisplayStyle(v);
  }, [trackPreference, setDiceDisplayStyle]);
  const onAutoRollChange = React.useCallback((v: boolean) => {
    trackPreference('auto_roll', v);
    setAutoRoll(v);
  }, [trackPreference, setAutoRoll]);
  const onAutoMoveWhenForcedChange = React.useCallback((v: boolean) => {
    trackPreference('auto_move', v);
    setAutoMoveWhenForced(v);
  }, [trackPreference, setAutoMoveWhenForced]);
  const onSoundEnabledChange = React.useCallback((v: boolean) => {
    trackPreference('sound', v);
    setSoundEnabled(v);
  }, [trackPreference, setSoundEnabled]);

  const openSettings = React.useCallback(() => {
    hapticLight();
    router.back();
    requestAnimationFrame(() => router.push('/settings'));
  }, []);

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: Math.max(insets.bottom, 20) + 8 },
      ]}
    >
      <GamePreferencesPanel
        preferences={preferences}
        onShowMoveHintsChange={onShowMoveHintsChange}
        onShowDirectionOverlayChange={onShowDirectionOverlayChange}
        onShowPointNumbersChange={onShowPointNumbersChange}
        onDiceDisplayStyleChange={onDiceDisplayStyleChange}
        onAutoRollChange={onAutoRollChange}
        onAutoMoveWhenForcedChange={onAutoMoveWhenForcedChange}
        onSoundEnabledChange={onSoundEnabledChange}
        showHints
      />

      <Pressable accessibilityRole="link" style={styles.row} onPress={openSettings}>
        <View style={styles.rowBody}>
          <Text className="text-base font-semibold" style={styles.rowText} tx="game.options.open_settings" />
          <Text className="mt-1 text-sm" style={styles.rowHint} tx="game.options.open_settings_hint" />
        </View>
        <SettingsChevron />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.surface,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingTop: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowBody: {
    flex: 1,
  },
  rowText: {
    color: GAME_PALETTE.text,
  },
  rowHint: {
    color: GAME_PALETTE.textMuted,
  },
});
