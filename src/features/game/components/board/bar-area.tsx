import type { StackEditHandlers } from './use-stack-edit-gesture';
import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import type { Player } from '@/lib/game/types';
import { useId, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { barStackLayout } from '@/features/game/bar-stack-layout';
import { BAR_POINT } from '@/lib/game/constants';
import { BOARD_THEME } from './board-theme';
import { CheckerToken } from './checker-token';
import { StackEditTarget } from './stack-edit-target';
import { composeColumnGestures, useCheckerPan, useColumnTapGesture } from './use-checker-pan';

type DragHandlers = {
  onDragAttempt?: (from: number) => void;
  onDragStart?: (from: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
};

type Props = {
  stackEditor?: StackEditHandlers;
  whiteCount: number;
  blackCount: number;
  currentPlayer: Player;
  selectedPoint: number | null;
  /** Outline the bar (a move passing through it, a lesson step) without selecting its checker. */
  emphasized?: boolean;
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
  /** Ring the current player's front bar checker as a move hint. */
  showMoveHint?: boolean;
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

function BarOutline({ lit }: { lit: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        ...StyleSheet.absoluteFill,
        ...(lit ? { borderWidth: 2, borderColor: '#FFD700' } : { borderWidth: 1, borderColor: 'rgba(0,0,0,0.45)' }),
        zIndex: 2,
      }}
    />
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
  showMoveHint?: boolean;
};

function BarStack({
  count,
  player,
  boardHeight,
  middleHeight,
  checkerSize,
  isDragging,
  isSelected = false,
  showMoveHint = false,
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
        const token = <CheckerToken player={player} size={size} showCount={isTopChecker && count > centers.length ? count : undefined} isSelected={isTopChecker && isSelected} showMoveHint={isTopChecker && showMoveHint} />;
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
  stackEditor,
  whiteCount,
  blackCount,
  currentPlayer,
  selectedPoint,
  emphasized = false,
  onPressBar,
  barWidth,
  boardHeight,
  middleHeight,
  checkerSize,
  dragEnabled = false,
  panFrom = BAR_POINT,
  isDragging = false,
  dragOverlay,
  showMoveHint = false,
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
      testID={stackEditor ? 'position-board-bar' : 'board-bar'}
      accessibilityRole={stackEditor ? 'adjustable' : 'button'}
      accessibilityValue={stackEditor ? { min: 0, max: 15, now: currentPlayer === 'white' ? whiteCount : blackCount } : undefined}
      accessibilityActions={stackEditor ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={event => stackEditor?.onAdjust(BAR_POINT, event.nativeEvent.actionName === 'decrement' ? -1 : 1)}
      accessibilityLabel={
        `Bar${whiteCount > 0 ? `, ${whiteCount} white ${whiteCount === 1 ? 'checker' : 'checkers'}` : ''}`
        + `${blackCount > 0 ? `, ${blackCount} black ${blackCount === 1 ? 'checker' : 'checkers'}` : ''}`
      }
      accessible
      pointerEvents={dragEnabled || stackEditor ? 'box-only' : 'auto'}
      onPress={dragEnabled || stackEditor
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
      <BarOutline lit={isBarSelected || emphasized} />
      <BarStack
        count={blackCount}
        player="black"
        boardHeight={boardHeight}
        middleHeight={middleHeight}
        checkerSize={checkerSize}
        isDragging={isDragging && currentPlayer === 'black'}
        isSelected={isBarSelected && currentPlayer === 'black'}
        showMoveHint={showMoveHint && currentPlayer === 'black'}
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
        showMoveHint={showMoveHint && currentPlayer === 'white'}
      />
    </Pressable>
  );

  if (stackEditor) {
    return <StackEditTarget point={BAR_POINT} checkerSize={checkerSize} editor={stackEditor}>{pressable}</StackEditTarget>;
  }

  if (dragEnabled && barGesture) {
    return (
      <GestureDetector gesture={barGesture}>
        {pressable}
      </GestureDetector>
    );
  }

  return pressable;
}
