import type { GameState, Move } from '@/lib/game';
import { useEffect, useRef } from 'react';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { getForcedLegalMove } from '@/lib/game/single-move';

const AUTO_ROLL_DELAY_MS = 400;
const AUTO_MOVE_DELAY_MS = 300;

function isHumanTurn(state: GameState): boolean {
  return state.mode !== 'vs-computer' || state.currentPlayer === 'white';
}

type Options = {
  state: GameState | null;
  isAnimating: boolean;
  doRollDice: () => void;
  doMove: (move: Move) => void;
};

export function useGameplayHelpers({
  state,
  isAnimating,
  doRollDice,
  doMove,
}: Options) {
  const { preferences } = useGamePreferences();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clear = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    clear();

    if (!state || isAnimating || state.phase === 'game-over') {
      return clear;
    }

    if (!isHumanTurn(state)) {
      return clear;
    }

    if (
      preferences.autoRoll
      && (state.phase === 'rolling' || state.phase === 'opening-roll')
    ) {
      timeoutRef.current = setTimeout(() => {
        doRollDice();
      }, AUTO_ROLL_DELAY_MS);
      return clear;
    }

    if (preferences.autoMoveWhenForced && state.phase === 'moving') {
      const move = getForcedLegalMove(state);
      if (move) {
        timeoutRef.current = setTimeout(() => {
          doMove(move);
        }, AUTO_MOVE_DELAY_MS);
      }
    }

    return clear;
  }, [
    state,
    isAnimating,
    preferences.autoRoll,
    preferences.autoMoveWhenForced,
    doRollDice,
    doMove,
  ]);
}
