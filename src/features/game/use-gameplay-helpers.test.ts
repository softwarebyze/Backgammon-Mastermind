import type { GameState } from '@/lib/game';
import { createPositionState } from '@/lib/game';
import { createMatch, createMatchGame, offerDouble } from '@/lib/game/match';
import { act, renderHook } from '@/lib/test-utils';
import { useGameplayHelpers } from './use-gameplay-helpers';

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- public hook mock
  useGamePreferences: () => ({ preferences: { autoRoll: true, autoMoveWhenForced: true, confirmMove: false } }),
}));

function rolling(): GameState {
  return createPositionState({ useStandardSetup: true, match: createMatch(5), mode: 'vs-human' });
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

function setup(state: GameState, overrides = {}) {
  const actions = { doRollDice: jest.fn(), doMove: jest.fn(), doMoveSequence: jest.fn(), doPassTurn: jest.fn() };
  const options = { enabled: true, state, isAnimating: false, hasRedo: false, ...actions, ...overrides };
  const utils = renderHook((props: typeof options) => useGameplayHelpers(props), { initialProps: options });
  return { ...utils, actions, options };
}

it.each(['opponent', 'crawford', 'dead', 'opening', 'single'] as const)('auto-rolls when no pre-roll offer exists: %s', (reason) => {
  let state = rolling();
  if (reason === 'opponent')
    state.match!.cube.owner = 'black';
  if (reason === 'crawford')
    state.match!.crawford = true;
  if (reason === 'dead')
    state.match!.score.white = 4;
  if (reason === 'opening')
    state = createMatchGame(5);
  if (reason === 'single')
    delete state.match;
  const { actions } = setup(state);
  act(() => jest.advanceTimersByTime(400));
  expect(actions.doRollDice).toHaveBeenCalledTimes(1);
});

it('preserves the human opportunity to offer', () => {
  const { actions } = setup(rolling());
  act(() => jest.advanceTimersByTime(2000));
  expect(actions.doRollDice).not.toHaveBeenCalled();
});

it.each(['rolling', 'moving', 'no-move'] as const)('pending offers block every helper even in %s phase', (phase) => {
  const state = { ...offerDouble(rolling(), 0), phase, remainingDice: [] };
  const { actions } = setup(state);
  act(() => jest.advanceTimersByTime(2000));
  for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
});

it.each([{ paused: true }, { enabled: false }, { hasRedo: true }, { isAnimating: true }])('cancels a scheduled auto-roll on guard %j (review uses enabled)', (guard) => {
  const state = rolling();
  state.match!.crawford = true;
  const { actions, options, rerender } = setup(state);
  rerender({ ...options, ...guard });
  act(() => jest.advanceTimersByTime(2000));
  expect(actions.doRollDice).not.toHaveBeenCalled();
});

it('leaves computer rolls to AI scheduling', () => {
  const state = { ...rolling(), mode: 'vs-computer' as const, currentPlayer: 'black' as const };
  state.match!.crawford = true;
  const { actions } = setup(state);
  act(() => jest.advanceTimersByTime(2000));
  expect(actions.doRollDice).not.toHaveBeenCalled();
});
