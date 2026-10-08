import type { GameState, Move } from '@/lib/game';
import { useEffect, useRef } from 'react';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { getForcedLegalMove, getForcedTurnSequence } from '@/lib/game/single-move';

const AUTO_ROLL_DELAY_MS = 400;
/** Short anticipation before a forced checker. The slide itself carries the motion. */
const AUTO_MOVE_DELAY_MS = 160;
const AUTO_PASS_DELAY_MS = 500;

function isHumanTurn(state: GameState): boolean {
  return state.mode !== 'vs-computer' || state.currentPlayer === 'white';
}

type Options = {
  enabled: boolean;
  state: GameState | null;
  isAnimating: boolean;
  /** Undo left a redo stack — don't auto-play or a forced move wipes redo. */
  hasRedo: boolean;
  /** Tutor prompt open or verdict pending — hold all automation. */
  paused?: boolean;
  doRollDice: () => void;
  doMove: (move: Move) => void;
  doMoveSequence: (moves: Move[]) => void;
  doPassTurn: () => void;
};

export function useGameplayHelpers({
  enabled,
  state,
  isAnimating,
  hasRedo,
  paused = false,
  doRollDice,
  doMove,
  doMoveSequence,
  doPassTurn,
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

    if (!enabled || !state || isAnimating || hasRedo || paused || state.phase === 'game-over') {
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

    // Spent turn: no-move after a blocked roll, or dice used up while Confirm
    // held the handoff. When Confirm is off (including just toggled off), pass.
    const spentForConfirm = state.phase === 'no-move'
      || (state.phase === 'moving' && state.remainingDice.length === 0);
    if (spentForConfirm) {
      if (preferences.confirmMove) {
        return clear;
      }
      timeoutRef.current = setTimeout(() => {
        doPassTurn();
      }, AUTO_PASS_DELAY_MS);
      return clear;
    }

    if (preferences.autoMoveWhenForced && state.phase === 'moving') {
      const sequence = getForcedTurnSequence(state);
      if (sequence) {
        timeoutRef.current = setTimeout(() => {
          doMoveSequence(sequence);
        }, AUTO_MOVE_DELAY_MS);
        return clear;
      }
      const move = getForcedLegalMove(state);
      if (move) {
        timeoutRef.current = setTimeout(() => {
          doMove(move);
        }, AUTO_MOVE_DELAY_MS);
      }
    }

    return clear;
  }, [
    enabled,
    state,
    isAnimating,
    hasRedo,
    paused,
    preferences.autoRoll,
    preferences.autoMoveWhenForced,
    preferences.confirmMove,
    doRollDice,
    doMove,
    doMoveSequence,
    doPassTurn,
  ]);
}
