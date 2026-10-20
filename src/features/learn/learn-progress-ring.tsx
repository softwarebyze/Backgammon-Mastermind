import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  done: number;
  total: number;
  size?: number;
};

/** Circular lesson-progress badge: filled arc + "done/total" in the middle. */
export function LearnProgressRing({ done, total, size = 68 }: Props) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const shown = total > 0 ? Math.min(total, Math.max(0, done)) : 0;
  const center = size / 2;

  return (
    <View
      testID="learn-progress-ring"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={translate('learn.home_cta_progress', { done: shown, total })}
      accessibilityValue={{ min: 0, max: total, now: shown }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={GAME_PALETTE.surfaceBorder}
          strokeWidth={stroke}
          fill="none"
        />
        {ratio > 0
          ? (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={GAME_PALETTE.accent}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - ratio)}
                fill="none"
                transform={`rotate(-90 ${center} ${center})`}
              />
            )
          : null}
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={styles.count}>{shown}</Text>
        <Text style={styles.of}>
          /
          {total}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  count: {
    color: GAME_PALETTE.text,
    fontSize: 20,
    ...interFont('bold'),
  },
  of: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    marginTop: 6,
    ...interFont('medium'),
  },
});
