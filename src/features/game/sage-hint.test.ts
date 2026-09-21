import { createPositionState } from '@/lib/game/create-position';
import type { GameState } from '@/lib/game/types';

import { formatHintNotation, getSageHint } from './sage-hint';

jest.mock(
  'expo-bgsage',
  () => ({
    planSageTurn: jest.fn(),
  }),
  { virtual: true },
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { planSageTurn } = require('expo-bgsage') as { planSageTurn: jest.Mock };

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

describe('formatHintNotation', () => {
  it('formats app-coordinate moves', () => {
    expect(formatHintNotation([{ from: 13, to: 11 }, { from: 8, to: 5 }])).toBe('13/11 · 8/5');
  });

  it('labels bar and bear-off', () => {
    expect(formatHintNotation([{ from: 0, to: 20 }, { from: 6, to: 25 }])).toBe('bar/20 · 6/off');
  });
});

describe('getSageHint', () => {
  beforeEach(() => {
    planSageTurn.mockReset();
  });

  it('returns the engine plan when sage resolves', async () => {
    planSageTurn.mockResolvedValue([
      { from: 13, to: 11, dieIndex: 0 },
      { from: 8, to: 5, dieIndex: 1 },
    ]);
    const hint = await getSageHint(movingState());
    expect(hint.engine).toBe('sage');
    expect(hint.notation).toBe('13/11 · 8/5');
    expect(hint.moves).toHaveLength(2);
  });

  it('falls back to the heuristic AI when the engine is unavailable', async () => {
    planSageTurn.mockRejectedValue(new Error('Bgsage native module is not linked'));
    const hint = await getSageHint(movingState());
    expect(hint.engine).toBe('heuristic');
    expect(hint.moves.length).toBeGreaterThan(0);
    // Both dice of the 3-1 should be consumed by the suggested turn.
    expect(hint.moves).toHaveLength(2);
    expect(hint.notation).toMatch(/\d+\/\d+ · \d+\/\d+/);
  });

  it('throws when there is nothing legal to suggest', async () => {
    planSageTurn.mockRejectedValue(new Error('nope'));
    const blocked = createPositionState({
      currentPlayer: 'white',
      mode: 'vs-computer',
      dice: [6, 6],
      placements: [
        // White has a checker on the bar; black holds every entry point.
        { point: 1, player: 'black', count: 2 },
        { point: 2, player: 'black', count: 2 },
        { point: 3, player: 'black', count: 2 },
        { point: 4, player: 'black', count: 2 },
        { point: 5, player: 'black', count: 2 },
        { point: 6, player: 'black', count: 2 },
      ],
      bar: { white: 1 },
    });
    await expect(getSageHint(blocked)).rejects.toThrow();
  });
});
