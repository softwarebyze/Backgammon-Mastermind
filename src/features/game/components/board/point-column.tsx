import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import type { BoardPoint, Player } from '@/lib/game/types';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { getPointPalette } from './board-theme';
import { CheckerToken } from './checker-token';
import { PointTriangle } from './point-triangle';
import { composeColumnGestures, useCheckerPan, useColumnTapGesture } from './use-checker-pan';

const MAX_VISIBLE = 5;

type CheckersProps = {
  point: BoardPoint;
  isTop: boolean;
  colWidth: number;
  checkerSize: number;
  stackStep: number;
  visibleCount: number;
  showGhost: boolean;
  ghostPlayer: Player | null;
  hintTopChecker: boolean;
  isDragging: boolean;
};

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

function PointCheckers({
  point,
  isTop,
  colWidth,
  checkerSize,
  stackStep,
  visibleCount,
  showGhost,
  ghostPlayer,
  hintTopChecker,
  isDragging,
}: CheckersProps) {
  const topDragStyle = useAnimatedStyle(() => ({
    opacity: isDragging ? 0.25 : 1,
  }));

  if (point.count === 0) {
    return null;
  }

  const stackHeight = checkerSize + Math.max(0, visibleCount - 1) * stackStep;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          [isTop ? 'top' : 'bottom']: 0,
          left: (colWidth - checkerSize) / 2,
          width: checkerSize,
          height: stackHeight,
          zIndex: visibleCount + 1,
        }}
      >
        {Array.from({ length: visibleCount }, (_, i) => {
          const offset = i * stackStep;
          const isTopChecker = i === visibleCount - 1;
          const token = (
            <CheckerToken
              player={point.player as Player}
              size={checkerSize}
              showCount={isTopChecker && point.count > MAX_VISIBLE ? point.count : undefined}
              showMoveHint={isTopChecker && hintTopChecker && !isDragging}
              isSelected={isTopChecker && isSelected && !isDragging}
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
      </View>
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

type ColumnContentProps = {
  point: BoardPoint;
  isTop: boolean;
  isLegalTarget: boolean;
  isMovableSource: boolean;
  showGhost: boolean;
  ghostPlayer: Player | null;
  isDragging: boolean;
  colWidth: number;
  pointHeight: number;
  checkerSize: number;
  stackStep: number;
  visibleCount: number;
  palette: ReturnType<typeof getPointPalette>;
};

function ColumnContent({
  point,
  isTop,
  isLegalTarget,
  isMovableSource,
  showGhost,
  ghostPlayer,
  isDragging,
  colWidth,
  pointHeight,
  checkerSize,
  stackStep,
  visibleCount,
  palette,
}: ColumnContentProps) {
  return (
    <>
      <PointTriangle isTop={isTop} width={colWidth} height={pointHeight} palette={palette} />
      <PointCheckers
        point={point}
        isTop={isTop}
        colWidth={colWidth}
        checkerSize={checkerSize}
        stackStep={stackStep}
        visibleCount={visibleCount}
        showGhost={showGhost}
        ghostPlayer={ghostPlayer}
        hintTopChecker={isMovableSource}
        isDragging={isDragging}
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

  const pan = useCheckerPan(pointIndex, dragEnabled, {
    onDragAttempt,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
    overlay: dragOverlay,
  });
  const tap = useColumnTapGesture(dragEnabled, { onPress, onPressIn, onPressOut });
  const columnGesture = useMemo(
    () => (dragEnabled ? composeColumnGestures(pan, tap) : null),
    [dragEnabled, pan, tap],
  );
  const a11yLabel = `Point ${pointIndex}${isSelected ? ', selected' : ''}${isLegalTarget ? ', legal move target' : ''}`;
  const columnStyle = { width: colWidth, height: pointHeight, position: 'relative' as const, overflow: 'visible' as const };
  const columnContent = (
    <ColumnContent
      point={point}
      isTop={isTop}
      isLegalTarget={isLegalTarget}
      isMovableSource={isMovableSource}
      showGhost={showGhost}
      ghostPlayer={ghostPlayer}
      isDragging={isDragging}
      colWidth={colWidth}
      pointHeight={pointHeight}
      checkerSize={checkerSize}
      stackStep={stackStep}
      visibleCount={visibleCount}
      palette={palette}
    />
  );

  if (dragEnabled && columnGesture) {
    return (
      <GestureDetector gesture={columnGesture}>
        {/* box-only: RNGH web captures event.target; nested checkers remount mid-drag and throw. */}
        <View
          pointerEvents="box-only"
          style={columnStyle}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') {
              onPress();
            }
          }}
        >
          {columnContent}
        </View>
      </GestureDetector>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={columnStyle}
    >
      {columnContent}
    </Pressable>
  );
}
