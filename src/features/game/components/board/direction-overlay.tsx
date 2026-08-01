import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Polygon } from 'react-native-svg';

import { buildHorseshoePath } from '@/lib/game/horseshoe-path';
import { horseshoeArrowhead } from '@/lib/ui/arrow-geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STROKE = 'rgba(212, 168, 67, 0.6)';
const STROKE_WIDTH = 3;
const DASH = '12 10';
const PERIOD = 22;
const FLOW_DURATION_MS = 1400;

type Props = {
  width: number;
  height: number;
  player?: 'white' | 'black';
};

/** Teaching overlay showing the bear-off horseshoe path as a flowing dashed trail. */
export function DirectionOverlay({ width, height, player = 'white' }: Props) {
  const d = buildHorseshoePath(width, height, player);
  const { polygonPoints } = horseshoeArrowhead(width, height, {
    player,
    style: { length: 10, halfWidth: 5 },
  });
  const dashOffset = useSharedValue(0);

  useEffect(() => {
    dashOffset.value = withRepeat(
      withTiming(-PERIOD, { duration: FLOW_DURATION_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [dashOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, pointerEvents: 'none' }}
    >
      <AnimatedPath
        animatedProps={animatedProps}
        d={d}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={DASH}
      />
      <Polygon points={polygonPoints} fill={STROKE} />
    </Svg>
  );
};
