import { createPositionState, getLegalMoves } from '@/lib/game';
import { patchGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { computerThinkDelayMs } from '@/lib/game/computer-pace';
import { createMatch } from '@/lib/game/match';
import { clearActiveGame, loadPersistedSession } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';
import { useGameProviderValue } from './use-game-provider-value';

jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn().mockReturnValue({ capture: jest.fn() }) }));

beforeEach(() => {
  jest.useFakeTimers();
  clearActiveGame();
  patchGamePreferences({ autoRoll: false });
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
function position() {
  return createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(0) });
}

it.each(['pending', 'accept', 'drop'] as const)('undoes a %s double from setup and redoes the exact decision', (answer) => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const initial = position();
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.matchAction!('offer'));
  if (answer !== 'pending')
    act(() => result.current.matchAction!(answer));
  const after = result.current.state;
  const events = result.current.cubeEvents;
  expect(result.current.canUndo).toBe(true);
  act(() => result.current.doUndo());
  expect(result.current.state).toEqual(initial);
  expect(result.current.cubeEvents).toEqual([]);
  expect(result.current.moveLog).toEqual([]);
  expect(result.current.canRedo).toBe(true);
  expect(loadPersistedSession()?.state).toEqual(initial);
  expect(loadPersistedSession()?.cubeEvents).toEqual([]);
  act(() => result.current.doRedo());
  expect(result.current.state).toEqual(after);
  expect(result.current.cubeEvents).toEqual(events);
  expect(result.current.canUndo).toBe(true);
});

it('restores a pending offer from disk and can still undo it', () => {
  let view = renderHook(() => useGameProviderValue(true));
  const initial = position();
  act(() => view.result.current.startFromPosition(initial));
  act(() => view.result.current.matchAction!('offer'));
  view.unmount();
  view = renderHook(() => useGameProviderValue(true));
  expect(view.result.current.canUndo).toBe(true);
  act(() => view.result.current.doUndo());
  expect(view.result.current.state).toEqual(initial);
  view.unmount();
  view = renderHook(() => useGameProviderValue(true));
  expect(view.result.current.state).toEqual(initial);
  expect(view.result.current.cubeEvents).toEqual([]);
});

it('can undo after a taken double and a revealed roll, before playing a checker', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const initial = position();
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.matchAction!('offer'));
  act(() => result.current.matchAction!('accept'));
  act(() => result.current.doRollDice());
  const rolled = result.current.state;
  expect(rolled?.phase).toBe('moving');
  act(() => result.current.doUndo());
  expect(result.current.state).toEqual(initial);
  act(() => result.current.doRedo());
  expect(result.current.state).toEqual(rolled);
});

it('undoes checker moves before the double, without leaving stale cube history', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const initial = position();
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.matchAction!('offer'));
  act(() => result.current.matchAction!('accept'));
  act(() => result.current.doRollDice());
  act(() => result.current.doMove(getLegalMoves(result.current.state!)[0]!));
  act(() => result.current.moveAnimation?.onFinish?.());
  expect(result.current.moveLog).toHaveLength(1);
  const moved = result.current.state;
  act(() => result.current.doUndo());
  act(() => result.current.moveAnimation?.onFinish?.());
  expect(result.current.moveLog).toHaveLength(0);
  expect(result.current.state?.match?.cube.value).toBe(2);
  act(() => result.current.doUndo());
  expect(result.current.state).toEqual(initial);
  expect(result.current.cubeEvents).toHaveLength(0);
  act(() => result.current.doRedo());
  expect(result.current.state?.match?.cube.value).toBe(2);
  act(() => result.current.doRedo());
  act(() => result.current.moveAnimation?.onFinish?.());
  expect(result.current.moveLog).toHaveLength(1);
  expect(result.current.state).toEqual(moved);
});

it.each(['roll', 'double', 'new game'] as const)('can choose %s instead of redo, discarding the abandoned future', (branch) => {
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(position()));
  act(() => result.current.matchAction!('offer'));
  act(() => result.current.doUndo());
  if (branch === 'roll')
    act(() => result.current.doRollDice());
  if (branch === 'double')
    act(() => result.current.matchAction!('offer'));
  if (branch === 'new game')
    act(() => result.current.startFromPosition(position()));
  expect(result.current.canRedo).toBe(false);
  const state = result.current.state;
  act(() => result.current.doRedo());
  expect(result.current.state).toEqual(state);
});

it('cancels the computer response on Undo and holds automation until the player chooses', () => {
  patchGamePreferences({ autoRoll: true });
  const { result } = renderHook(() => useGameProviderValue(true));
  const initial = { ...position(), mode: 'vs-computer' as const };
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.matchAction!('offer'));
  act(() => result.current.doUndo());
  act(() => jest.advanceTimersByTime(10000));
  expect(result.current.state).toEqual(initial);
  act(() => result.current.doRedo());
  act(() => jest.advanceTimersByTime(computerThinkDelayMs('rolling')));
  expect(result.current.state?.match?.cube.value).toBe(2);
  act(() => result.current.doUndo());
  expect(result.current.state).toEqual(initial);
});

it('takes back the human answer to a computer offer so a different answer is playable', () => {
  const initial = createPositionState({ placements: [{ point: 21, player: 'black', count: 15 }, { point: 6, player: 'white', count: 15 }], currentPlayer: 'black', mode: 'vs-computer', match: createMatch(0) });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  act(() => jest.advanceTimersByTime(computerThinkDelayMs('rolling')));
  expect(result.current.state?.match?.pendingOffer).toBe('black');
  act(() => result.current.matchAction!('accept'));
  act(() => result.current.doUndo());
  expect(result.current.state?.match?.pendingOffer).toBe('black');
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer']);
  act(() => result.current.matchAction!('drop'));
  expect(result.current.state?.match?.result).toMatchObject({ winner: 'black', points: 1, kind: 'drop' });
  expect(result.current.canRedo).toBe(false);
});
