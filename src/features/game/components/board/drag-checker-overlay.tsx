import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import type { Player } from '@/lib/game/types';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { dragOverlayFingerLift } from '@/features/game/drag-overlay-offset';
import { CheckerToken } from './checker-token';

type Props = {
  player: Player;
  checkerSize: number;
  overlay: Pick<DragOverlayRefs, 'x' | 'y'>;
};

/** Floating checker above the finger — position driven by Reanimated shared values. */
export function DragCheckerOverlay({ player, checkerSize, overlay }: Props) {
  const overlayX = overlay.x;
  const overlayY = overlay.y;
  const fingerLift = dragOverlayFingerLift(checkerSize);
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: checkerSize,
    height: checkerSize,
    zIndex: 100,
    elevation: 100,
    transform: [
      { translateX: overlayX.value - checkerSize / 2 },
      // Visual only — drop targeting uses raw finger coords, not this lift.
      { translateY: overlayY.value - checkerSize / 2 - fingerLift },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={style}>
      <CheckerToken flat player={player} size={checkerSize} />
    </Animated.View>
  );
}
