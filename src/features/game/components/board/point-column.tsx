import type { BoardPoint, Player } from '@/lib/game/types';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle } from 'react-native-reanimated';

import { getPointPalette } from './board-theme';
import { CheckerToken } from './checker-token';
import { PointTriangle } from './point-triangle';

const MAX_VISIBLE = 5;

type DragHandlers = {
  onDragAttempt?: (pointIndex: number) => void;
  onDragStart?: (pointIndex: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
};

/** Pan from any checker in the stack — moves the top (legal) checker. */
function useStackPan(pointIndex: number, enabled: boolean, handlers: DragHandlers) {
  const { onDragAttempt, onDragStart, onDragMove, onDragEnd, onDragCancel } = handlers;
  return useMemo(() => {
    if (!enabled || !onDragStart || !onDragMove || !onDragEnd) {
      return Gesture.Pan().enabled(false);
    }
    return Gesture.Pan()
      .minDistance(10)
      .onBegin(() => {
        if (onDragAttempt) {
          runOnJS(onDragAttempt)(pointIndex);
        }
      })
      .onStart((e) => {
        runOnJS(onDragStart)(pointIndex, e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => {
        runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        runOnJS(onDragEnd)(e.absoluteX, e.absoluteY);
      })
      .onFinalize((_e, success) => {
        if (!success && onDragCancel) {
          runOnJS(onDragCancel)();
        }
      });
  }, [enabled, onDragAttempt, onDragStart, onDragMove, onDragEnd, onDragCancel, pointIndex]);
}

type CheckersProps = {
  point: BoardPoint;
  pointIndex: number;
  isTop: boolean;
  colWidth: number;
  checkerSize: number;
  stackStep: number;
  visibleCount: number;
  showGhost: boolean;
  ghostPlayer: Player | null;
  hintTopChecker: boolean;
  dragEnabled: boolean;
  isDragging: boolean;
} & DragHandlers;

function stackStyle(opts: {
  isTop: boolean;
  offset: number;
  colWidth: number;
  checkerSize: number;
  zIndex: number;
}) {
  const { isTop, offset, colWidth, checkerSize, zIndex } = opts;
  return {
    position: 'absolute' as const,
    [isTop ? 'top' : 'bottom']: offset,
    left: (colWidth - checkerSize) / 2,
    zIndex,
    width: checkerSize,
    height: checkerSize,
  };
}

function PointCheckers({
  point,
  pointIndex,
  isTop,
  colWidth,
  checkerSize,
  stackStep,
  visibleCount,
  showGhost,
  ghostPlayer,
  hintTopChecker,
  dragEnabled,
  isDragging,
  onDragAttempt,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: CheckersProps) {
  const pan = useStackPan(pointIndex, dragEnabled, {
    onDragAttempt,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  });
  const stackStyleAnim = useAnimatedStyle(() => ({
    opacity: isDragging ? 0.25 : 1,
  }));

  if (point.count === 0) {
    return null;
  }

  return (
    <>
      {Array.from({ length: visibleCount }, (_, i) => {
        const offset = i * stackStep;
        const isTopChecker = i === visibleCount - 1;
        const token = (
          <CheckerToken
            player={point.player as Player}
            size={checkerSize}
            showCount={isTopChecker && point.count > MAX_VISIBLE ? point.count : undefined}
            showMoveHint={isTopChecker && hintTopChecker && !isDragging}
          />
        );
        const style = stackStyle({ isTop, offset, colWidth, checkerSize, zIndex: i + 1 });

        return (
          <GestureDetector key={i} gesture={pan}>
            <Animated.View style={[style, stackStyleAnim]}>{token}</Animated.View>
          </GestureDetector>
        );
      })}
      {showGhost && ghostPlayer && (
        <CheckerToken
          player={ghostPlayer}
          size={checkerSize}
          style={{
            ...stackStyle({
              isTop,
              offset: visibleCount * stackStep,
              colWidth,
              checkerSize,
              zIndex: 20,
            }),
            opacity: 0.35,
          }}
        />
      )}
    </>
  );
}

type Props = {
  pointIndex: number;
  point: BoardPoint;
  isTop: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isMovableSource: boolean;
  showGhost: boolean;
  ghostPlayer: Player | null;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  dragEnabled?: boolean;
  isDragging?: boolean;
  onDragAttempt?: (pointIndex: number) => void;
  onDragStart?: (pointIndex: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
  colWidth: number;
  pointHeight: number;
  checkerSize: number;
};

export function PointColumn({
  pointIndex,
  point,
  isTop,
  isSelected,
  isLegalTarget,
  isMovableSource,
  showGhost,
  ghostPlayer,
  onPress,
  onPressIn,
  onPressOut,
  dragEnabled = false,
  isDragging = false,
  onDragAttempt,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  colWidth,
  pointHeight,
  checkerSize,
}: Props) {
  let pointState: 'default' | 'selected' | 'legal' = 'default';
  if (isSelected) {
    pointState = 'selected';
  }
  else if (isLegalTarget) {
    pointState = 'legal';
  }
  const palette = getPointPalette(pointIndex, pointState);
  const stackStep = Math.min(checkerSize - 2, (pointHeight - checkerSize) / (MAX_VISIBLE - 1));
  const visibleCount = Math.min(point.count, MAX_VISIBLE);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Point ${pointIndex}${isSelected ? ', selected' : ''}${isLegalTarget ? ', legal move target' : ''}`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: colWidth, height: pointHeight, position: 'relative', overflow: 'visible' }}
    >
      <PointTriangle isTop={isTop} width={colWidth} height={pointHeight} palette={palette} />
      <PointCheckers
        point={point}
        pointIndex={pointIndex}
        isTop={isTop}
        colWidth={colWidth}
        checkerSize={checkerSize}
        stackStep={stackStep}
        visibleCount={visibleCount}
        showGhost={showGhost}
        ghostPlayer={ghostPlayer}
        hintTopChecker={isMovableSource}
        dragEnabled={dragEnabled}
        isDragging={isDragging}
        onDragAttempt={onDragAttempt}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      />
      {isLegalTarget && point.count === 0 && (
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -8,
            marginTop: -8,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: 'rgba(76, 175, 80, 0.35)',
            borderWidth: 1.5,
            borderColor: 'rgba(76, 175, 80, 0.7)',
            zIndex: 10,
          }}
        />
      )}
    </Pressable>
  );
}
