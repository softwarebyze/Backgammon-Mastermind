import type { Dispatch, SetStateAction } from 'react';
import type { GameState, Player } from '@/lib/game';
import { useEffect, useRef } from 'react';
import {
  applyDiceRoll,
  applyMove,
  applyOpeningDieRoll,
  getAIMove,
  rollDice,
  rollOpeningDie,
} from '@/lib/game';

export function useComputerOpponent(
  state: GameState | null,
  setState: Dispatch<SetStateAction<GameState | null>>,
) {
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const delay = state.phase === 'opening-roll' || state.phase === 'rolling' ? 1200 : state.phase === 'moving' ? 1800 : 0;
    if (delay === 0)
      return clearAITimeout;

    aiTimeoutRef.current = setTimeout(() => {
      setState((prev) => {
        if (!prev || prev.currentPlayer !== 'black')
          return prev;

        if (prev.phase === 'opening-roll' || prev.phase === 'rolling') {
          if (prev.phase === 'opening-roll') {
            return applyOpeningDieRoll(prev, rollOpeningDie());
          }
          const dice = rollDice();
          return applyDiceRoll(prev, dice);
        }

        if (prev.phase === 'moving') {
          const move = getAIMove(prev);
          if (!move) {
            return {
              ...prev,
              currentPlayer: 'white' as Player,
              dice: [0, 0] as [number, number],
              remainingDice: [],
              phase: 'rolling' as const,
              selectedPoint: null,
              legalMovesForSelected: [],
            };
          }
          return applyMove(prev, move);
        }

        return prev;
      });
    }, delay);

    return clearAITimeout;
  }, [
    state,
    setState,
  ]);

  return () => {
    if (aiTimeoutRef.current !== null) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  };
}
