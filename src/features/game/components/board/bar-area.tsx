import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { useId } from 'react';
import { Pressable, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BAR_POINT } from '@/lib/game/constants';
import { BOARD_THEME } from './board-theme';
import { CheckerToken } from './checker-token';
import { useCheckerPan } from './use-checker-pan';

type DragHandlers = {
  onDragAttempt?: (from: number) => void;
  onDragStart?: (from: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
};

type Props = {
  whiteCount: number;
  blackCount: number;
  currentPlayer: Player;
  selectedPoint: number | null;
  onPressBar: () => void;
  barWidth: number;
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
  dragEnabled?: boolean;
  isDragging?: boolean;
  dragOverlay?: DragOverlayRefs;
} & DragHandlers;

function BarHinge({ width, height }: { width: number; height: number }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `bar-hinge-${uid}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={BOARD_THEME.bar.hingeShadow} />
          <Stop offset="35%" stopColor={BOARD_THEME.bar.hinge} />
          <Stop offset="65%" stopColor={BOARD_THEME.bar.hinge} />
          <Stop offset="100%" stopColor={BOARD_THEME.bar.hingeShadow} />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill={BOARD_THEME.bar.groove} />
      <Rect x={width * 0.15} y={1} width={width * 0.7} height={height - 2} rx={1} fill={`url(#${gradId})`} />
    </Svg>
  );
}

type StackProps = {
  count: number;
  player: Player;
  justify: 'flex-start' | 'flex-end';
  halfHeight: number;
  checkerSize: number;
  dragEnabled: boolean;
  isDragging: boolean;
  isSelected?: boolean;
  dragOverlay?: DragOverlayRefs;
} & DragHandlers;

function BarStack({
  count,
  player,
  justify,
  halfHeight,
  checkerSize,
  dragEnabled,
  isDragging,
  isSelected = false,
  dragOverlay,
  onDragAttempt,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: StackProps) {
  const small = checkerSize * 0.88;
  const visible = Math.min(count, 4);
  const pan = useCheckerPan(BAR_POINT, dragEnabled, {
    onDragAttempt,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
    overlay: dragOverlay,
  });
  const topDragStyle = useAnimatedStyle(() => ({
    opacity: isDragging ? 0.25 : 1,
  }));

  if (count === 0) {
    return <View style={{ height: halfHeight }} />;
  }

  const stackContent = (
    <View
      // Keep pointer target on this view while dragging — see PointColumn.
      pointerEvents={dragEnabled ? 'box-only' : 'auto'}
      style={{
        height: halfHeight,
        alignItems: 'center',
        justifyContent: justify,
        paddingVertical: 6,
        gap: 2,
      }}
    >
      {Array.from({ length: visible }, (_, i) => {
        const isTopChecker = i === visible - 1;
        const token = <CheckerToken player={player} size={small} isSelected={isTopChecker && isSelected} />;
        if (!isTopChecker) {
          return <View key={i}>{token}</View>;
        }
        return (
          <Animated.View key={i} style={topDragStyle}>
            {token}
          </Animated.View>
        );
      })}
    </View>
  );

  if (!dragEnabled) {
    return stackContent;
  }

  return (
    <GestureDetector gesture={pan}>
      {stackContent}
    </GestureDetector>
  );
}

export function BarArea({
  whiteCount,
  blackCount,
  currentPlayer,
  selectedPoint,
  onPressBar,
  barWidth,
  boardHeight,
  middleHeight,
  checkerSize,
  dragEnabled = false,
  isDragging = false,
  dragOverlay,
  onDragAttempt,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: Props) {
  const isBarSelected = selectedPoint === 0;
  const halfHeight = (boardHeight - middleHeight) / 2;
  const dragHandlers = { onDragAttempt, onDragStart, onDragMove, onDragEnd, onDragCancel, dragOverlay };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        `Bar${whiteCount > 0 ? `, ${whiteCount} white ${whiteCount === 1 ? 'checker' : 'checkers'}` : ''}`
        + `${blackCount > 0 ? `, ${blackCount} black ${blackCount === 1 ? 'checker' : 'checkers'}` : ''}`
      }
      accessible
      onPress={(e) => {
        // Parent board Pressable clears selection; stop bubble on web.
        e?.stopPropagation?.();
        onPressBar();
      }}
      style={({ pressed }) => ({
        width: barWidth,
        height: boardHeight,
        backgroundColor: BOARD_THEME.bar.surface,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderWidth: isBarSelected ? 2 : 0,
        borderColor: isBarSelected ? '#FFD700' : 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <BarStack
        count={blackCount}
        player="black"
        justify="flex-start"
        halfHeight={halfHeight}
        checkerSize={checkerSize}
        dragEnabled={dragEnabled && currentPlayer === 'black' && blackCount > 0}
        isDragging={isDragging && currentPlayer === 'black'}
        isSelected={isBarSelected && currentPlayer === 'black'}
        {...dragHandlers}
      />

      <BarHinge width={barWidth} height={middleHeight} />

      <BarStack
        count={whiteCount}
        player="white"
        justify="flex-end"
        halfHeight={halfHeight}
        checkerSize={checkerSize}
        dragEnabled={dragEnabled && currentPlayer === 'white' && whiteCount > 0}
        isDragging={isDragging && currentPlayer === 'white'}
        isSelected={isBarSelected && currentPlayer === 'white'}
        {...dragHandlers}
      />
    </Pressable>
  );
}
