import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { useLayoutIsRTL } from '@/lib/i18n';

type Props = {
  size?: number;
  active?: boolean;
};

/** One die, then two: follow the displayed dice in reading order. */
export function DiceOrderIcon({ size = 32, active = false }: Props) {
  const rtl = useLayoutIsRTL();
  const color = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  return (
    <View
      style={{ width: size, height: size }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <G transform={rtl ? 'translate(32 0) scale(-1 1)' : undefined}>
          <G fill="none" stroke={color} strokeWidth={1.6}>
            <Rect x={3} y={7} width={11} height={11} rx={2} />
            <Rect x={18} y={7} width={11} height={11} rx={2} />
            <Path d="M8 24h16m-3-3 3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </G>
          <G fill={color}>
            <Circle cx={8.5} cy={12.5} r={1.25} />
            <Circle cx={21.5} cy={10.5} r={1.25} />
            <Circle cx={25.5} cy={14.5} r={1.25} />
          </G>
        </G>
      </Svg>
    </View>
  );
}
