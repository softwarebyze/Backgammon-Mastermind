import type { StyleProp, TextStyle } from 'react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
const ROLL_MS = 420;

type Props = {
  value: number;
  /** Must set fontSize; lineHeight defaults to 1.2× fontSize. Use tabular-nums so columns line up. */
  style: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

function DigitColumn({
  digit,
  lineHeight,
  textStyle,
  reducedMotion,
}: {
  digit: number;
  lineHeight: number;
  textStyle: StyleProp<TextStyle>;
  reducedMotion: boolean;
}) {
  const offset = useSharedValue(-digit * lineHeight);
  useEffect(() => {
    const target = -digit * lineHeight;
    offset.value = reducedMotion
      ? target
      : withTiming(target, { duration: ROLL_MS, easing: Easing.out(Easing.cubic) });
  }, [digit, lineHeight, offset, reducedMotion]);
  const columnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.View style={columnStyle}>
        {DIGITS.map(d => (
          <Text key={d} style={[textStyle, { lineHeight, height: lineHeight }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * A number whose digits roll to the new value (NumberFlow-style) instead of
 * snapping. Digits are keyed from the right, so 100 → 99 rolls the ones and
 * tens while the hundreds column leaves. Honors reduced motion.
 */
export function AnimatedNumber({ value, style, accessibilityLabel, testID }: Props) {
  const reducedMotion = useReducedMotion();
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? 14;
  const lineHeight = Math.round(flat.lineHeight ?? fontSize * 1.2);
  const text = String(Math.max(0, Math.round(value)));
  const digits = [...text].map(Number);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      testID={testID}
      style={styles.row}
    >
      <View style={styles.digits} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {digits.map((digit, i) => (
          <DigitColumn
            // eslint-disable-next-line react/no-array-index-key -- place value is the identity
            key={digits.length - i}
            digit={digit}
            lineHeight={lineHeight}
            textStyle={style}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  // Numbers read left to right in every language: in RTL a plain row would show 167 as "761".
  digits: {
    flexDirection: 'row',
    direction: 'ltr',
  },
});
