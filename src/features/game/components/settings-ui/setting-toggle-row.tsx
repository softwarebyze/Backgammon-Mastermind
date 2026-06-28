import * as React from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

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

function iconForToggle(icon: React.ReactNode, active: boolean): React.ReactNode {
  if (!React.isValidElement(icon)) {
    return icon;
  }
  return React.cloneElement(icon as React.ReactElement<{ active?: boolean }>, { active });
}

const TRACK_OFF = '#4A3020';
const TRACK_ON = '#6B4A28';
const THUMB_OFF = '#C8B8A0';

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
      <View style={styles.iconWrap}>{iconForToggle(icon, value)}</View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={handleChange}
        trackColor={{ false: TRACK_OFF, true: TRACK_ON }}
        thumbColor={value ? GAME_PALETTE.accent : THUMB_OFF}
        ios_backgroundColor={TRACK_OFF}
        {...Platform.select({
          web: {
            activeThumbColor: GAME_PALETTE.accent,
            activeTrackColor: TRACK_ON,
          },
        })}
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
