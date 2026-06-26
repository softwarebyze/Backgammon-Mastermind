import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, ScrollView, Text, View } from '@/components/ui';
import { GamePreferencesPanel } from '@/features/game/components/game-preferences-panel';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { SettingsChevron } from '@/features/settings/components/settings-chevron';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';
import { SETTINGS_ROW_PADDING_H } from '@/lib/ui/settings-layout';

export function GameOptionsScreen() {
  const insets = useSafeAreaInsets();
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
  } = useGamePreferences();

  const openSettings = React.useCallback(() => {
    hapticLight();
    // Dismiss the formSheet before navigating, otherwise Settings renders behind
    // the sheet and feels "stuck" in the stack.
    router.back();
    requestAnimationFrame(() => router.push('/settings'));
  }, []);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: Math.max(insets.bottom, 20) + 8 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-lg font-bold" style={styles.title} tx="game.options.title" />

      <GamePreferencesPanel
        preferences={preferences}
        onShowMoveHintsChange={setShowMoveHints}
        onShowDirectionOverlayChange={setShowDirectionOverlay}
        onDiceDisplayStyleChange={setDiceDisplayStyle}
        onAutoRollChange={setAutoRoll}
        onAutoMoveWhenForcedChange={setAutoMoveWhenForced}
        showHints
      />

      <Pressable accessibilityRole="link" style={styles.row} onPress={openSettings}>
        <View style={styles.rowBody}>
          <Text className="text-base font-semibold" style={styles.rowText} tx="game.options.open_settings" />
          <Text className="mt-1 text-sm" style={styles.rowHint} tx="game.options.open_settings_hint" />
        </View>
        <SettingsChevron />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.surface,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingTop: 12,
    gap: 16,
  },
  title: {
    color: GAME_PALETTE.text,
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
