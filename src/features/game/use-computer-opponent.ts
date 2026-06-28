import type { Dispatch, SetStateAction } from 'react';
import type { GameState, Move } from '@/lib/game';
import { useEffect, useRef } from 'react';

import { applyDiceRoll, applyOpeningDieRoll, getAIMove, passTurn, rollDice, rollOpeningDie } from '@/lib/game';

type ComputerOpponentOptions = {
  state: GameState | null;
  setState: Dispatch<SetStateAction<GameState | null>>;
  playMove: (snapshot: GameState, move: Move) => void;
  isAnimating: boolean;
};

export function useComputerOpponent({
  state,
  setState,
  playMove,
  isAnimating,
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
        setState(passTurn(prev));
        return;
      }

      if (prev.phase === 'moving') {
        const move = getAIMove(prev);
        if (!move) {
          setState(passTurn(prev));
          return;
        }
        aiTimeoutRef.current = setTimeout(() => {
          const latest = stateRef.current;
          if (!latest || latest.currentPlayer !== 'black' || latest.phase !== 'moving') {
            return;
          }
          playMove(latest, move);
        }, 750);
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
  ]);

  return () => {
    if (aiTimeoutRef.current !== null) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  };
}
