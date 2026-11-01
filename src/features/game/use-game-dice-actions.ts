import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '@/lib/game';
import { useCallback, useRef } from 'react';

import {
  applyDiceRoll,
  applyOpeningDieRoll,
  passTurn,
  rollDice,
  rollOpeningDie,
} from '@/lib/game';
import { playGameSfx } from '@/lib/game-sfx/play-game-sfx';

/**
 * The no-move state shows as soon as the dice land, so the cue follows almost
 * at once; the short gap only keeps it from stepping on the roll sound.
 */
export const BLOCKED_SFX_DELAY_MS = 150;

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
    if (isAnimating || !state) {
      return;
    }
    if (state.mode === 'vs-computer' && state.currentPlayer === 'black') {
      return;
    }
    const awaitingConfirm = state.phase === 'no-move'
      || (state.phase === 'moving' && state.remainingDice.length === 0);
    if (!awaitingConfirm) {
      return;
    }
    // Snapshot before pass so history keeps the blocked roll.
    if (state.phase === 'no-move') {
      recordNoMove(state, state);
    }
    setState(passTurn(state));
  }, [isAnimating, recordNoMove, setState, state]);

  // The state a roll was last taken from, so a double tap can't roll twice.
  const rolledFrom = useRef<GameState | null>(null);
  const doRollDice = useCallback(() => {
    if (isAnimating || !state || rolledFrom.current === state) {
      return;
    }
    const rolled = rollFrom(state);
    if (!rolled) {
      return;
    }
    rolledFrom.current = state;
    setState(rolled.next);
    // Sounds play here, once per roll: React may run a state updater twice.
    if (rolled.withSound) {
      playGameSfx('roll');
    }
    if (rolled.next.phase === 'no-move') {
      // After the dice land, a soft "err err" says this roll can't be played.
      setTimeout(() => playGameSfx('blocked'), BLOCKED_SFX_DELAY_MS);
    }
  }, [isAnimating, setState, state]);

  return { doPassTurn, doRollDice };
}

/** The state after the human rolls from `prev`, or null when it isn't theirs to roll. */
function rollFrom(prev: GameState): { next: GameState; withSound: boolean } | null {
  if (prev.mode === 'vs-computer' && prev.currentPlayer === 'black') {
    return null;
  }
  if (prev.phase === 'opening-roll') {
    const { white, black } = prev.openingRolls;
    // Ceremony dismisses a shown tie by calling roll — clear without a new die.
    if (white !== null && black !== null && white === black) {
      return { next: { ...prev, openingRolls: { white: null, black: null }, currentPlayer: 'white' }, withSound: false };
    }
    return { next: applyOpeningDieRoll(prev, rollOpeningDie()), withSound: true };
  }
  if (prev.phase !== 'rolling') {
    return null;
  }
  return { next: applyDiceRoll(prev, rollDice()), withSound: true };
}
