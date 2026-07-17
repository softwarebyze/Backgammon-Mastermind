import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '@/lib/game';
import { useCallback } from 'react';

import {
  applyDiceRoll,
  applyOpeningDieRoll,
  passTurn,
  rollDice,
  rollOpeningDie,
} from '@/lib/game';
import { playGameSfx } from '@/lib/game-sfx/play-game-sfx';

type DiceActionsArgs = {
  state: GameState | null;
  setState: Dispatch<SetStateAction<GameState | null>>;
  isAnimating: boolean;
  recordNoMove: (before: GameState, after: GameState) => void;
};

export function useGameDiceActions({
  state,
  setState,
  isAnimating,
  recordNoMove,
}: DiceActionsArgs) {
  const doPassTurn = useCallback(() => {
    if (isAnimating || !state || state.phase !== 'no-move') {
      return;
    }
    if (state.mode === 'vs-computer' && state.currentPlayer === 'black') {
      return;
    }
    // Snapshot before pass so history keeps the blocked roll.
    recordNoMove(state, state);
    setState(passTurn(state));
  }, [isAnimating, recordNoMove, setState, state]);

  const doRollDice = useCallback(() => {
    if (isAnimating) {
      return;
    }
    setState((prev) => {
      if (!prev) {
        return prev;
      }
      if (prev.mode === 'vs-computer' && prev.currentPlayer === 'black') {
        return prev;
      }
      if (prev.phase === 'opening-roll') {
        const { white, black } = prev.openingRolls;
        // Ceremony dismisses a shown tie by calling roll — clear without a new die.
        if (white !== null && black !== null && white === black) {
          return {
            ...prev,
            openingRolls: { white: null, black: null },
            currentPlayer: 'white',
          };
        }
        playGameSfx('roll');
        return applyOpeningDieRoll(prev, rollOpeningDie());
      }
      if (prev.phase !== 'rolling') {
        return prev;
      }
      playGameSfx('roll');
      return applyDiceRoll(prev, rollDice());
    });
  }, [isAnimating, setState]);

  return { doPassTurn, doRollDice };
}
