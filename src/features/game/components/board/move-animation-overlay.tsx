import type { SharedValue } from 'react-native-reanimated';
/**
 * Floating-proxy checker slide (Reanimated `withTiming` + completion callback).
 * State commits when the slide finishes — no end fade (that caused a visible flicker).
 * @see https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/customizing-animation
 * @see https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-callback
 */
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { CheckerSlide, MoveAnimationFrame } from '@/features/game/move-animation';
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
import {
  animationKey,
  CHECKER_MOVE_DURATION_MS,
  checkerRenderSize,
} from '@/features/game/move-animation';

type SlideLayerProps = {
  slide: CheckerSlide;
  progress: SharedValue<number>;
  dimensions: BoardDimensions;
  zIndex: number;
};

function CheckerSlideLayer({ slide, progress, dimensions, zIndex }: SlideLayerProps) {
  const fromSize = checkerRenderSize(dimensions.checkerSize, slide.from);
  const toSize = checkerRenderSize(dimensions.checkerSize, slide.to);

  const from = getCheckerAnchor({
    pointIndex: slide.from,
    dims: dimensions,
    stackCount: slide.sourceStackCount,
    player: slide.player,
  });
  const to = getCheckerAnchor({
    pointIndex: slide.to,
    dims: dimensions,
    stackCount: slide.destStackCount,
    player: slide.player,
  });

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const size = fromSize + (toSize - fromSize) * t;
    const cx = from.x + (to.x - from.x) * t;
    const cy = from.y + (to.y - from.y) * t;

    return {
      position: 'absolute' as const,
      left: cx - fromSize / 2,
      top: cy - fromSize / 2,
      width: fromSize,
      height: fromSize,
      transform: [{ scale: size / fromSize }],
      zIndex,
      elevation: zIndex,
    };
  });

  return (
    <Animated.View style={style} pointerEvents="none">
      <CheckerToken flat player={slide.player} size={fromSize} />
    </Animated.View>
  );
}

type Props = {
  animation: MoveAnimationFrame;
  dimensions: BoardDimensions;
};

export function MoveAnimationOverlay({ animation, dimensions }: Props) {
  const progress = useSharedValue(0);
  const onFinishRef = useRef(animation.onFinish);
  onFinishRef.current = animation.onFinish;

  const moverSlide: CheckerSlide = {
    from: animation.from,
    to: animation.to,
    player: animation.player,
    sourceStackCount: animation.sourceStackCount,
    destStackCount: animation.destStackCount,
  };

  const key = animationKey(animation);

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
  }, [key, progress]);

  return (
    <>
      <CheckerSlideLayer
        slide={moverSlide}
        progress={progress}
        dimensions={dimensions}
        zIndex={100}
      />
      {animation.capture && (
        <CheckerSlideLayer
          slide={animation.capture}
          progress={progress}
          dimensions={dimensions}
          zIndex={101}
        />
      )}
    </>
  );
}
