import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size?: number;
};

/** Checker with subtle ring — move hints setting */
export function MoveHintIcon({ size = 28 }: Props) {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#F2EAD3"
          stroke="#BBA070"
          strokeWidth={1.5}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r + 3}
          fill="none"
          stroke="rgba(212, 168, 67, 0.85)"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
