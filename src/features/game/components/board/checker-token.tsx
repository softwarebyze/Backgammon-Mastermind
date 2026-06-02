import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { BOARD_THEME } from './board-theme';

type Props = {
  player: Player;
  size: number;
  showCount?: number;
  /** Subtle ring when move hints are on — top checker only */
  showMoveHint?: boolean;
  style?: object;
};

export function CheckerToken({ player, size, showCount, showMoveHint, style }: Props) {
  const uid = useId().replace(/:/g, '');
  const bodyId = `checker-body-${uid}`;
  const isWhite = player === 'white';
  const colors = isWhite ? BOARD_THEME.checker.white : BOARD_THEME.checker.black;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;
  const innerRadius = size * 0.27;

  return (
    <View
      style={[
        { width: size, height: size },
        isWhite && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.45,
          shadowRadius: 3,
          elevation: 4,
        },
        style,
      ]}
    >
      {showMoveHint && (
        <View
          style={{
            ...StyleSheet.absoluteFill,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: 'rgba(212, 168, 67, 0.65)',
            zIndex: 2,
          }}
        />
      )}
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={bodyId} cx="38%" cy="32%" rx="62%" ry="62%">
            <Stop offset="0%" stopColor={colors.highlight} />
            <Stop offset="55%" stopColor={colors.mid} />
            <Stop offset="100%" stopColor={colors.shadow} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={cx}
          cy={cy + 1.5}
          r={radius}
          fill="rgba(0,0,0,0.35)"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={`url(#${bodyId})`}
          stroke={colors.rim}
          strokeWidth={1.5}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={innerRadius}
          fill="none"
          stroke={isWhite ? 'rgba(255,255,255,0.65)' : 'rgba(140,140,210,0.45)'}
          strokeWidth={1.25}
        />
        <Circle
          cx={cx - radius * 0.25}
          cy={cy - radius * 0.3}
          r={radius * 0.18}
          fill={isWhite ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
        />
      </Svg>
      {showCount !== undefined && showCount > 0 && (
        <Text
          style={[
            StyleSheet.absoluteFill,
            {
              color: isWhite ? '#3A2A10' : '#E0E0FF',
              fontSize: size * 0.35,
              fontWeight: '700',
              textAlign: 'center',
              lineHeight: size,
            },
          ]}
        >
          {showCount}
        </Text>
      )}
    </View>
  );
}
