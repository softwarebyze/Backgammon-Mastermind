import type { Dispatch, SetStateAction } from 'react';
import type { GameState, Move } from '@/lib/game';
import { useCallback, useEffect, useRef, useState } from 'react';

import { applyDiceRoll, applyOpeningDieRoll, getAIMove, passTurn, rollDice, rollOpeningDie } from '@/lib/game';

/**
 * Keeps the AI's first move from starting under the opening-roll ceremony
 * overlay (2400ms hold + 520ms fly in opening-roll-ceremony.tsx).
 */
const OPENING_CEREMONY_GRACE_MS = 3200;

type ComputerOpponentOptions = {
  state: GameState | null;
  setState: Dispatch<SetStateAction<GameState | null>>;
  playMove: (snapshot: GameState, move: Move) => void;
  isAnimating: boolean;
  /** Moves played so far — 0 means the opening ceremony may still be on screen. */
  moveCount: number;
  /** Undo left a redo stack — don't auto-play or the AI wipes redo. */
  hasRedo: boolean;
  recordNoMove: (before: GameState, after: GameState) => void;
};

export type ComputerOpponentControls = {
  clearAITimeout: () => void;
  /** Re-arm AI timers after leave-home cancelled them (same state, no effect deps change). */
  resumeAIScheduling: () => void;
};

/* eslint-disable max-lines-per-function -- AI turn orchestration */
export function useComputerOpponent({
  state,
  setState,
  playMove,
  isAnimating,
  moveCount,
  hasRedo,
  recordNoMove,
}: ComputerOpponentOptions): ComputerOpponentControls {
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Bumped when returning to the game screen so timers re-schedule without a state change.
  const [scheduleGen, setScheduleGen] = useState(0);

  const clearAITimeout = useCallback(() => {
    if (aiTimeoutRef.current !== null) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  }, []);

  const resumeAIScheduling = useCallback(() => {
    setScheduleGen(g => g + 1);
  }, []);

  useEffect(() => {
    clearAITimeout();

    if (!state)
      return clearAITimeout;
    if (state.mode !== 'vs-computer')
      return clearAITimeout;
    if (state.currentPlayer !== 'black')
      return clearAITimeout;
    if (state.phase === 'game-over')
      return clearAITimeout;
    if (isAnimating)
      return clearAITimeout;
    // User undid into a redoable history — wait for redo or a fresh human move.
    if (hasRedo)
      return clearAITimeout;

    const delay
      = state.phase === 'opening-roll' || state.phase === 'rolling'
        ? 1200
        : state.phase === 'no-move'
          ? 1500
          : 0;
    if (delay === 0 && state.phase !== 'moving') {
      return clearAITimeout;
    }

    const runAI = () => {
      const prev = stateRef.current;
      if (!prev || prev.currentPlayer !== 'black')
        return;

      if (prev.phase === 'opening-roll' || prev.phase === 'rolling') {
        setState((current) => {
          if (!current || current.currentPlayer !== 'black')
            return current;
          if (current.phase === 'opening-roll') {
            return applyOpeningDieRoll(current, rollOpeningDie());
          }
          const dice = rollDice();
          return applyDiceRoll(current, dice);
        });
        return;
      }

      if (prev.phase === 'no-move') {
        recordNoMove(prev, prev);
        setState(passTurn(prev));
        return;
      }

      if (prev.phase === 'moving') {
        const move = getAIMove(prev);
        if (!move) {
          recordNoMove(prev, prev);
          setState(passTurn(prev));
          return;
        }
        const moveDelay = moveCount === 0 ? OPENING_CEREMONY_GRACE_MS : 750;
        aiTimeoutRef.current = setTimeout(() => {
          const latest = stateRef.current;
          if (!latest || latest.currentPlayer !== 'black' || latest.phase !== 'moving') {
            return;
          }
          playMove(latest, move);
        }, moveDelay);
      }
    };

    if (delay === 0) {
      runAI();
      return clearAITimeout;
    }

    aiTimeoutRef.current = setTimeout(runAI, delay);

    return clearAITimeout;
  }, [
    state,
    setState,
    playMove,
    isAnimating,
    moveCount,
    hasRedo,
    recordNoMove,
    clearAITimeout,
    scheduleGen,
  ]);

  return { clearAITimeout, resumeAIScheduling };
}
