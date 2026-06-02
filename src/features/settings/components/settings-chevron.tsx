import { Feather } from '@expo/vector-icons';
import * as React from 'react';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { isRTL } from '@/lib/i18n';

export function SettingsChevron() {
  return (
    <Feather
      name={isRTL ? 'chevron-left' : 'chevron-right'}
      size={22}
      color={GAME_PALETTE.accentDim}
    />
  );
}
