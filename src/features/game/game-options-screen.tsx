import { Link } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAME_PALETTE } from '@/features/game/game-palette';

export function GameOptionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Text style={styles.title}>Game options</Text>

      <Link href="/settings" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowText}>Language, theme & more</Text>
          <Text style={styles.rowHint}>Open Settings</Text>
        </Pressable>
      </Link>
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
  title: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
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
