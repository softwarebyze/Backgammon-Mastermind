import type { StyleProp, ViewStyle } from 'react-native';
import type { TimerState } from '../timer-clock';
import type { TimerPreferences } from '../timer-preferences';

import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';

import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
import {
  TIMER_DELAY_PRESETS,
  TIMER_TIME_PRESETS,
} from '../timer-preferences';

type Props = {
  state: TimerState;
  preferences: TimerPreferences;
  onSelectMinutes: (minutes: number) => void;
  onSelectDelay: (seconds: number) => void;
  onToggleSound: () => void;
  onToggleFacing: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Render a selectable time preset that becomes unavailable after a clock starts. */
function Chip({ label, selected, disabled, testID, onPress }: {
  label: string;
  selected: boolean;
  disabled: boolean;
  testID: string;
  onPress: () => void;
}) {
  return (
    <HoverPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.chip,
        selected && styles.chipSelected,
        (hovered || pressed) && !selected && styles.chipHover,
        disabled && styles.chipDisabled,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </HoverPressable>
  );
}

/** Expose sound and facing preferences as accessible switches with a visible checked state. */
function Toggle({ icon, label, testID, onPress, checked }: {
  checked: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <HoverPressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.toggle,
        checked && { borderColor: GAME_PALETTE.control },
        (hovered || pressed) && styles.chipHover,
        pressed && styles.chipPressed,
      ]}
    >
      <Feather name={icon} size={14} color={GAME_PALETTE.text} accessible={false} />
      <Text style={styles.toggleText}>{label}</Text>
    </HoverPressable>
  );
}

/** Present main-time and simple-delay presets; lock time controls until the live clock is reset. */
export function TimerControls({
  state,
  preferences,
  onSelectMinutes,
  onSelectDelay,
  onToggleSound,
  onToggleFacing,
  style,
}: Props) {
  const locked = state.status !== 'idle';

  return (
    <View style={[styles.panel, style]}>
      <View style={styles.group}>
        <View style={styles.groupLabel}>
          <Feather name="clock" size={12} color={GAME_PALETTE.textMuted} accessible={false} />
          <Text style={styles.groupText}>{translate('timer.time_label')}</Text>
        </View>
        <View style={styles.chips}>
          {TIMER_TIME_PRESETS.map((ms) => {
            const minutes = Math.round(ms / 60_000);
            return (
              <Chip
                key={ms}
                label={translate('timer.minutes', { count: minutes })}
                selected={preferences.initialMs === ms}
                disabled={locked}
                testID={`timer-time-${minutes}`}
                onPress={() => onSelectMinutes(minutes)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.groupLabel}>
          <Feather name="zap" size={12} color={GAME_PALETTE.textMuted} accessible={false} />
          <Text style={styles.groupText}>{translate('timer.delay')}</Text>
        </View>
        <View style={styles.chips}>
          {TIMER_DELAY_PRESETS.map((ms) => {
            const seconds = Math.round(ms / 1000);
            return (
              <Chip
                key={ms}
                label={seconds === 0
                  ? translate('timer.delay_off')
                  : translate('timer.seconds', { count: seconds })}
                selected={preferences.delayMs === ms}
                disabled={locked}
                testID={`timer-delay-${seconds}`}
                onPress={() => onSelectDelay(seconds)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.toggles}>
        <Toggle
          icon={preferences.soundEnabled ? 'volume-2' : 'volume-x'}
          label={translate(preferences.soundEnabled ? 'timer.sound_on' : 'timer.sound_off')}
          testID="timer-sound"
          checked={preferences.soundEnabled}
          onPress={onToggleSound}
        />
        <Toggle
          icon="smartphone"
          label={translate('timer.facing_label')}
          testID="timer-facing"
          checked={preferences.facePlayers}
          onPress={onToggleFacing}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.surface,
    ...continuousRadius(20),
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    ...interFont('semibold'),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 153, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
  },
  chipSelected: {
    borderColor: GAME_PALETTE.control,
    backgroundColor: GAME_PALETTE.control,
  },
  chipHover: {
    borderColor: 'rgba(255, 137, 51, 0.55)',
    backgroundColor: 'rgba(255, 137, 51, 0.12)',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    color: GAME_PALETTE.text,
    fontSize: 13,
    ...interFont('medium'),
  },
  chipTextSelected: {
    color: GAME_PALETTE.controlInk,
    ...interFont('semibold'),
  },
  toggles: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 196, 153, 0.12)',
  },
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 153, 0.18)',
    borderRadius: 10,
  },
  toggleText: {
    color: GAME_PALETTE.text,
    fontSize: 12.5,
    ...interFont('medium'),
  },
});
