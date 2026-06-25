/**
 * Floating-proxy checker slide (Reanimated `withTiming` + completion callback).
 * State commits when the slide finishes — no end fade (that caused a visible flicker).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/customizing-animation
 * @see https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-callback
 */
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import { useLayoutEffect, useRef } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { CHECKER_MOVE_DURATION_MS, overlayTokenSize } from '@/features/game/move-animation';

type Props = {
  animation: MoveAnimationFrame;
  dimensions: BoardDimensions;
};

export function MoveAnimationOverlay({ animation, dimensions }: Props) {
  const progress = useSharedValue(0);
  const onFinishRef = useRef(animation.onFinish);
  onFinishRef.current = animation.onFinish;

  const tokenSize = overlayTokenSize(dimensions, animation.from);
  const half = tokenSize / 2;

  const from = getCheckerAnchor({
    pointIndex: animation.from,
    dims: dimensions,
    stackCount: animation.sourceStackCount,
    player: animation.player,
  });
  const to = getCheckerAnchor({
    pointIndex: animation.to,
    dims: dimensions,
    stackCount: animation.destStackCount,
    player: animation.player,
  });

  const animationKey = `${animation.from}-${animation.to}-${animation.player}`;

  useLayoutEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: CHECKER_MOVE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onFinishRef.current)();
        }
      },
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [animationKey, progress]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: from.x - half + (to.x - from.x) * progress.value,
    top: from.y - half + (to.y - from.y) * progress.value,
    zIndex: 100,
    elevation: 100,
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <CheckerToken flat player={animation.player} size={tokenSize} />
    </Animated.View>
  );
}
