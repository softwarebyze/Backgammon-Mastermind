import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { useGameInput } from '@/features/game/use-game-input';
import type { GameState } from '@/lib/game';
import { useEffect, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { BoardView } from '@/features/game/components/board/board-view';
import { MovePathOverlay } from '@/features/game/components/board/move-path-overlay';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { BAR_POINT } from '@/lib/game/constants';
import { MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';

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
  const travelEmphasis = useMemo(() => {
    if (!boardAnimation) {
      return { points: undefined as ReadonlySet<number> | undefined, bar: false };
    }
    const points = new Set<number>();
    for (const idx of [boardAnimation.from, boardAnimation.to]) {
      if (idx >= 1 && idx <= 24) {
        points.add(idx);
      }
    }
    return {
      points: points.size > 0 ? points : undefined,
      bar: boardAnimation.from === BAR_POINT || boardAnimation.to === BAR_POINT,
    };
  }, [boardAnimation]);

  useEffect(() => {
    input.setBoardDimensions(dimensions);
  }, [dimensions, input]);

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
            dragFrom={interactionEnabled ? input.dragFrom : null}
            interactionEnabled={interactionEnabled}
            isReviewing={isReviewing}
            onPointPress={input.handlePointPress}
            onPointPressIn={input.handlePointPressIn}
            onPointPressOut={input.handlePointPressOut}
            onDragAttempt={input.handleDragAttempt}
            onDragStart={input.handleDragStart}
            onDragMove={input.handleDragMove}
            onDragEnd={input.handleDragEnd}
            onDragCancel={input.handleDragCancel}
            onBarPress={input.handleBarPress}
            onBearOffPress={input.handleBearOffPress}
            emphasisPoints={travelEmphasis.points}
            emphasisBar={travelEmphasis.bar}
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
    maxWidth: MAX_BOARD_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
  },
  boardContainer: {
    paddingHorizontal: 4,
    width: '100%',
    alignItems: 'center',
  },
});
