import type * as React from 'react';
import { useEffect } from 'react';
import { GameContext } from '@/features/game/game-context';
import { useGameActive } from '@/features/game/use-game-active';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const active = useGameActive();
  const value = useGameProviderValue(active);
  const { resetAnimation } = value;
  useEffect(() => {
    // Cancel pending animation commits/watchdogs as well as AI/helper timers.
    if (!active) {
      resetAnimation();
    }
  }, [active, resetAnimation]);
  return <GameContext value={value}>{children}</GameContext>;
}
