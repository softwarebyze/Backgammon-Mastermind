import type { Dispatch, SetStateAction } from 'react';
import type { GameState } from '@/lib/game';

import { useCallback } from 'react';
import { getLegalMoves } from '@/lib/game';

export function useGameSelectPoint(
  setState: Dispatch<SetStateAction<GameState | null>>,
  isAnimating: boolean,
) {
  return useCallback((point: number | null) => {
    if (isAnimating) {
      return;
    }
    setState((prev) => {
      if (!prev || prev.phase !== 'moving') {
        return prev;
      }
      if (point === null) {
        return { ...prev, selectedPoint: null, legalMovesForSelected: [] };
      }
      const isBar = point === 0 && prev.bar[prev.currentPlayer] > 0;
      const isOwnPoint
        = point > 0
          && prev.points[point].player === prev.currentPlayer
          && prev.points[point].count > 0;
      if (!isBar && !isOwnPoint) {
        return { ...prev, selectedPoint: null, legalMovesForSelected: [] };
      }
      const legal = getLegalMoves({ ...prev, selectedPoint: point }).filter(
        m => m.from === point,
      );
      if (legal.length === 0) {
        return prev;
      }
      return { ...prev, selectedPoint: point, legalMovesForSelected: legal };
    });
  }, [isAnimating, setState]);
}
