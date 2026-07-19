import type { TxKeyPath } from '@/lib/i18n';

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { WinConfettiOverlay } from '@/features/game/components/win-confetti-overlay';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  stars: 1 | 2 | 3;
  xpEarned: number;
  messageKey: TxKeyPath;
  onNext: () => void;
};

function StarFill({ index, total }: { index: number; total: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const filled = index < total;
    const delay = 200 + index * 250;
    scale.value = withDelay(
      delay,
      withSpring(filled ? 1 : 0.6, { damping: 8, stiffness: 150 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(filled ? 1 : 0.25, { duration: 200 }),
    );
  }, [index, opacity, scale, total]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.star, style]}>
      <Text style={styles.starIcon}>{index < total ? '★' : '☆'}</Text>
    </Animated.View>
  );
}

export function CelebrationOverlay({ stars, xpEarned, messageKey, onNext }: Props) {
  const containerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 250 });
    contentTranslateY.value = withSpring(0, { damping: 12, stiffness: 120 });
    hapticSelection();
  }, [containerOpacity, contentTranslateY]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View style={styles.root}>
      <WinConfettiOverlay burstKey={1} />
      <Animated.View style={[styles.backdrop, containerStyle]} />
      <Animated.View style={[styles.card, contentStyle]}>
        <Text style={styles.praise}>{translate(messageKey)}</Text>

        <View style={styles.starsRow}>
          {[0, 1, 2].map(i => (
            <StarFill key={i} index={i} total={stars} />
          ))}
        </View>

        <Text style={styles.xp}>
          +
          {xpEarned}
          {' '}
          XP
        </Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
          onPress={onNext}
        >
          <Text style={styles.nextLabel}>{translate('learn.challenge.next')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  card: {
    width: '80%',
    maxWidth: 340,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accent,
    padding: 28,
    alignItems: 'center',
    gap: 18,
    ...continuousRadius(20),
  },
  praise: {
    color: '#A0D080',
    fontSize: 18,
    textAlign: 'center',
    ...interFont('bold'),
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 36,
    color: GAME_PALETTE.accent,
  },
  xp: {
    color: GAME_PALETTE.accent,
    fontSize: 22,
    ...interFont('extrabold'),
  },
  nextBtn: {
    width: '100%',
    backgroundColor: GAME_PALETTE.accent,
    paddingVertical: 16,
    alignItems: 'center',
    ...continuousRadius(14),
  },
  nextLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 17,
    ...interFont('bold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
