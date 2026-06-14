import * as React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import {
  SETTINGS_ICON_SLOT,
  SETTINGS_ROW_MIN_HEIGHT,
  SETTINGS_ROW_PADDING_V,
} from '@/lib/ui/settings-layout';

type Props = {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

export function SettingToggleRow({ icon, label, hint, value, onChange }: Props) {
  const handleChange = React.useCallback(
    (next: boolean) => {
      hapticSelection();
      onChange(next);
    },
    [onChange],
  );

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={handleChange}
        trackColor={{ false: '#4A3020', true: '#6B4A28' }}
        thumbColor={value ? GAME_PALETTE.accent : '#C8B8A0'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: SETTINGS_ROW_MIN_HEIGHT,
    paddingVertical: SETTINGS_ROW_PADDING_V,
    gap: 12,
  },
  iconWrap: {
    width: SETTINGS_ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  label: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('semibold'),
  },
  hint: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    marginTop: 2,
    ...interFont('regular'),
  },
});
