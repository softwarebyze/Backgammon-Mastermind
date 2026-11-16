import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/scaled-text';
import { GAME_PALETTE } from '@/features/game/game-palette';

import { FONT_SCALE_CAP } from '@/lib/ui/font-scale';
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
      <Text maxFontSizeMultiplier={FONT_SCALE_CAP.fixed} style={{ color, fontSize: size * 0.48, ...interFont('bold') }}>24</Text>
    </View>
  );
}
