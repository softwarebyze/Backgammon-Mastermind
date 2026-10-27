import type { ComputerLevel } from './engine/sage-difficulty';
import type { GameState, Move } from '@/lib/game/types';
import { getAIMove } from '@/lib/game/ai';
import { applyMove } from '@/lib/game/moves';
import { planSageComputerTurn } from './computer-turn';
import { nextPlannedMove } from './planned-move';

function positionKey(state: GameState): string {
  return JSON.stringify([state.points, state.bar, state.borneOff, state.currentPlayer, state.dice, state.remainingDice, state.phase]);
}

/** Cache only the exact continuation; undo, a new roll, or a level change invalidates it. */
export function createComputerMovePlanner() {
  let cached: { key: string; level: ComputerLevel; moves: Move[] } | null = null;
  return async (state: GameState, level: ComputerLevel): Promise<{ move: Move | null; fallback: boolean }> => {
    if (level === 'classic') {
      cached = null;
      return { move: getAIMove(state), fallback: false };
    }
    try {
      let moves: Move[];
      if (cached?.key === positionKey(state) && cached.level === level) {
        moves = cached.moves;
      }
      else {
        // Sage analyzes full rolls. A resumed/undone partial turn safely uses Classic.
        const fullCount = state.dice[0] === state.dice[1] ? 4 : 2;
        if (state.remainingDice.length !== fullCount)
          throw new Error('partial turn');
        moves = await planSageComputerTurn(state, level);
      }
      const move = nextPlannedMove(state, moves);
      if (!move)
        throw new Error('no legal continuation');
      cached = { key: positionKey(applyMove(state, move)), level, moves: moves.slice(1) };
      return { move, fallback: false };
    }
    catch {
      cached = null;
      return { move: getAIMove(state), fallback: true };
    }
  };
}
