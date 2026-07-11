import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import type { Player } from '@/lib/game/types';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { CheckerToken } from './checker-token';

type Props = {
  player: Player;
  checkerSize: number;
  overlay: Pick<DragOverlayRefs, 'x' | 'y'>;
};

/** Floating checker under the finger — position driven by Reanimated shared values. */
export function DragCheckerOverlay({ player, checkerSize, overlay }: Props) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: checkerSize,
    height: checkerSize,
    zIndex: 100,
    elevation: 100,
    transform: [
      { translateX: overlay.x.value - checkerSize / 2 },
      { translateY: overlay.y.value - checkerSize / 2 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={style}>
      <CheckerToken flat player={player} size={checkerSize} />
    </Animated.View>
  );
}
