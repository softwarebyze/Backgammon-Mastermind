import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import type { TxKeyPath } from '@/lib/i18n';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { continuousRadius } from '@/lib/ui/native-styles';
import { DieFacePreview } from './die-face-preview';

type Props = {
  value: DiceDisplayStyle;
  onChange: (style: DiceDisplayStyle) => void;
};

const OPTIONS: Array<{ id: DiceDisplayStyle; labelKey: TxKeyPath }> = [
  { id: 'dots', labelKey: 'game.preferences.dice_dots' },
  { id: 'numbers', labelKey: 'game.preferences.dice_numbers' },
];

export function DiceStylePicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{translate('game.preferences.dice_display')}</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const label = translate(opt.labelKey);
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === opt.id }}
              accessibilityLabel={label}
              onPress={() => {
                hapticSelection();
                onChange(opt.id);
              }}
              style={[styles.card, value === opt.id && styles.cardSelected]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.radio, value === opt.id && styles.radioSelected]}>
                  {value === opt.id && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.cardLabel, value === opt.id && styles.cardLabelSelected]}>
                  {label}
                </Text>
              </View>
              <View style={styles.dicePreview}>
                <DieFacePreview style={opt.id} pair={[5, 5]} size={34} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  sectionLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    alignItems: 'stretch',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    ...continuousRadius(12),
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.bg,
  },
  cardSelected: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: 'rgba(212, 168, 67, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: GAME_PALETTE.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: GAME_PALETTE.accent,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GAME_PALETTE.accent,
  },
  cardLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  cardLabelSelected: {
    color: GAME_PALETTE.text,
  },
  dicePreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
