import { router } from 'expo-router';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text, View } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { SettingsChevron } from '@/features/settings/components/settings-chevron';
import { hapticLight } from '@/lib/haptics';

export function GameOptionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <Text
        className="mb-4 text-lg font-bold"
        style={styles.title}
        tx="game.options.title"
      />

      <Pressable
        accessibilityRole="link"
        style={styles.row}
        onPress={() => {
          hapticLight();
          // Ensure the formSheet is dismissed before navigating, otherwise Settings
          // renders behind the sheet and feels "stuck" in the stack.
          router.back();
          requestAnimationFrame(() => router.push('/settings'));
        }}
      >
        <View style={styles.rowBody}>
          <Text
            className="text-base font-semibold"
            style={styles.rowText}
            tx="game.options.open_settings"
          />
          <Text
            className="mt-1 text-sm"
            style={styles.rowHint}
            tx="game.options.open_settings_hint"
          />
        </View>
        <SettingsChevron />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: GAME_PALETTE.surface,
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
