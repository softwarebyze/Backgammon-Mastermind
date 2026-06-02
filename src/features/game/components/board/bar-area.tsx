import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { useId } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BOARD_THEME } from './board-theme';
import { CheckerToken } from './checker-token';

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
};

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

export function BarArea({
  whiteCount,
  blackCount,
  currentPlayer: _currentPlayer,
  selectedPoint,
  onPressBar,
  barWidth,
  boardHeight,
  middleHeight,
  checkerSize,
}: Props) {
  const isBarSelected = selectedPoint === 0;
  const halfHeight = (boardHeight - middleHeight) / 2;
  const small = checkerSize * 0.88;

  const renderStack = (
    count: number,
    player: Player,
    justify: 'flex-start' | 'flex-end',
  ) => (
    <View
      style={{
        height: halfHeight,
        alignItems: 'center',
        justifyContent: justify,
        paddingVertical: 6,
        gap: 2,
      }}
    >
      {Array.from({ length: Math.min(count, 4) }, (_, i) => (
        <CheckerToken key={i} player={player} size={small} />
      ))}
    </View>
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Bar"
      onPress={onPressBar}
      activeOpacity={0.8}
      style={{
        width: barWidth,
        height: boardHeight,
        backgroundColor: BOARD_THEME.bar.surface,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderWidth: isBarSelected ? 2 : 0,
        borderColor: isBarSelected ? '#FFD700' : 'rgba(0,0,0,0.45)',
        alignItems: 'center',
      }}
    >
      {renderStack(blackCount, 'black', 'flex-start')}

      <BarHinge width={barWidth} height={middleHeight} />

      {renderStack(whiteCount, 'white', 'flex-end')}
    </TouchableOpacity>
  );
}
