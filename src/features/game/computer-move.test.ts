import { getAIMove } from '@/lib/game/ai';
import { createPositionState } from '@/lib/game/create-position';
import { applyMove, getLegalMoves } from '@/lib/game/moves';
import { createComputerMovePlanner } from './computer-move';
import { planSageComputerTurn } from './computer-turn';

jest.mock('./computer-turn', () => ({ planSageComputerTurn: jest.fn() }));
const plan = jest.mocked(planSageComputerTurn);
const state = createPositionState({ useStandardSetup: true, currentPlayer: 'black', dice: [3, 1], mode: 'vs-computer' });

beforeEach(() => plan.mockReset());

it('preserves the existing default without loading Sage', async () => {
  expect(await createComputerMovePlanner()(state, 'classic')).toEqual({ move: getAIMove(state), fallback: false });
  expect(plan).not.toHaveBeenCalled();
});

it('keeps play legal when the engine is disabled or rejects', async () => {
  plan.mockRejectedValue(new Error('engine disabled'));
  const result = await createComputerMovePlanner()(state, 'hard');
  expect(result.fallback).toBe(true);
  expect(getLegalMoves(state)).toContainEqual(result.move);
});

it('reuses only the matching continuation and re-resolves shrinking dice', async () => {
  const first = getLegalMoves(state).find(m => state.remainingDice[m.dieIndex] === 3)!;
  const after = applyMove(state, first);
  const second = getLegalMoves(after)[0];
  plan.mockResolvedValue([{ ...first, die: 3 }, { ...second, die: after.remainingDice[second.dieIndex] }]);
  const choose = createComputerMovePlanner();
  expect((await choose(state, 'hard')).move).toEqual(first);
  expect(await choose(after, 'hard')).toEqual({ move: second, fallback: false });
  expect(plan).toHaveBeenCalledTimes(1);
  // A level change on a partial roll must not reuse the previous level's plan.
  expect((await choose(after, 'easy')).fallback).toBe(true);
  expect(plan).toHaveBeenCalledTimes(1);
});

it('resumes an old partial save legally without asking Sage to replay spent dice', async () => {
  const partial = applyMove(state, getLegalMoves(state)[0]);
  const result = await createComputerMovePlanner()(partial, 'medium');
  expect(result.fallback).toBe(true);
  expect(getLegalMoves(partial)).toContainEqual(result.move);
  expect(plan).not.toHaveBeenCalled();
});

it('discards the continuation after undo or a changed board', async () => {
  const first = getLegalMoves(state)[0];
  plan.mockResolvedValue([{ ...first, die: state.remainingDice[first.dieIndex] }]);
  const choose = createComputerMovePlanner();
  await choose(state, 'hard');
  await choose(state, 'hard');
  expect(plan).toHaveBeenCalledTimes(2);
});
