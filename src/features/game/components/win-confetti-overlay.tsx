import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { GAME_PALETTE } from '@/features/game/game-palette';

const PARTICLE_COUNT = 28;
const DURATION_MS = 2200;

const COLORS = [
  GAME_PALETTE.accent,
  '#E8C547',
  '#F5F0E8',
  '#C4A35A',
  '#FFE8A3',
] as const;

type Particle = {
  id: number;
  startX: number;
  delay: number;
  drift: number;
  fall: number;
  size: number;
  color: string;
  rotate: number;
};

function makeParticles(seed: number, width: number, height: number): Particle[] {
  // Deterministic scatter from burst key — avoids Math.random in render.
  let n = seed * 1103515245 + 12345;
  const next = () => {
    n = (n * 1103515245 + 12345) & 0x7FFFFFFF;
    return n / 0x7FFFFFFF;
  };
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
    id,
    startX: width * (0.08 + next() * 0.84),
    delay: Math.floor(next() * 180),
    drift: (next() - 0.5) * width * 0.12,
    fall: height * (0.55 + next() * 0.35),
    size: 5 + next() * 5,
    color: COLORS[Math.floor(next() * COLORS.length)]!,
    rotate: (next() - 0.5) * 140,
  }));
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      particle.delay,
      withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [particle.delay, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const opacity = t < 0.12 ? t / 0.12 : t > 0.78 ? (1 - t) / 0.22 : 1;
    return {
      opacity,
      transform: [
        { translateX: particle.startX + particle.drift * t },
        { translateY: -12 + particle.fall * t },
        { rotate: `${particle.rotate * t}deg` },
        { scale: 1 - t * 0.2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          width: particle.size,
          height: particle.size * 0.55,
          borderRadius: 1,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

type Props = {
  /** Increment to fire a new burst; 0 = idle. */
  burstKey: number;
};

/**
 * Single-play confetti burst — Reanimated only, no confetti package.
 * Mount above the board; pointerEvents none so play continues.
 */
export function WinConfettiOverlay({ burstKey }: Props) {
  const { width, height } = useWindowDimensions();
  const particles = useMemo(
    () => (burstKey > 0 ? makeParticles(burstKey, width, height) : []),
    [burstKey, width, height],
  );

  if (burstKey === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.root} key={burstKey}>
      {particles.map(p => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 45,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
