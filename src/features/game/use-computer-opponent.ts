import type { Dispatch, SetStateAction } from 'react';
import type { GameState, Move } from '@/lib/game';
import { useEffect, useRef } from 'react';

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
  recordNoMove: (before: GameState, after: GameState) => void;
};

/* eslint-disable max-lines-per-function -- AI turn orchestration */
export function useComputerOpponent({
  state,
  setState,
  playMove,
  isAnimating,
  moveCount,
  recordNoMove,
}: ComputerOpponentOptions) {
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const clearAITimeout = () => {
      if (aiTimeoutRef.current !== null) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };

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
      if (state.phase === 'moving') {
        runAI();
        return clearAITimeout;
      }
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
    recordNoMove,
  ]);

  return () => {
    if (aiTimeoutRef.current !== null) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  };
}
