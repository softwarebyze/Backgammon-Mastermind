import type { GameState } from '@/lib/game';
import { useLayoutEffect } from 'react';

import { GameHeaderActions } from '@/components/navigation/game-header-actions';
import { GameHomeButton } from '@/components/navigation/game-home-button';

type Navigation = {
  setOptions: (options: object) => void;
};

type Options = {
  navigation: Navigation;
  state: GameState | null;
  canUndo: boolean;
  canRedo: boolean;
  doUndo: () => void;
  doRedo: () => void;
  openOptions: () => void;
  handleReset: () => void;
  confirmLeaveGame: () => void;
};

export function useGameScreenHeader({
  navigation,
  state,
  canUndo,
  canRedo,
  doUndo,
  doRedo,
  openOptions,
  handleReset,
  confirmLeaveGame,
}: Options) {
  useLayoutEffect(() => {
    if (!state) {
      return;
    }
    navigation.setOptions({
      title: '',
      headerLeft: () => <GameHomeButton onPress={confirmLeaveGame} />,
      headerRight: () => (
        <GameHeaderActions
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={doUndo}
          onRedo={doRedo}
          onOptions={openOptions}
          onReset={handleReset}
        />
      ),
    });
  }, [
    navigation,
    state,
    canUndo,
    canRedo,
    doUndo,
    doRedo,
    openOptions,
    handleReset,
    confirmLeaveGame,
  ]);
}
