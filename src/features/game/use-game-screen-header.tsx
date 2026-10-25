import type { GameState } from '@/lib/game';
import { useLayoutEffect } from 'react';
import { View } from 'react-native';

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
    // Navigation lives with the game chrome: above the portrait board and in
    // the landscape rail. Native stack headers otherwise consume its short axis.
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return state
    ? (
        <View
          testID="game-navigation"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 44,
            flexShrink: 0,
            alignSelf: 'stretch',
          }}
        >
          <GameHomeButton onPress={confirmLeaveGame} />
          <GameHeaderActions
            compact
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={doUndo}
            onRedo={doRedo}
            onOptions={openOptions}
            onReset={handleReset}
          />
        </View>
      )
    : null;
}
