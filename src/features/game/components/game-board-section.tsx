import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { useGameInput } from '@/features/game/use-game-input';
import type { GameState, Player } from '@/lib/game';
import { useEffect, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { boardLayoutStyle, boardWebDir } from '@/features/game/components/board/board-layout-direction';
import { BoardView } from '@/features/game/components/board/board-view';
import { MovePathOverlay } from '@/features/game/components/board/move-path-overlay';
import { playingSurfaceOffset } from '@/features/game/components/board/playing-surface-offset';
import { useHintArrows } from '@/features/game/hint-arrows-store';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { BAR_POINT } from '@/lib/game/constants';
import { useLayoutMetrics } from '@/lib/ui/layout-metrics';

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
  /** Whose point of view the point-number rails are labeled from. */
  numberPerspective: Player;
};

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
  numberPerspective,
}: Props) {
  const dimensions = useBoardDimensions();
  const { boardMaxWidth } = useLayoutMetrics();
  const { preferences } = useGamePreferences();
  const hintArrows = useHintArrows();
  // Guidance owns the live board while it is visible. Mixing its arrows with
  // the previous move's path makes the suggestion ambiguous, and the old
  // path's fade timer would also hide the guidance arrows.
  const overlaySegments = isReviewing ? pathSegments : hintArrows.length > 0 ? hintArrows : pathSegments;
  const overlayFadeOutMs = !isReviewing && hintArrows.length > 0 ? undefined : pathFadeOutMs;
  const showPath = overlaySegments.length > 0;
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
    <View style={[styles.boardWrap, { maxWidth: boardMaxWidth }]}>
      <Pressable
        onPress={interactionEnabled ? input.handleBoardPress : undefined}
        style={[styles.boardContainer, { maxWidth: dimensions.boardOuterWidth }]}
      >
        <Animated.View
          {...boardWebDir}
          style={[
            {
              width: dimensions.boardOuterWidth,
              alignItems: 'center',
              opacity: boardOpacity,
            },
            boardLayoutStyle,
          ]}
        >
          <BoardView
            state={boardState}
            dimensions={dimensions}
            previewTarget={interactionEnabled ? previewTarget : null}
            moveAnimation={boardAnimation}
            dragFrom={interactionEnabled ? input.dragFrom : null}
            interactionEnabled={interactionEnabled}
            isReviewing={isReviewing}
            aidsOverride={hintArrows.length > 0 && !isReviewing ? { showDirectionOverlay: false } : undefined}
            numberPerspective={numberPerspective}
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
                    segments={overlaySegments}
                    dimensions={dimensions}
                    animation={boardAnimation}
                    fadeOutMs={overlayFadeOutMs}
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
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  boardContainer: {
    paddingHorizontal: 4,
    width: '100%',
    alignItems: 'center',
  },
});
