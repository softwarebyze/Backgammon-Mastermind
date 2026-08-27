import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import { View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';

type Props = {
  size?: number;
  active?: boolean;
};

/** Speaker — game sounds setting. Off reads as muted. */
export function SoundIcon({ size = 32, active = false }: Props) {
  const color = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Feather
        name={active ? 'volume-2' : 'volume-x'}
        size={size * 0.88}
        color={color}
      />
    </View>
  );
}
