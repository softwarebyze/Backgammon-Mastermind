import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BOARD_THEME } from '@/features/game/components/board/board-theme';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { continuousRadius } from '@/lib/ui/native-styles';

const FRAME = 6;
const BAR = 14;

/** The far side of the opening position, left to right: points 13 to 24. */
const OPENING_FAR_SIDE: Record<number, { player: 'white' | 'black'; count: number }> = {
  0: { player: 'white', count: 5 },
  4: { player: 'black', count: 3 },
  6: { player: 'black', count: 5 },
  11: { player: 'white', count: 2 },
};

/**
 * Home's picture: the far side of a board set up to play, fading into the
 * page. Decoration only; it draws with the board's own colours.
 */
export function HomeBoardArt({ width, height }: { width: number; height: number }) {
  const uid = useId().replace(/:/g, '');
  const column = (width - FRAME * 2 - BAR) / 12;
  const radius = column / 2 - 1;
  const pointHeight = Math.min(height * 0.8, column * 4.4);
  const columnLeft = (index: number) => FRAME + index * column + (index >= 6 ? BAR : 0);
  return (
    <View
      testID="home-board-art"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width, height, overflow: 'hidden', ...continuousRadius(18) }}
    >
      <Svg width={width} height={height}>
        <Defs>
          {(['white', 'black'] as const).map(player => (
            <RadialGradient key={player} id={`${uid}-${player}`} cx="38%" cy="32%" rx="62%" ry="62%">
              <Stop offset="0%" stopColor={BOARD_THEME.checker[player].highlight} />
              <Stop offset="55%" stopColor={BOARD_THEME.checker[player].mid} />
              <Stop offset="100%" stopColor={BOARD_THEME.checker[player].shadow} />
            </RadialGradient>
          ))}
          <LinearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.25" stopColor={GAME_PALETTE.bg} stopOpacity={0} />
            <Stop offset="0.9" stopColor={GAME_PALETTE.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={BOARD_THEME.frame.rim} />
        <Rect x={FRAME} y={FRAME} width={width - FRAME * 2} height={height} fill={BOARD_THEME.wood.base} />
        <Rect x={FRAME + column * 6} y={FRAME} width={BAR} height={height} fill={BOARD_THEME.bar.surface} />
        {Array.from({ length: 12 }, (_, index) => {
          const left = columnLeft(index);
          const palette = BOARD_THEME.points[index % 2 === 0 ? 'light' : 'dark'];
          return (
            <Polygon
              key={index}
              points={`${left},${FRAME} ${left + column},${FRAME} ${left + column / 2},${FRAME + pointHeight}`}
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth={0.75}
            />
          );
        })}
        {Object.entries(OPENING_FAR_SIDE).flatMap(([index, { player, count }]) =>
          Array.from({ length: count }, (_, stack) => {
            const cx = columnLeft(Number(index)) + column / 2;
            const cy = FRAME + radius + 1 + stack * radius * 2;
            return [
              <Circle key={`${index}-${stack}-shadow`} cx={cx} cy={cy + 1.5} r={radius} fill="rgba(0,0,0,0.35)" />,
              <Circle
                key={`${index}-${stack}`}
                cx={cx}
                cy={cy}
                r={radius}
                fill={`url(#${uid}-${player})`}
                stroke={BOARD_THEME.checker[player].rim}
                strokeWidth={1.25}
              />,
            ];
          }),
        )}
        <Rect width={width} height={height} fill={`url(#${uid}-fade)`} />
      </Svg>
    </View>
  );
}
