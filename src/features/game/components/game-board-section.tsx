import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { useGameInput } from '@/features/game/use-game-input';
import type { GameState } from '@/lib/game';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { BoardView } from '@/features/game/components/board/board-view';
import { MovePathOverlay } from '@/features/game/components/board/move-path-overlay';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';

type Input = ReturnType<typeof useGameInput>;

type Props = {
  boardState: GameState;
  boardAnimation: MoveAnimationFrame | null;
  boardOpacity: Animated.Value;
  interactionEnabled: boolean;
  isReviewing: boolean;
  previewTarget: number | null;
  pathSegments: PathSegment[];
  pathFadeOutMs?: number;
  input: Input;
};

/** Playing-surface origin inside BoardView (frame + optional number rail). */
function playingSurfaceOffset(boardFrameWidth: number, showPointNumbers: boolean) {
  const rail = showPointNumbers ? POINT_NUMBER_RAIL : 0;
  return {
    left: boardFrameWidth,
    top: boardFrameWidth + rail,
  };
}

export function GameBoardSection({
  boardState,
  boardAnimation,
  boardOpacity,
  interactionEnabled,
  isReviewing,
  previewTarget,
  pathSegments,
  pathFadeOutMs,
  input,
}: Props) {
  const dimensions = useBoardDimensions();
  const { preferences } = useGamePreferences();
  const showPath = pathSegments.length > 0;
  const surface = playingSurfaceOffset(dimensions.boardFrameWidth, preferences.showPointNumbers);

  return (
    <View style={styles.boardWrap}>
      <Pressable
        onPress={interactionEnabled ? input.handleBoardPress : undefined}
        style={[styles.boardContainer, { maxWidth: dimensions.boardOuterWidth }]}
      >
        <Animated.View
          style={{
            width: dimensions.boardOuterWidth,
            alignItems: 'center',
            opacity: boardOpacity,
          }}
        >
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
          {showPath
            ? (
                <View
                  style={{
                    position: 'absolute',
                    width: dimensions.boardWidth,
                    height: dimensions.boardHeight,
                    left: surface.left,
                    top: surface.top,
                  }}
                  pointerEvents="none"
                >
                  <MovePathOverlay
                    segments={pathSegments}
                    dimensions={dimensions}
                    animation={boardAnimation}
                    fadeOutMs={pathFadeOutMs}
                  />
                </View>
              )
            : null}
        </Animated.View>
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
