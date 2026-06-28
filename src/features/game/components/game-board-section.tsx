import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { useGameInput } from '@/features/game/use-game-input';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';

import { Pressable, StyleSheet, View } from 'react-native';
import { BoardView } from '@/features/game/components/board/board-view';
import { MovePathOverlay } from '@/features/game/components/board/move-path-overlay';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';

type Input = ReturnType<typeof useGameInput>;

type Props = {
  boardState: GameState;
  boardAnimation: MoveAnimationFrame | null;
  interactionEnabled: boolean;
  isReviewing: boolean;
  previewTarget: number | null;
  reviewEntry: MoveLogEntry | null;
  reviewBeforeState: GameState | null;
  input: Input;
};

export function GameBoardSection({
  boardState,
  boardAnimation,
  interactionEnabled,
  isReviewing,
  previewTarget,
  reviewEntry,
  reviewBeforeState,
  input,
}: Props) {
  const dimensions = useBoardDimensions();

  return (
    <View style={styles.boardWrap}>
      <Pressable
        onPress={interactionEnabled ? input.handleBoardPress : undefined}
        style={[styles.boardContainer, { maxWidth: dimensions.boardOuterWidth }]}
      >
        <View style={{ width: dimensions.boardOuterWidth, alignItems: 'center' }}>
          <BoardView
            state={boardState}
            dimensions={dimensions}
            previewTarget={interactionEnabled ? previewTarget : null}
            moveAnimation={boardAnimation}
            interactionEnabled={interactionEnabled}
            isReviewing={isReviewing}
            onPointPress={input.handlePointPress}
            onPointPressIn={input.handlePointPressIn}
            onPointPressOut={input.handlePointPressOut}
            onBarPress={input.handleBarPress}
            onBearOffPress={input.handleBearOffPress}
          />
          {reviewEntry && reviewBeforeState && isReviewing
            ? (
                <View
                  style={{
                    position: 'absolute',
                    width: dimensions.boardWidth,
                    height: dimensions.boardHeight,
                    left: dimensions.boardFrameWidth,
                    top: dimensions.boardFrameWidth,
                  }}
                  pointerEvents="none"
                >
                  <MovePathOverlay
                    entry={reviewEntry}
                    beforeState={reviewBeforeState}
                    dimensions={dimensions}
                  />
                </View>
              )
            : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  boardWrap: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  boardContainer: {
    paddingHorizontal: 4,
    width: '100%',
    alignItems: 'center',
  },
});
