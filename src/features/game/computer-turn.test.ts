import type { CubeAnalysis } from './cube-analysis';
import type { GameEngine } from './engine';
import type { GameState } from '@/lib/game';

import { createInitialState } from '@/lib/game/constants';
import { chooseComputerCubeAction, planComputerTurn } from './computer-turn';

const best = [{ from: 24, to: 18, dieIndex: 0 }, { from: 13, to: 10, dieIndex: 1 }];
const second = [{ from: 13, to: 7, dieIndex: 0 }, { from: 13, to: 10, dieIndex: 1 }];

function fakeEngine() {
  const engine = {
    id: 'fake',
    planTurn: jest.fn(async () => ({
      moves: best,
      equity: 0.1,
      candidates: [{ board: [1], equity: 0.1 }, { board: [2], equity: -0.5 }],
    })),
    movesToCandidate: jest.fn(() => second),
    boardAfterTurn: () => [],
  };
  return engine as typeof engine & GameEngine;
}

const state: GameState = { ...createInitialState('vs-computer'), currentPlayer: 'black', phase: 'moving', dice: [6, 3], remainingDice: [6, 3] };

describe('planComputerTurn', () => {
  it('plays the engine\'s best turn at expert, two plies deep', async () => {
    const engine = fakeEngine();
    const moves = await planComputerTurn(state, 'expert', { engine, random: () => 0.5 });
    expect(engine.planTurn).toHaveBeenCalledWith(state, { ply: 2 });
    expect(engine.movesToCandidate).not.toHaveBeenCalled();
    // Each move carries its die, so the plan survives the dice shrinking as it plays.
    expect(moves).toEqual([{ ...best[0], die: 6 }, { ...best[1], die: 3 }]);
  });

  it('looks one ply deep at easy and can play a worse candidate', async () => {
    const engine = fakeEngine();
    // Noise that lifts the second candidate above the first.
    const draws = [0.99, 0.5, 0.0001, 0];
    const moves = await planComputerTurn(state, 'easy', { engine, random: () => draws.shift() ?? 0.5 });
    expect(engine.planTurn).toHaveBeenCalledWith(state, { ply: 1 });
    expect(engine.movesToCandidate).toHaveBeenCalledWith(state, { board: [2], equity: -0.5 });
    expect(moves.map(m => m.from)).toEqual([13, 13]);
  });

  it('passes on an engine failure so the caller can fall back', async () => {
    const engine = fakeEngine();
    engine.planTurn.mockRejectedValueOnce(new Error('offline'));
    await expect(planComputerTurn(state, 'medium', { engine })).rejects.toThrow('offline');
  });
});

describe('chooseComputerCubeAction', () => {
  const analysis: CubeAnalysis = { actor: 'black', best: 'accept', values: { accept: -0.4, drop: -1 } };

  it('follows the engine at expert', () => {
    expect(chooseComputerCubeAction(analysis, 'expert', () => 0.5)).toBe('accept');
  });

  it('can misjudge a close cube decision at easy', () => {
    const close: CubeAnalysis = { actor: 'black', best: 'accept', values: { accept: -0.98, drop: -1 } };
    const draws = [0.999, 0.5, 0.0001, 0];
    expect(chooseComputerCubeAction(close, 'easy', () => draws.shift() ?? 0.5)).toBe('drop');
  });
});
