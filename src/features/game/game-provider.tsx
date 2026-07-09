import type * as React from 'react';
import { GameContext } from '@/features/game/game-context';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const value = useGameProviderValue();
  return <GameContext value={value}>{children}</GameContext>;
}
