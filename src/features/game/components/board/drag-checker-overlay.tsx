import type { Player } from '@/lib/game/types';
import { View } from 'react-native';

import { CheckerToken } from './checker-token';

type Props = {
  player: Player;
  boardX: number;
  boardY: number;
  checkerSize: number;
};

/** Floating checker under the finger during drag-and-drop. */
export function DragCheckerOverlay({ player, boardX, boardY, checkerSize }: Props) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: boardX - checkerSize / 2,
        top: boardY - checkerSize / 2,
        width: checkerSize,
        height: checkerSize,
        zIndex: 100,
        elevation: 100,
      }}
    >
      <CheckerToken flat player={player} size={checkerSize} />
    </View>
  );
}
