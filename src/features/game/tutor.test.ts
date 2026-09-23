import type { TutorTurnAnalysis } from './tutor';

import type { GameState } from '@/lib/game/types';
import { planSageTurnFull } from 'expo-bgsage';

import { createPositionState } from '@/lib/game/create-position';
import { analyzeTutorTurn, judgeTutorTurn, TUTOR_BLUNDER_THRESHOLD } from './tutor';

jest.mock(
  'expo-bgsage',
  () => ({
    planSageTurn: jest.fn(),
    planSageTurnFull: jest.fn(),
  }),
  { virtual: true },
);

const planSageTurnFullMock = jest.mocked(planSageTurnFull);

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

function boardWith(extra: Record<number, number>): number[] {
  const board = Array.from({ length: 26 }, () => 0);
  for (const [index, value] of Object.entries(extra)) {
    board[Number(index)] = value;
  }
  return board;
}

function sampleAnalysis(): TutorTurnAnalysis {
  return {
    key: 'white|3,1',
    player: 'white',
    bestNotation: '13/11 · 8/5',
    bestEquity: 0.2,
    candidates: [
      { board: boardWith({}), equity: 0.2 },
      { board: boardWith({ 5: 1 }), equity: 0.15 },
      { board: boardWith({ 6: 1 }), equity: 0.165 },
    ],
  };
}

describe('analyzeTutorTurn', () => {
  beforeEach(() => {
    planSageTurnFullMock.mockReset();
  });

  it('returns the best move and candidates when the engine resolves', async () => {
    planSageTurnFullMock.mockResolvedValue({
      moves: [
        { from: 13, to: 11, dieIndex: 0 },
        { from: 8, to: 5, dieIndex: 1 },
      ],
      equity: 0.214,
      candidates: [{ board: boardWith({}), equity: 0.214 }],
    });

    const result = await analyzeTutorTurn(movingState());

    expect(result?.key).toBe('white|3,1');
    expect(result?.player).toBe('white');
    expect(result?.bestNotation).toBe('13/11 · 8/5');
    expect(result?.bestEquity).toBe(0.214);
    expect(result?.candidates).toHaveLength(1);
  });

  it('returns null when the engine is unavailable', async () => {
    planSageTurnFullMock.mockRejectedValue(new Error('Bgsage native module is not linked'));
    expect(await analyzeTutorTurn(movingState())).toBeNull();
  });

  it('returns null when the engine reports no usable equity', async () => {
    planSageTurnFullMock.mockResolvedValue({ moves: [], equity: Number.NaN, candidates: [] });
    expect(await analyzeTutorTurn(movingState())).toBeNull();
  });
});

describe('judgeTutorTurn', () => {
  it('stays silent when the player found the best move', () => {
    expect(judgeTutorTurn(sampleAnalysis(), boardWith({}))).toBeNull();
  });

  it('flags a blunder with the equity loss and the better move', () => {
    const verdict = judgeTutorTurn(sampleAnalysis(), boardWith({ 5: 1 }));
    expect(verdict?.bestNotation).toBe('13/11 · 8/5');
    expect(verdict?.loss).toBeCloseTo(0.05, 5);
    expect(verdict!.loss).toBeGreaterThanOrEqual(TUTOR_BLUNDER_THRESHOLD);
  });

  it('stays silent below the blunder threshold', () => {
    // 0.2 - 0.165 = 0.035 < 0.05
    expect(judgeTutorTurn(sampleAnalysis(), boardWith({ 6: 1 }))).toBeNull();
  });

  it('stays silent when the played board is not among the candidates', () => {
    expect(judgeTutorTurn(sampleAnalysis(), boardWith({ 7: 3 }))).toBeNull();
  });

  it('pins the blunder threshold at 0.05 equity points', () => {
    expect(TUTOR_BLUNDER_THRESHOLD).toBe(0.05);
  });
});
