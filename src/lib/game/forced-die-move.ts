import type { GameState, Move } from './types';
import { applyMove, getLegalMoves } from './moves';

type Continuations = { required: Set<string>; outcomes: Set<string> };

function positionKey(state: GameState): string {
  return JSON.stringify([state.points, state.bar, state.borneOff]);
}

function moveKey(move: Move): string {
  return `${move.from}/${move.to}/${move.die}`;
}

/** Intersect actions across every legal continuation, preserving all terminal boards. */
function summarize(state: GameState, context: {
  budget: number;
  memo: Map<string, Continuations>;
}): Continuations | null {
  const board = positionKey(state);
  const key = `${board}:${state.currentPlayer}:${state.phase}:${state.remainingDice.join(',')}`;
  const cached = context.memo.get(key);
  if (cached) {
    return cached;
  }
  if (--context.budget < 0) {
    return null;
  }
  const legal = state.phase === 'moving' ? getLegalMoves(state) : [];
  if (legal.length === 0) {
    return { required: new Set(), outcomes: new Set([board]) };
  }
  let required: Set<string> | null = null;
  const outcomes = new Set<string>();
  for (const move of legal) {
    const child = summarize(applyMove(state, move), context);
    if (!child) {
      return null;
    }
    const branch = new Set(child.required);
    branch.add(moveKey(move));
    if (required === null) {
      required = branch;
    }
    else {
      for (const action of required) {
        if (!branch.has(action)) {
          required.delete(action);
        }
      }
    }
    for (const outcome of child.outcomes) {
      outcomes.add(outcome);
    }
  }
  const result = { required: required ?? new Set<string>(), outcomes };
  context.memo.set(key, result);
  return result;
}

/**
 * A die can be mandatory even when the other die has choices. Never auto-play
 * merely because that die currently has one legal origin: an optional move
 * first may change it. Require the action in every continuation and prove that
 * playing it now preserves every final board available to the player.
 */
export function getForcedDieMove(state: GameState): Move | null {
  if (state.phase !== 'moving') {
    return null;
  }
  const legal = getLegalMoves(state);
  const candidates = legal.filter(move => legal.filter(other => other.die === move.die).length === 1);
  if (!candidates.length) {
    return null;
  }
  const context = { budget: 2000, memo: new Map<string, Continuations>() };
  const all = summarize(state, context);
  if (!all) {
    return null;
  }
  for (const move of candidates) {
    if (!all.required.has(moveKey(move))) {
      continue;
    }
    const after = summarize(applyMove(state, move), context);
    if (after && all.outcomes.size === after.outcomes.size && [...all.outcomes].every(key => after.outcomes.has(key))) {
      return move;
    }
  }
  return null;
}
