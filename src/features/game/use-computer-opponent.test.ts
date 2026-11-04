import type { GameState } from '@/lib/game';
import { act, renderHook } from '@testing-library/react-native';

import { planComputerTurn } from '@/features/game/computer-turn';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';
import { applyMove, getAIMove, getLegalMoves } from '@/lib/game';
import { computerThinkDelayMs } from '@/lib/game/computer-pace';
import { createInitialState } from '@/lib/game/constants';

jest.mock('@/features/game/computer-turn', () => ({ planComputerTurn: jest.fn(), chooseComputerCubeAction: jest.fn() }));
jest.mock('@/lib/game-sfx/play-game-sfx', () => ({ playGameSfx: jest.fn() }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const start: GameState = { ...createInitialState('vs-computer'), currentPlayer: 'black', phase: 'moving', dice: [6, 3], remainingDice: [6, 3] };

function render(level: 'easy' | 'expert') {
  const playMove = jest.fn();
  const view = renderHook(
    ({ state }: { state: GameState }) => useComputerOpponent({
      enabled: true,
      state,
      setState: jest.fn(),
      playMove,
      isAnimating: false,
      moveCount: 4,
      hasRedo: false,
      recordNoMove: jest.fn(),
      level,
    }),
    { initialProps: { state: start } },
  );
  return { ...view, playMove };
}

async function runTimers() {
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
}

it('plays the turn the engine chose for its level, one checker at a time', async () => {
  // A legal turn the heuristic would not pick first.
  const legal = getLegalMoves(start);
  const first = legal[legal.length - 1];
  expect(getAIMove(start)).not.toMatchObject({ from: first.from, to: first.to });
  const afterFirst = applyMove(start, first);
  const second = getLegalMoves(afterFirst)[0];
  jest.mocked(planComputerTurn).mockResolvedValue([
    { ...first, die: start.remainingDice[first.dieIndex] },
    { ...second, die: afterFirst.remainingDice[second.dieIndex] },
  ]);

  const { playMove, rerender } = render('easy');
  await runTimers();
  expect(planComputerTurn).toHaveBeenCalledWith(start, 'easy');
  expect(playMove).toHaveBeenLastCalledWith(start, expect.objectContaining({ from: first.from, to: first.to }), { pace: 'computer' });

  rerender({ state: afterFirst });
  await runTimers();
  // Mid-turn it keeps to the plan instead of asking again.
  expect(planComputerTurn).toHaveBeenCalledTimes(1);
  expect(playMove).toHaveBeenLastCalledWith(afterFirst, expect.objectContaining({ from: second.from, to: second.to }), { pace: 'computer' });
});

it('falls back to the built-in heuristic when the engine cannot answer', async () => {
  jest.mocked(planComputerTurn).mockRejectedValue(new Error('offline'));
  const { playMove } = render('expert');
  await runTimers();
  expect(playMove).toHaveBeenCalledWith(start, getAIMove(start), { pace: 'computer' });
});

it('keeps a planned move whose timer was cancelled, and plays it on resume', async () => {
  const legal = getLegalMoves(start);
  const first = legal[legal.length - 1];
  const afterFirst = applyMove(start, first);
  const nextLegal = getLegalMoves(afterFirst);
  const second = nextLegal[nextLegal.length - 1];
  expect(getAIMove(afterFirst)).not.toMatchObject({ from: second.from, to: second.to });
  jest.mocked(planComputerTurn).mockResolvedValue([
    { ...first, die: start.remainingDice[first.dieIndex] },
    { ...second, die: afterFirst.remainingDice[second.dieIndex] },
  ]);

  const { playMove, rerender, result } = render('easy');
  await runTimers();
  rerender({ state: afterFirst });
  // The second move is scheduled, then cancelled (e.g. leaving the game screen).
  await act(async () => {
    jest.advanceTimersByTime(computerThinkDelayMs('moving'));
  });
  act(() => result.current.clearAITimeout());
  act(() => result.current.resumeAIScheduling());
  await runTimers();
  expect(playMove).toHaveBeenLastCalledWith(afterFirst, expect.objectContaining({ from: second.from, to: second.to }), { pace: 'computer' });
});
