import * as React from 'react';
import { Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  size?: number;
  active?: boolean;
};

/** Mini board point label — point numbers setting */
export function PointNumbersIcon({ size = 28, active = false }: Props) {
  const color = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <Text style={{ color, fontSize: size * 0.48, ...interFont('bold') }}>24</Text>
    </View>
  );
}
