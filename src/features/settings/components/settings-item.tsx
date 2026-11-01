import type { TxKeyPath } from '@/lib/i18n';

import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/scaled-text';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import {
  SETTINGS_ROW_MIN_HEIGHT,
  SETTINGS_ROW_PADDING_H,
  SETTINGS_ROW_PADDING_V,
} from '@/lib/ui/settings-layout';

import { SettingsChevron } from './settings-chevron';

type ItemProps = {
  text: TxKeyPath;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
};

export function SettingsItem({ text, value, icon, onPress }: ItemProps) {
  const isPressable = onPress !== undefined;
  return (
    <Pressable
      onPress={isPressable
        ? () => {
            hapticLight();
            onPress?.();
          }
        : undefined}
      disabled={!isPressable}
      style={styles.row}
    >
      <View style={styles.left}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={styles.label}>{translate(text)}</Text>
      </View>
      <View style={styles.right}>
        {value !== undefined && <Text style={styles.value}>{value}</Text>}
        {isPressable && <SettingsChevron />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // Large text: the value drops below the label instead of overlapping it.
    flexWrap: 'wrap',
    rowGap: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: SETTINGS_ROW_MIN_HEIGHT,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: SETTINGS_ROW_PADDING_V,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
  },
  icon: {
    marginRight: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    marginStart: 'auto',
    paddingStart: 12,
  },
  label: {
    flexShrink: 1,
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('regular'),
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
    color: GAME_PALETTE.textMuted,
    fontSize: 15,
    ...interFont('regular'),
  },
});
