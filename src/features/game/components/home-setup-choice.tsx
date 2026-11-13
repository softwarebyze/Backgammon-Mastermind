import type { LayoutChangeEvent, TextStyle } from 'react-native';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { HOME_INK } from './home-ink';
import {
  measureSegmentWordWidth,
  SEGMENT_LABEL_MIN_SCALE,
  SEGMENT_LABEL_SIZE,
  segmentLabelFontSize,
} from './segment-label-font-size';

type Option<T> = { value: T; label: string; accessibilityLabel?: string; testID: string };

const OPTION_X_PADDING = 6;

/**
 * A segmented control on a wooden track. The chosen option is an ivory tile,
 * like a checker; the screen keeps its amber for the one Play button.
 */
export function HomeSetupChoice<T extends string | number>({ label, value, options, onChange }: {
  /** Names the group for screen readers; the options speak for themselves on screen. */
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(option => (
        <ChoiceOption
          key={option.value}
          option={option}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

function ChoiceOption<T extends string | number>({ option, selected, onPress }: {
  option: Option<T>;
  selected: boolean;
  onPress: () => void;
}) {
  const [innerWidth, setInnerWidth] = useState(0);
  const fontSize = segmentLabelFontSize({
    label: option.label,
    innerWidth,
    measure: measureSegmentWordWidth,
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    if (Platform.OS !== 'web') {
      return;
    }
    const next = event.nativeEvent.layout.width - OPTION_X_PADDING * 2;
    setInnerWidth(prev => (Math.abs(prev - next) < 0.5 ? prev : next));
  };

  return (
    <HoverPressable
      testID={option.testID}
      accessibilityRole="radio"
      accessibilityLabel={option.accessibilityLabel ?? option.label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      onLayout={handleLayout}
      style={({ pressed, hovered }) => [
        styles.option,
        hovered && !selected && styles.hovered,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.text,
          selected && styles.selectedText,
          fontSize !== SEGMENT_LABEL_SIZE && {
            fontSize,
            lineHeight: Math.round(fontSize * 18 / SEGMENT_LABEL_SIZE),
          },
          Platform.OS === 'web' ? styles.noMidWordBreak : null,
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={SEGMENT_LABEL_MIN_SCALE}
      >
        {option.label}
      </Text>
    </HoverPressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: HOME_INK.hairline,
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: OPTION_X_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  // Long labels ("Gegen Computer" at 320) wrap to a second line instead of losing their end.
  text: { color: HOME_INK.muted, fontSize: SEGMENT_LABEL_SIZE, lineHeight: 18, textAlign: 'center', ...interFont('semibold') },
  // Web only: RN Web defaults can break a word mid-letter when the segment is tight.
  noMidWordBreak: {
    wordBreak: 'normal',
    overflowWrap: 'normal',
  } as TextStyle,
  selected: {
    backgroundColor: HOME_INK.ivory,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  selectedText: { color: GAME_PALETTE.bg },
  hovered: { backgroundColor: 'rgba(236, 228, 212, 0.08)' },
  pressed: { opacity: 0.8 },
});
