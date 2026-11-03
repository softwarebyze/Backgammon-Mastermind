import { createPositionState, getLegalMoves } from '@/lib/game';
import { patchGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { computerThinkDelayMs } from '@/lib/game/computer-pace';
import { createMatch } from '@/lib/game/match';
import { clearActiveGame, loadPersistedSession } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';
import { analyzeCubeDecision } from './cube-analysis';
import { useGameProviderValue } from './use-game-provider-value';

jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn().mockReturnValue({ capture: jest.fn() }) }));

jest.mock('./cube-analysis', () => ({ analyzeCubeDecision: jest.fn() }));
beforeEach(() => {
  jest.useFakeTimers();
  clearActiveGame();
  patchGamePreferences({ autoRoll: false, tutorMode: false });
  jest.mocked(analyzeCubeDecision).mockImplementation(async state => ({ actor: 'black', best: state.match?.pendingOffer ? 'accept' : 'offer', values: {} }));
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
  const offered = result.current.state;
  if (answer !== 'pending')
    act(() => result.current.matchAction!(answer));
  const after = result.current.state;
  const events = result.current.cubeEvents;
  expect(result.current.canUndo).toBe(true);
  act(() => result.current.doUndo());
  const expected = answer === 'pending' ? initial : offered;
  expect(result.current.state).toEqual(expected);
  expect(result.current.cubeEvents).toHaveLength(answer === 'pending' ? 0 : 1);
  expect(result.current.moveLog).toEqual([]);
  expect(result.current.canRedo).toBe(true);
  expect(loadPersistedSession()?.state).toEqual(expected);
  expect(loadPersistedSession()?.cubeEvents).toEqual(result.current.cubeEvents);
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
  expect(result.current.state?.match?.pendingOffer).toBe('white');
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer']);
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
  expect(result.current.state?.match?.pendingOffer).toBe('white');
  expect(result.current.cubeEvents).toHaveLength(1);
  act(() => result.current.doUndo());
  expect(result.current.state).toEqual(initial);
  expect(result.current.cubeEvents).toHaveLength(0);
  act(() => result.current.doRedo());
  expect(result.current.state?.match?.pendingOffer).toBe('white');
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

it('cancels the computer response on Undo and holds automation until the player chooses', async () => {
  patchGamePreferences({ autoRoll: true });
  const { result } = renderHook(() => useGameProviderValue(true));
  const initial = { ...position(), mode: 'vs-computer' as const };
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.matchAction!('offer'));
  act(() => result.current.doUndo());
  act(() => jest.advanceTimersByTime(10000));
  expect(result.current.state).toEqual(initial);
  act(() => result.current.doRedo());
  await act(async () => {
    jest.advanceTimersByTime(computerThinkDelayMs('rolling'));
  });
  expect(result.current.state?.match?.cube.value).toBe(2);
  act(() => result.current.doUndo());
  expect(result.current.state).toEqual(initial);
});

it('takes back the human answer to a computer offer so a different answer is playable', async () => {
  const initial = createPositionState({ placements: [{ point: 21, player: 'black', count: 15 }, { point: 6, player: 'white', count: 15 }], currentPlayer: 'black', mode: 'vs-computer', match: createMatch(0) });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  await act(async () => {
    jest.advanceTimersByTime(computerThinkDelayMs('rolling'));
  });
  expect(result.current.state?.match?.pendingOffer).toBe('black');
  act(() => result.current.matchAction!('accept'));
  act(() => result.current.doUndo());
  expect(result.current.state?.match?.pendingOffer).toBe('black');
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer']);
  act(() => result.current.matchAction!('drop'));
  expect(result.current.state?.match?.result).toMatchObject({ winner: 'black', points: 1, kind: 'drop' });
  expect(result.current.canRedo).toBe(false);
});

it('undoes a beaver with its computer response as one human decision', async () => {
  jest.mocked(analyzeCubeDecision).mockResolvedValueOnce({ actor: 'black', best: 'offer', values: {} }).mockResolvedValueOnce({ actor: 'black', best: 'accept', values: {} });
  const initial = { ...position(), currentPlayer: 'black' as const, mode: 'vs-computer' as const };
  initial.match!.beavers = true;
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  await act(async () => {
    jest.advanceTimersByTime(computerThinkDelayMs('rolling'));
  });
  act(() => result.current.matchAction!('beaver'));
  await act(async () => {
    jest.advanceTimersByTime(computerThinkDelayMs('rolling'));
  });
  expect(result.current.state?.match?.cube).toEqual({ value: 4, owner: 'white' });
  const taken = result.current.state;
  act(() => result.current.doUndo());
  expect(result.current.state?.match).toMatchObject({ cube: { value: 1, owner: 'center' }, pendingOffer: 'black' });
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer']);
  act(() => result.current.doRedo());
  expect(result.current.state).toEqual(taken);
});

it('preserves money rules and cube limits when starting a new game', () => {
  const initial = position();
  Object.assign(initial.match!, { jacoby: false, beavers: true, cubeLimit: 64 });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.resetGame());
  expect(result.current.state?.match).toMatchObject({ jacoby: false, beavers: true, cubeLimit: 64, cube: { value: 1, owner: 'center' } });
});

it('undoes White taking Black’s double without clearing the offer or setup position', () => {
  const initial = createPositionState({ placements: [{ point: 23, player: 'black', count: 2 }, { point: 1, player: 'white', count: 2 }], borneOff: { black: 13, white: 13 }, currentPlayer: 'black', mode: 'vs-human', match: { ...createMatch(0), cube: { value: 2, owner: 'black' } } });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.matchAction!('offer'));
  const offered = result.current.state;
  act(() => result.current.matchAction!('accept'));
  expect(result.current.state?.match?.cube).toEqual({ value: 4, owner: 'white' });
  act(() => result.current.doUndo());
  expect(result.current.state).toEqual(offered);
  expect(result.current.state?.points).toEqual(initial.points);
  expect(result.current.cubeEvents?.map(e => [e.kind, e.player])).toEqual([['offer', 'black']]);
  expect(loadPersistedSession()?.cubeEvents).toHaveLength(1);
  act(() => result.current.matchAction!('drop'));
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer', 'drop']);
  expect(result.current.canRedo).toBe(false);
  expect(result.current.state?.match?.result).toMatchObject({ winner: 'black', points: 2 });
});
