import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { LEARN_INK } from '@/features/learn/learn-ink';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  /** The lesson to take next, or what is left once every lesson is done. */
  title: string;
  /** "3 of 10 lessons done", beside the bar. */
  progressLabel: string;
  /** 0 to 1. */
  progress: number;
  actionLabel: string;
  onPress: () => void;
};

/**
 * The top of the course: where you are and the one thing to do next. Its
 * button is the only amber block on the screen. No eyebrow or second line:
 * the title and the button say it.
 */
export function LearnNextCard({ title, progressLabel, progress, actionLabel, onPress }: Props) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <View testID="learn-next-card" style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <View
        style={styles.progress}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={progressLabel}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View style={styles.track}>
          <View testID="learn-progress-fill" style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{progressLabel}</Text>
      </View>
      <HoverPressable
        testID="learn-next-action"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed, hovered }) => [styles.action, hovered && styles.actionHover, pressed && styles.pressed]}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
        <Feather name="play" size={18} color={GAME_PALETTE.controlInk} accessible={false} />
      </HoverPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: LEARN_INK.hairline,
    ...continuousRadius(22),
  },
  title: {
    color: LEARN_INK.ivory,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    ...interFont('bold'),
  },
  progress: {
    gap: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(236, 228, 212, 0.12)',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: LEARN_INK.brass,
  },
  progressLabel: {
    color: LEARN_INK.muted,
    fontSize: 13,
    lineHeight: 18,
    ...interFont('medium'),
  },
  action: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.control,
    ...continuousRadius(14),
  },
  actionHover: {
    backgroundColor: GAME_PALETTE.controlHover,
  },
  actionLabel: {
    color: GAME_PALETTE.controlInk,
    fontSize: 17,
    textAlign: 'center',
    ...interFont('bold'),
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
