import * as React from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

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
  const el = icon as React.ReactElement<{ active?: boolean }>;
  return React.createElement(el.type, { ...el.props, active });
}

const TRACK_OFF = '#4A3020';
const TRACK_ON = GAME_PALETTE.accentDim;
const ANDROID_THUMB_ON = '#F5F0E8';
const ANDROID_THUMB_OFF = '#C8B8A8';

export function SettingToggleRow({ icon, label, hint, value, onChange }: Props) {
  const handleChange = React.useCallback(
    (next: boolean) => {
      hapticSelection();
      onChange(next);
    },
    [onChange],
  );
  const switchRef = React.useRef<Switch>(null);
  const onPressRow = React.useCallback(() => {
    handleChange(!value);
  }, [handleChange, value]);

  return (
    <Pressable style={styles.row} onPress={onPressRow}>
      <View style={styles.iconWrap}>{iconForToggle(icon, value)}</View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        ref={switchRef}
        value={value}
        onValueChange={handleChange}
        trackColor={{ false: TRACK_OFF, true: TRACK_ON }}
        thumbColor={Platform.OS === 'android'
          ? (value ? ANDROID_THUMB_ON : ANDROID_THUMB_OFF)
          : undefined}
        ios_backgroundColor={TRACK_OFF}
        {...Platform.select({
          web: {
            activeThumbColor: ANDROID_THUMB_ON,
            activeTrackColor: TRACK_ON,
          },
        })}
      />
    </Pressable>
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
