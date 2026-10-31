import type { GameState } from '@/lib/game/types';
import { gameStateToSageBoard, planSageTurnFull } from 'expo-bgsage';
import { createPositionState } from '@/lib/game/create-position';
import { applyMove, getLegalMoves } from '@/lib/game/moves';
import { planSageComputerTurn } from './computer-turn';
import { nextPlannedMove } from './planned-move';

jest.mock('expo-bgsage', () => ({
  ...jest.requireActual('expo-bgsage'),
  planSageTurnFull: jest.fn(),
}));
const analyze = jest.mocked(planSageTurnFull);
function complete(state: GameState, last = false) {
  let end = state;
  while (end.phase === 'moving' && end.currentPlayer === state.currentPlayer) {
    const legal = getLegalMoves(end);
    end = applyMove(end, legal[last ? legal.length - 1 : 0]);
  }
  return gameStateToSageBoard({ ...end, currentPlayer: state.currentPlayer });
}
const state = createPositionState({ useStandardSetup: true, currentPlayer: 'black', dice: [3, 1], mode: 'vs-computer' });

beforeEach(() => analyze.mockReset());

it('selects deterministic ranked candidates at each strength and validates a complete legal turn', async () => {
  const boards = [complete(state), complete(state, true)];
  analyze.mockResolvedValue({ moves: [], equity: 0.4, candidates: boards.map((board, i) => ({ board, equity: 0.4 - i * 0.1 })) });
  for (const [level, expected] of [['easy', 1], ['medium', 1], ['hard', 0]] as const) {
    const moves = await planSageComputerTurn(state, level, () => 0.99);
    let end = state;
    for (const step of moves) {
      const legal = nextPlannedMove(end, [step]);
      expect(legal).not.toBeNull();
      end = applyMove(end, legal!);
    }
    expect(gameStateToSageBoard({ ...end, currentPlayer: state.currentPlayer })).toEqual(boards[expected]);
    expect(end.phase !== 'moving' || end.currentPlayer !== state.currentPlayer).toBe(true);
  }
  expect(analyze).toHaveBeenCalledWith(state, 1);
});

it('skips an unreachable candidate instead of playing illegal moves', async () => {
  analyze.mockResolvedValue({ moves: [], equity: 0.4, candidates: [{ board: Array.from({ length: 26 }, () => 99), equity: 0.4 }, { board: complete(state), equity: 0.3 }] });
  await expect(planSageComputerTurn(state, 'hard')).resolves.toHaveLength(2);
});

it('rejects an empty result so the opponent can fall back', async () => {
  analyze.mockResolvedValue({ moves: [], equity: 0, candidates: [] });
  await expect(planSageComputerTurn(state, 'hard')).rejects.toThrow();
});
