import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveAnimationFrame } from '@/features/game/use-animated-moves';
import { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { CheckerToken } from '@/features/game/components/board/checker-token';

const DURATION_MS = 380;

type Props = {
  animation: MoveAnimationFrame;
  dimensions: BoardDimensions;
};

export function MoveAnimationOverlay({ animation, dimensions }: Props) {
  const progress = useSharedValue(0);
  const onFinishRef = useRef(animation.onFinish);
  onFinishRef.current = animation.onFinish;

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
  const half = dimensions.checkerSize / 2;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onFinishRef.current)();
        }
      },
    );
  }, [animation.from, animation.to, animation.player, progress]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: from.x - half + (to.x - from.x) * progress.value,
    top: from.y - half + (to.y - from.y) * progress.value,
    zIndex: 100,
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <CheckerToken player={animation.player} size={dimensions.checkerSize} />
    </Animated.View>
  );
}
