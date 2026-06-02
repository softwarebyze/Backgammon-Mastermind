import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';

export function GameOptionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Pressable
        accessibilityRole="link"
        style={styles.row}
        onPress={() => {
          // Ensure the formSheet is dismissed before navigating, otherwise Settings
          // renders behind the sheet and feels "stuck" in the stack.
          router.back();
          requestAnimationFrame(() => router.push('/settings'));
        }}
      >
        <Text style={styles.rowText}>{translate('game.options.open_settings')}</Text>
        <Text style={styles.rowHint}>{translate('game.options.open_settings_hint')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: GAME_PALETTE.surface,
  },
  row: {
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowText: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowHint: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
