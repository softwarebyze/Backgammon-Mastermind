import * as React from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import {
  SETTINGS_ICON_SLOT,
  SETTINGS_ROW_MIN_HEIGHT,
  SETTINGS_ROW_PADDING_H,
  SETTINGS_ROW_PADDING_V,
} from '@/lib/ui/settings-layout';

type Props = {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
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

export function SettingToggleRow({ icon, label, hint, value, onChange, testID }: Props) {
  const handleChange = React.useCallback(
    (next: boolean) => {
      hapticSelection();
      onChange(next);
    },
    [onChange],
  );
  const onPressRow = React.useCallback(() => {
    handleChange(!value);
  }, [handleChange, value]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID ?? 'setting-toggle-row'}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPressRow}
    >
      <View pointerEvents="none" style={styles.iconWrap}>{iconForToggle(icon, value)}</View>
      <View pointerEvents="none" style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.switchWrap}
      >
        <Switch
          pointerEvents="none"
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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    minHeight: SETTINGS_ROW_MIN_HEIGHT,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: SETTINGS_ROW_PADDING_V,
    gap: 12,
  },
  pressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: SETTINGS_ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  switchWrap: {
    justifyContent: 'center',
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
