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

type RecordNoMove = (before: GameState, after: GameState) => void;

export function useGameDiceActions(
  setState: Dispatch<SetStateAction<GameState | null>>,
  isAnimating: boolean,
  recordNoMove: RecordNoMove,
) {
  const doPassTurn = useCallback(() => {
    if (isAnimating) {
      return;
    }
    setState((prev) => {
      if (!prev || prev.phase !== 'no-move') {
        return prev;
      }
      if (prev.mode === 'vs-computer' && prev.currentPlayer === 'black') {
        return prev;
      }
      // Snapshot before pass so history keeps the blocked roll.
      recordNoMove(prev, prev);
      return passTurn(prev);
    });
  }, [isAnimating, recordNoMove, setState]);

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
        return applyOpeningDieRoll(prev, rollOpeningDie());
      }
      if (prev.phase !== 'rolling') {
        return prev;
      }
      return applyDiceRoll(prev, rollDice());
    });
  }, [isAnimating, setState]);

  return { doPassTurn, doRollDice };
}
