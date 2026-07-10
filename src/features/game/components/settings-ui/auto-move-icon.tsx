import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import { View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';

type Props = {
  size?: number;
  active?: boolean;
};

/** Fast-forward forced moves setting */
export function AutoMoveIcon({ size = 32, active = false }: Props) {
  const color = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="zap" size={size * 0.62} color={color} />
    </View>
  );
}
