import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState } from '@/lib/game/types';
import { StyleSheet, View } from 'react-native';

import { getMoveHintDotAnchor } from '@/features/game/board-point-layout';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { countAtPoint } from '@/features/game/move-animation';

type Props = {
  state: GameState;
  sources: Set<number>;
  dimensions: BoardDimensions;
};

const DOT = 8;

/** Accent dots just outside the board edge — not on top of checkers. */
export function MoveHintOverlay({ state, sources, dimensions }: Props) {
  if (sources.size === 0) {
    return null;
  }

  const player = state.currentPlayer;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...sources].map((pointIndex) => {
        const stackCount = countAtPoint(state, pointIndex, player);
        const anchor = getMoveHintDotAnchor({
          pointIndex,
          dims: dimensions,
          stackCount,
          player,
        });
        return (
          <View
            key={pointIndex}
            style={{
              position: 'absolute',
              left: anchor.x - DOT / 2,
              top: anchor.y - DOT / 2,
              width: DOT,
              height: DOT,
              borderRadius: DOT / 2,
              backgroundColor: GAME_PALETTE.accent,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.3)',
              zIndex: 50,
            }}
          />
        );
      })}
    </View>
  );
}
