import Feather from '@expo/vector-icons/Feather';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  query: string;
  onClear: () => void;
};

export function SettingsNoResults({ query, onClear }: Props) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="settings-no-results"
      style={styles.wrap}
    >
      <Feather name="search" size={28} color={GAME_PALETTE.textMuted} />
      <Text style={styles.title}>{translate('settings.no_results_title')}</Text>
      <Text style={styles.body}>{translate('settings.no_results_body', { query })}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('settings.no_results_clear')}
        testID="settings-no-results-clear"
        onPress={onClear}
        style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
      >
        <Text style={styles.clearLabel}>{translate('settings.no_results_clear')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginBottom: 8,
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(12),
  },
  title: {
    color: GAME_PALETTE.text,
    fontSize: 18,
    textAlign: 'center',
    ...interFont('bold'),
  },
  body: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    ...interFont('regular'),
  },
  clear: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.accent,
    ...continuousRadius(10),
  },
  clearLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 15,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
