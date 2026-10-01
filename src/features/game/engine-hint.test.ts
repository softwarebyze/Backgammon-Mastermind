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
  it('returns the engine plan when it resolves', async () => {
    const engine = fakeEngine('primary', {});

    const hint = await getEngineHint(movingState(), engine);

    expect(hint.engineId).toBe('primary');
    expect(hint.notation).toBe('13/11 · 8/5');
    expect(hint.moves).toHaveLength(2);
  });

  it('throws when the engine is unavailable', async () => {
    const engine = fakeEngine('primary', new Error('engine not linked'));
    await expect(getEngineHint(movingState(), engine)).rejects.toThrow('engine not linked');
  });

  it('throws when the engine returns no moves', async () => {
    const engine = fakeEngine('primary', { moves: [] });
    await expect(getEngineHint(movingState(), engine)).rejects.toThrow('returned no moves');
  });
});

describe('getEngineHint with the real engine', () => {
  it('offers nothing when bgsage is unavailable', async () => {
    // Jest has no native module and no WASM load. That must throw, not
    // answer with a different engine.
    await expect(getEngineHint(movingState())).rejects.toThrow(/bgsage|sage|not linked/i);
  });
});
