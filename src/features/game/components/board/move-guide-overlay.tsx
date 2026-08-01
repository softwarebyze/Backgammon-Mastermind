import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Polygon } from 'react-native-svg';

import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { buildArrowhead, unitVector } from '@/lib/ui/arrow-geometry';

const GUIDE_COLOR = 'rgba(212, 168, 67, 0.85)';

type Props = {
  from: number;
  to: number;
  player: Player;
  dimensions: BoardDimensions;
};

/** Teaching demo for learn challenges: pulsing source, dashed path, and a sliding ghost checker. */
export function MoveGuideOverlay({ from, to, player, dimensions }: Props) {
  const size = dimensions.checkerSize;
  const fromAnchor = getCheckerAnchor({
    pointIndex: from,
    dims: dimensions,
    stackCount: 1,
    player,
  });
  const toAnchor = getCheckerAnchor({
    pointIndex: to,
    dims: dimensions,
    stackCount: 1,
    player,
  });

  const direction = unitVector(fromAnchor, toAnchor);
  const { lineEnd, polygonPoints } = buildArrowhead(toAnchor, direction, {
    length: 12,
    halfWidth: 6,
  });

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [progress]);

  const ghostStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const cx = fromAnchor.x + (toAnchor.x - fromAnchor.x) * t;
    const cy = fromAnchor.y + (toAnchor.y - fromAnchor.y) * t;
    return {
      position: 'absolute' as const,
      left: cx - size / 2,
      top: cy - size / 2,
      width: size,
      height: size,
      opacity: 0.5,
      zIndex: 60,
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      position: 'absolute' as const,
      left: fromAnchor.x - size / 2,
      top: fromAnchor.y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 2.5,
      borderColor: GUIDE_COLOR,
      opacity: 1 - 0.7 * t,
      transform: [{ scale: 1 + 0.8 * t }],
      zIndex: 59,
    };
  });

  return (
    <>
      <Svg
        width={dimensions.boardWidth}
        height={dimensions.boardHeight}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 58, pointerEvents: 'none' }}
      >
        <Path
          d={`M ${fromAnchor.x} ${fromAnchor.y} L ${lineEnd.x} ${lineEnd.y}`}
          stroke="rgba(212, 168, 67, 0.5)"
          strokeWidth={2.5}
          strokeDasharray="6 7"
          strokeLinecap="round"
          fill="none"
        />
        <Polygon points={polygonPoints} fill="rgba(212, 168, 67, 0.8)" />
      </Svg>
      <Animated.View style={ringStyle} pointerEvents="none" />
      <Animated.View style={ghostStyle} pointerEvents="none">
        <CheckerToken flat player={player} size={size} />
      </Animated.View>
    </>
  );
}
