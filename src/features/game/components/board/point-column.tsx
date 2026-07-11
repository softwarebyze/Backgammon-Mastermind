import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import type { BoardPoint, Player } from '@/lib/game/types';
import { Pressable, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { getPointPalette } from './board-theme';
import { CheckerToken } from './checker-token';
import { PointTriangle } from './point-triangle';
import { useCheckerPan } from './use-checker-pan';

const MAX_VISIBLE = 5;

type DragHandlers = {
  onDragAttempt?: (pointIndex: number) => void;
  onDragStart?: (pointIndex: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
};

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
  dragOverlay?: DragOverlayRefs;
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

function checkerInStack(opts: {
  isTop: boolean;
  offset: number;
  checkerSize: number;
  zIndex: number;
}) {
  const { isTop, offset, checkerSize, zIndex } = opts;
  return {
    position: 'absolute' as const,
    [isTop ? 'top' : 'bottom']: offset,
    left: 0,
    zIndex,
    width: checkerSize,
    height: checkerSize,
  };
}

function stackHitArea(opts: {
  isTop: boolean;
  colWidth: number;
  checkerSize: number;
  stackStep: number;
  visibleCount: number;
}) {
  const { isTop, colWidth, checkerSize, stackStep, visibleCount } = opts;
  const stackHeight = checkerSize + Math.max(0, visibleCount - 1) * stackStep;
  // Physical touch target — hitSlop is unreliable on web vs parent Pressables.
  const padOpen = Math.round(checkerSize * 0.55);
  const padSide = Math.round(checkerSize * 0.28);
  return {
    outer: {
      position: 'absolute' as const,
      [isTop ? 'top' : 'bottom']: -padOpen,
      left: (colWidth - checkerSize) / 2 - padSide,
      width: checkerSize + padSide * 2,
      height: stackHeight + padOpen,
      zIndex: visibleCount + 10,
    },
    inner: {
      width: checkerSize,
      height: stackHeight,
      marginTop: isTop ? padOpen : 0,
      marginBottom: isTop ? 0 : padOpen,
      marginLeft: padSide,
      position: 'relative' as const,
    },
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
  dragOverlay,
  onDragAttempt,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: CheckersProps) {
  const pan = useCheckerPan(pointIndex, dragEnabled, {
    onDragAttempt,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
    overlay: dragOverlay,
  });
  // Only the piece leaving the stack fades — rest of the stack stays solid.
  const topDragStyle = useAnimatedStyle(() => ({
    opacity: isDragging ? 0.25 : 1,
  }));

  if (point.count === 0) {
    return null;
  }

  const stackContent = (
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
        const CheckerWrap = isTopChecker ? Animated.View : View;
        return (
          <CheckerWrap
            key={i}
            style={[
              checkerInStack({ isTop, offset, checkerSize, zIndex: i + 1 }),
              isTopChecker ? topDragStyle : undefined,
            ]}
          >
            {token}
          </CheckerWrap>
        );
      })}
    </>
  );

  const hitArea = stackHitArea({ isTop, colWidth, checkerSize, stackStep, visibleCount });

  return (
    <>
      {dragEnabled
        ? (
            <GestureDetector gesture={pan}>
              <View style={hitArea.outer}>
                <View style={hitArea.inner}>{stackContent}</View>
              </View>
            </GestureDetector>
          )
        : (
            <View style={hitArea.outer}>
              <View style={hitArea.inner}>{stackContent}</View>
            </View>
          )}
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
  dragOverlay?: DragOverlayRefs;
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
  dragOverlay,
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
      onPress={(e) => {
        // Parent board Pressable clears selection; stop bubble on web.
        e?.stopPropagation?.();
        onPress();
      }}
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
        dragOverlay={dragOverlay}
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
