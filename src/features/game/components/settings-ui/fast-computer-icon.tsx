import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import { View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';

type Props = {
  size?: number;
  active?: boolean;
};

/** Fast-forward — skip computer wait. Off is idle (muted), not still “on”. */
export function FastComputerIcon({ size = 32, active = false }: Props) {
  const color = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="fast-forward" size={size * 0.81} color={color} />
    </View>
  );
}
