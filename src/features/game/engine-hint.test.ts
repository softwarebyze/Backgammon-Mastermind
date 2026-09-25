import type { EngineTurnPlan, GameEngine } from './engine/types';
import type { GameState, Move } from '@/lib/game/types';

import { createPositionState } from '@/lib/game/create-position';
import { getEngineHint } from './engine-hint';

/** White to move with 3-1 from a midgame-ish position. */
function movingState(): GameState {
  return createPositionState({
    currentPlayer: 'white',
    mode: 'vs-computer',
    dice: [3, 1],
    placements: [
      { point: 24, player: 'white', count: 2 },
      { point: 13, player: 'white', count: 5 },
      { point: 8, player: 'white', count: 3 },
      { point: 6, player: 'white', count: 5 },
      { point: 1, player: 'black', count: 2 },
      { point: 12, player: 'black', count: 5 },
      { point: 17, player: 'black', count: 3 },
      { point: 19, player: 'black', count: 5 },
    ],
  });
}

const PLANNED_MOVES: Move[] = [
  { from: 13, to: 11, dieIndex: 0 },
  { from: 8, to: 5, dieIndex: 1 },
];

function fakeEngine(id: string, plan: Partial<EngineTurnPlan> | Error): GameEngine {
  return {
    id,
    planTurn: jest.fn(async () => {
      if (plan instanceof Error)
        throw plan;
      return {
        moves: PLANNED_MOVES,
        equity: 0.214,
        candidates: [{ board: [], equity: 0.214 }],
        ...plan,
      };
    }),
    boardAfterTurn: jest.fn(() => []),
  };
}

describe('getEngineHint', () => {
  it('returns the first engine\u2019s plan when it resolves', async () => {
    const primary = fakeEngine('primary', {});
    const fallback = fakeEngine('fallback', {});

    const hint = await getEngineHint(movingState(), [primary, fallback]);

    expect(hint.engineId).toBe('primary');
    expect(hint.notation).toBe('13/11 · 8/5');
    expect(hint.moves).toHaveLength(2);
    expect(fallback.planTurn).not.toHaveBeenCalled();
  });

  it('falls back to the next engine when the first is unavailable', async () => {
    const primary = fakeEngine('primary', new Error('engine not linked'));
    const fallback = fakeEngine('fallback', {});

    const hint = await getEngineHint(movingState(), [primary, fallback]);

    expect(hint.engineId).toBe('fallback');
    expect(hint.moves).toHaveLength(2);
  });

  it('skips an engine that returns no moves and tries the next', async () => {
    const primary = fakeEngine('primary', { moves: [] });
    const fallback = fakeEngine('fallback', {});

    const hint = await getEngineHint(movingState(), [primary, fallback]);

    expect(hint.engineId).toBe('fallback');
  });

  it('throws when every engine fails', async () => {
    const broken = fakeEngine('broken', new Error('nope'));
    await expect(getEngineHint(movingState(), [broken])).rejects.toThrow('nope');
  });

  it('throws when no engine has a legal move to suggest', async () => {
    const empty = fakeEngine('empty', { moves: [] });
    await expect(getEngineHint(movingState(), [empty])).rejects.toThrow();
  });
});

describe('getEngineHint with the real engines', () => {
  it('falls back to the heuristic engine when bgsage is unavailable', async () => {
    // In Jest the native module is not linked, so the primary engine throws
    // and the built-in heuristic answers — no mocks needed.
    const hint = await getEngineHint(movingState());
    expect(hint.engineId).toBe('heuristic');
    expect(hint.moves.length).toBeGreaterThan(0);
    // Both dice of the 3-1 should be consumed by the suggested turn.
    expect(hint.moves).toHaveLength(2);
    expect(hint.notation).toMatch(/\d+\/\d+ · \d+\/\d+/);
  });

  it('throws when there is nothing legal to suggest', async () => {
    const blocked = createPositionState({
      currentPlayer: 'white',
      mode: 'vs-computer',
      dice: [6, 6],
      placements: [
        // White has a checker on the bar; black holds every white entry
        // point. White enters at 25 - die, i.e. points 19..24 (NOT 1..6 —
        // blocking 1..6 leaves the position wide open).
        { point: 19, player: 'black', count: 2 },
        { point: 20, player: 'black', count: 2 },
        { point: 21, player: 'black', count: 2 },
        { point: 22, player: 'black', count: 2 },
        { point: 23, player: 'black', count: 2 },
        { point: 24, player: 'black', count: 2 },
      ],
      bar: { white: 1 },
    });
    await expect(getEngineHint(blocked)).rejects.toThrow();
  });
});
