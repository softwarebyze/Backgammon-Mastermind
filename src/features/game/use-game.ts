import type { GameContextType } from '@/features/game/game-context';

import { use } from 'react';
import { GameContext } from '@/features/game/game-context';

export function useGame(): GameContextType {
  const ctx = use(GameContext);
  if (!ctx)
    throw new Error('useGame must be used within GameProvider');
  return ctx;
}
