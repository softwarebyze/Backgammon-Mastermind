import Feather from '@expo/vector-icons/Feather';
import * as React from 'react';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { getIsRTL } from '@/lib/i18n';

export function SettingsChevron() {
  return (
    <Feather
      name={getIsRTL() ? 'chevron-left' : 'chevron-right'}
      size={22}
      color={GAME_PALETTE.accentDim}
    />
  );
}
