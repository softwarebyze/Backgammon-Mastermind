import type { GameState, Move } from './types';
import { applyMove, getLegalMoves } from './moves';

/** True when exactly one distinct legal move exists (no real choice). */
export function hasExactlyOneLegalMove(state: GameState): boolean {
  if (state.phase !== 'moving') {
    return false;
  }
  return getLegalMoves(state).length === 1;
}

export function getForcedLegalMove(state: GameState): Move | null {
  if (!hasExactlyOneLegalMove(state)) {
    return null;
  }
  return getLegalMoves(state)[0] ?? null;
}

function boardKey(state: GameState): string {
  const points = state.points
    .map((p, i) => (p.count > 0 ? `${i}:${p.player?.[0] ?? ''}${p.count}` : ''))
    .filter(Boolean)
    .join('|');
  return `${points};b${state.bar.white},${state.bar.black};o${state.borneOff.white},${state.borneOff.black}`;
}

/**
 * When every complete way to spend the dice ends on the same board, return one
 * forced sequence (e.g. bear off 6 and 3 with dice 6·3 — two first moves, one outcome).
 */
export function getForcedTurnSequence(state: GameState): Move[] | null {
  if (state.phase !== 'moving' || state.remainingDice.length === 0) {
    return null;
  }

  type Node = { state: GameState; moves: Move[] };
  const terminals: { key: string; moves: Move[] }[] = [];
  const queue: Node[] = [{ state, moves: [] }];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    const legal = getLegalMoves(node.state);
    if (legal.length === 0 || node.state.phase !== 'moving') {
      terminals.push({ key: boardKey(node.state), moves: node.moves });
      continue;
    }

    for (const move of legal) {
      const nextState = applyMove(node.state, move);
      const moves = [...node.moves, move];
      if (nextState.phase !== 'moving' || nextState.remainingDice.length === 0) {
        terminals.push({ key: boardKey(nextState), moves });
        continue;
      }
      const key = `${boardKey(nextState)}:${nextState.remainingDice.join(',')}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      queue.push({ state: nextState, moves });
    }
  }

  if (terminals.length === 0) {
    return null;
  }
  const firstKey = terminals[0]!.key;
  if (!terminals.every(t => t.key === firstKey)) {
    return null;
  }
  // Single first-move case is already handled by getForcedLegalMove.
  if (terminals[0]!.moves.length <= 1) {
    return null;
  }
  return terminals[0]!.moves;
}
