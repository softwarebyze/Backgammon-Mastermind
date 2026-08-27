import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

const TRACK_OFF = '#4A3020';
const TRACK_ON = GAME_PALETTE.accentDim;
const THUMB = '#F5F0E8';

/** Visual-only switch. The row Pressable owns the tap so web cannot double-fire. */
function DisplaySwitch({ on, testID }: { on: boolean; testID: string }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={[styles.track, on ? styles.trackOn : styles.trackOff]}
    >
      <View style={styles.thumb} />
    </View>
  );
}

export function SettingToggleRow({ icon, label, hint, value, onChange, testID }: Props) {
  const rowTestId = testID ?? 'setting-toggle-row';
  const onPressRow = React.useCallback(() => {
    hapticSelection();
    onChange(!value);
  }, [onChange, value]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={rowTestId}
      style={styles.row}
      onPress={onPressRow}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.switchWrap}>
        <DisplaySwitch on={value} testID={`${rowTestId}-track`} />
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
  iconWrap: {
    width: SETTINGS_ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  text: {
    flex: 1,
    pointerEvents: 'none',
  },
  switchWrap: {
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  track: {
    width: 51,
    height: 31,
    borderRadius: 16,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  trackOn: {
    backgroundColor: TRACK_ON,
    justifyContent: 'flex-end',
  },
  trackOff: {
    backgroundColor: TRACK_OFF,
    justifyContent: 'flex-start',
  },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: THUMB,
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
