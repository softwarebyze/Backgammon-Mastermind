import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import type { Player } from '@/lib/game/types';
import { useId, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { barStackLayout } from '@/features/game/bar-stack-layout';
import { BAR_POINT } from '@/lib/game/constants';
import { BOARD_THEME } from './board-theme';
import { CheckerToken } from './checker-token';
import { composeColumnGestures, useCheckerPan, useColumnTapGesture } from './use-checker-pan';

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
  /** Checker to lift when a pan starts on the bar (may be a nearby unique origin). */
  panFrom?: number;
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
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
  isDragging: boolean;
  isSelected?: boolean;
};

function BarStack({
  count,
  player,
  boardHeight,
  middleHeight,
  checkerSize,
  isDragging,
  isSelected = false,
}: StackProps) {
  const { size, centers } = barStackLayout({ boardHeight, middleHeight, checkerSize, count, player });
  const topDragStyle = useAnimatedStyle(() => ({
    opacity: isDragging ? 0.25 : 1,
  }));

  if (count === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, width: '100%', height: boardHeight }}>
      {centers.map((center, i) => {
        const isTopChecker = i === centers.length - 1;
        const token = <CheckerToken player={player} size={size} showCount={isTopChecker && count > centers.length ? count : undefined} isSelected={isTopChecker && isSelected} />;
        if (!isTopChecker) {
          return <View key={center} style={{ position: 'absolute', top: center - size / 2, alignSelf: 'center' }}>{token}</View>;
        }
        return (
          <Animated.View key={center} style={[{ position: 'absolute', top: center - size / 2, alignSelf: 'center' }, topDragStyle]}>
            {token}
          </Animated.View>
        );
      })}
    </View>
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
  panFrom = BAR_POINT,
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
  const pan = useCheckerPan(panFrom, dragEnabled, {
    onDragAttempt,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
    overlay: dragOverlay,
  });
  const tap = useColumnTapGesture(dragEnabled, { onPress: onPressBar });
  const barGesture = useMemo(
    () => (dragEnabled ? composeColumnGestures(pan, tap) : null),
    [dragEnabled, pan, tap],
  );

  const pressable = (
    <Pressable
      testID="board-bar"
      accessibilityRole="button"
      accessibilityLabel={
        `Bar${whiteCount > 0 ? `, ${whiteCount} white ${whiteCount === 1 ? 'checker' : 'checkers'}` : ''}`
        + `${blackCount > 0 ? `, ${blackCount} black ${blackCount === 1 ? 'checker' : 'checkers'}` : ''}`
      }
      accessible
      pointerEvents={dragEnabled ? 'box-only' : 'auto'}
      onPress={dragEnabled
        ? undefined
        : (e) => {
            // Parent board Pressable clears selection; stop bubble on web.
            e?.stopPropagation?.();
            onPressBar();
          }}
      style={({ pressed }) => ({
        width: barWidth,
        height: boardHeight,
        backgroundColor: BOARD_THEME.bar.surface,
        alignItems: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          borderWidth: isBarSelected ? 2 : 1,
          borderColor: isBarSelected ? '#FFD700' : 'rgba(0,0,0,0.45)',
          zIndex: 2,
        }}
      />
      <BarStack
        count={blackCount}
        player="black"
        boardHeight={boardHeight}
        middleHeight={middleHeight}
        checkerSize={checkerSize}
        isDragging={isDragging && currentPlayer === 'black'}
        isSelected={isBarSelected && currentPlayer === 'black'}
      />

      <View pointerEvents="none" style={{ position: 'absolute', top: halfHeight }}>
        <BarHinge width={barWidth} height={middleHeight} />
      </View>

      <BarStack
        count={whiteCount}
        player="white"
        boardHeight={boardHeight}
        middleHeight={middleHeight}
        checkerSize={checkerSize}
        isDragging={isDragging && currentPlayer === 'white'}
        isSelected={isBarSelected && currentPlayer === 'white'}
      />
    </Pressable>
  );

  if (dragEnabled && barGesture) {
    return (
      <GestureDetector gesture={barGesture}>
        {pressable}
      </GestureDetector>
    );
  }

  return pressable;
}
