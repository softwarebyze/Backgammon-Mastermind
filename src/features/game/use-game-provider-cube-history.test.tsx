import type { GameState } from '@/lib/game';
import { createPositionState, getLegalMoves } from '@/lib/game';
import { createMatch } from '@/lib/game/match';
import { stateAtPly } from '@/lib/game/move-replay';
import { clearActiveGame, loadPersistedSession } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';
import { GameContext } from './game-context';
import { useGameProviderValue } from './use-game-provider-value';
import { useMoveReview } from './use-move-review';

jest.mock('posthog-react-native', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- public hook mock
  usePostHog: () => ({ capture: jest.fn() }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  clearActiveGame();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

function board(): GameState {
  return createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(5) });
}

it.each(['accept', 'drop'] as const)('persists offer + %s without manufacturing checker plies, cold restores and reviews exact states', (answer) => {
  let utils = renderHook(() => useGameProviderValue(true));
  act(() => utils.result.current.startFromPosition(board()));
  act(() => utils.result.current.matchAction!('offer'));
  expect(utils.result.current.moveLog).toHaveLength(0);
  expect(utils.result.current.cubeEvents).toHaveLength(1);
  utils.unmount();
  utils = renderHook(() => useGameProviderValue(true));
  expect(utils.result.current.state?.match?.pendingOffer).toBe('white');
  act(() => utils.result.current.matchAction!(answer));
  const live = utils.result.current.state!;
  expect(utils.result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer', answer]);
  expect(loadPersistedSession()?.cubeEvents).toHaveLength(2);
  utils.unmount();
  utils = renderHook(() => useGameProviderValue(true));
  expect(utils.result.current.state).toEqual(live);
  expect(utils.result.current.moveLog).toHaveLength(0);
  expect(utils.result.current.canUndo).toBe(false);
  const view = renderHook(() => useMoveReview({ liveState: live, moveLog: [], replayBaseline: utils.result.current.replayBaseline }), {
    wrapper: ({ children }) => <GameContext value={utils.result.current}>{children}</GameContext>,
  });
  act(() => view.result.current.jumpToCubeEvent(1));
  expect(view.result.current.isReviewing).toBe(true);
  expect(view.result.current.displayState?.match?.pendingOffer).toBe('white');
  expect(view.result.current.displayState?.match?.score.white).toBe(0);
  expect(utils.result.current.state).toEqual(live);
  act(() => view.result.current.jumpToCubeEvent(2));
  expect(view.result.current.displayState).toEqual(live);
  act(() => view.result.current.goLive());
  expect(view.result.current.isReviewing).toBe(false);
});

it('keeps pre-cube baseline and accepted cube through checker undo/redo', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(board()));
  act(() => result.current.matchAction!('offer'));
  act(() => result.current.matchAction!('accept'));
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.2);
  act(() => result.current.doRollDice());
  random.mockRestore();
  act(() => result.current.doMove(getLegalMoves(result.current.state!)[0]!));
  act(() => result.current.moveAnimation?.onFinish?.());
  expect(result.current.moveLog).toHaveLength(1);
  expect(result.current.replayBaseline?.match?.cube.value).toBe(1);
  expect(stateAtPly(result.current.replayBaseline!, result.current.moveLog, 1).match?.cube.value).toBe(2);
  act(() => result.current.doUndo());
  act(() => result.current.moveAnimation?.onFinish?.());
  expect(result.current.state?.match?.cube.value).toBe(2);
  expect(result.current.cubeEvents).toHaveLength(2);
  expect(result.current.canUndo).toBe(false);
  act(() => result.current.doRedo());
  act(() => result.current.moveAnimation?.onFinish?.());
  expect(result.current.moveLog).toHaveLength(1);
  expect(result.current.cubeEvents).toHaveLength(2);
});

it('review cancels human auto-roll and rejects retained roll/pass/cube actions until Live', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const state = board();
  state.match!.cube.owner = 'black';
  act(() => result.current.startFromPosition(state));
  const retainedRoll = result.current.doRollDice;
  act(() => result.current.setReviewing!(true));
  const before = result.current.state;
  act(() => retainedRoll());
  act(() => result.current.doPassTurn());
  act(() => result.current.matchAction!('offer'));
  act(() => jest.advanceTimersByTime(1000));
  expect(result.current.state).toBe(before);
  act(() => result.current.setReviewing!(false));
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.2);
  act(() => jest.advanceTimersByTime(400));
  random.mockRestore();
  expect(result.current.state?.phase).toBe('moving');
});

it('records a binding action only once when the same callback fires twice in a batch', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(board()));
  act(() => {
    result.current.matchAction!('offer');
    result.current.matchAction!('offer');
  });
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer']);
  act(() => {
    result.current.matchAction!('accept');
    result.current.matchAction!('accept');
  });
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer', 'accept']);
  expect(result.current.state?.match?.cube.value).toBe(2);
});

it('rejects a retained cube action after entering review without changing the live board', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(board()));
  const retainedOffer = result.current.matchAction!;
  act(() => result.current.setReviewing!(true));
  const before = result.current.state;
  act(() => retainedOffer('offer'));
  expect(result.current.state).toBe(before);
  expect(result.current.cubeEvents).toHaveLength(0);
});
