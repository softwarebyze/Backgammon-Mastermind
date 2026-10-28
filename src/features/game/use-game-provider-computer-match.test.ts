import type { GameState } from '@/lib/game';
import { clearGuidance, setGuidanceVerdictPending, showGuidance } from '@/features/game/guidance-store';
import { createPositionState, getLegalMoves } from '@/lib/game';
import { patchGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { computerThinkDelayMs } from '@/lib/game/computer-pace';
import { acceptDouble, createMatch, createMatchGame, dropDouble, offerDouble } from '@/lib/game/match';
import { clearActiveGame, loadPersistedGame, savePersistedSession } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';
import { useGameProviderValue } from './use-game-provider-value';

jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn().mockReturnValue({ capture: jest.fn() }) }));

function board(advantage: 'even' | 'black' | 'white' = 'even', currentPlayer: 'black' | 'white' = 'black'): GameState {
  return createPositionState({ mode: 'vs-computer', currentPlayer, match: createMatch(5), placements: [
    { point: advantage === 'black' ? 23 : 10, player: 'black', count: 15 },
    { point: advantage === 'white' ? 2 : 15, player: 'white', count: 15 },
  ] });
}
function think() {
  act(() => jest.advanceTimersByTime(computerThinkDelayMs('rolling')));
}

beforeEach(() => {
  jest.useFakeTimers();
  patchGamePreferences({ autoRoll: false });
  clearActiveGame();
  setGuidanceVerdictPending(false);
});
afterEach(() => {
  setGuidanceVerdictPending(false);
  jest.clearAllTimers();
  jest.useRealTimers();
});

it.each([['even', 'accept'], ['white', 'drop']] as const)('automatically answers a human offer (%s → %s), rejecting human answers for AI', (advantage, answer) => {
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(board(advantage, 'white')));
  act(() => result.current.matchAction!('offer'));
  const pending = result.current.state;
  for (const action of ['accept', 'drop'] as const) {
    act(() => result.current.matchAction!(action));
    expect(result.current.state).toBe(pending);
  }
  act(() => result.current.doRollDice());
  act(() => result.current.doPassTurn());
  act(() => result.current.doUndo());
  expect(result.current.state).toBe(pending);
  expect(result.current.canUndo).toBe(false);
  think();
  expect(result.current.state?.match?.pendingOffer).toBeNull();
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer', answer]);
  act(() => jest.advanceTimersByTime(100));
  expect(result.current.cubeEvents).toHaveLength(2);
  if (answer === 'accept') {
    expect(result.current.state?.match?.cube).toEqual({ value: 2, owner: 'black' });
    expect(result.current.state?.currentPlayer).toBe('white');
    expect(result.current.state?.phase).toBe('rolling');
  }
  else {
    expect(result.current.state?.match?.result).toEqual({ winner: 'white', points: 1, kind: 'drop' });
  }
});

it('offers as Black before rolling, waits for the human, then rolls with White owning the accepted cube', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(board('black')));
  const initial = result.current.state;
  act(() => result.current.matchAction!('offer'));
  act(() => result.current.doRollDice());
  expect(result.current.state).toBe(initial);
  think();
  expect(result.current.state?.match?.pendingOffer).toBe('black');
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer']);
  const pending = result.current.state;
  act(() => result.current.doRollDice());
  act(() => result.current.doPassTurn());
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current.state).toBe(pending);
  expect(result.current.cubeEvents).toHaveLength(1);
  act(() => result.current.matchAction!('accept'));
  expect(result.current.state?.match?.cube).toEqual({ value: 2, owner: 'white' });
  think();
  expect(result.current.state?.phase).toBe('moving');
  expect(result.current.state?.match?.cube).toEqual({ value: 2, owner: 'white' });
  expect(result.current.state?.match?.undoFloor).toBe(0);
});

it.each(['white', 'black'] as const)('cold resumes a pending %s offer with the correct actor', (offerer) => {
  const pending = offerDouble(board(offerer === 'white' ? 'even' : 'black', offerer), 0);
  savePersistedSession({ state: pending, moveLog: [], replayBaseline: pending });
  const { result } = renderHook(() => useGameProviderValue(true));
  expect(result.current.state?.mode).toBe('vs-computer');
  expect(result.current.state?.match?.pendingOffer).toBe(offerer);
  think();
  if (offerer === 'white')
    expect(result.current.state?.match?.cube).toEqual({ value: 2, owner: 'black' });
  else
    expect(result.current.state?.match?.pendingOffer).toBe('black');
});

it('cancels on pause, inactivity, explicit cancellation and reset; re-arms only on resume', () => {
  const { result, rerender } = renderHook<ReturnType<typeof useGameProviderValue>, { active: boolean }>(({ active }) => useGameProviderValue(active), { initialProps: { active: true } });
  act(() => result.current.startFromPosition(board('black')));
  act(() => setGuidanceVerdictPending(true));
  const paused = result.current.state;
  act(() => result.current.matchAction!('offer'));
  think();
  expect(result.current.state).toBe(paused);
  act(() => setGuidanceVerdictPending(false));
  rerender({ active: false });
  think();
  expect(result.current.state).toBe(paused);
  rerender({ active: true });
  act(() => result.current.clearAITimeout());
  think();
  expect(result.current.state).toBe(paused);
  act(() => result.current.resumeAIScheduling());
  think();
  expect(result.current.state?.match?.pendingOffer).toBe('black');
  act(() => result.current.resetGame());
  const reset = result.current.state;
  expect(reset).toEqual(createMatchGame(5, 'vs-computer'));
  think();
  expect(result.current.state).toBe(reset);
});

it('cancels a computed checker move when the match is replaced', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const moving = createPositionState({ useStandardSetup: true, mode: 'vs-computer', currentPlayer: 'black', match: createMatch(5), dice: [3, 1] });
  act(() => result.current.startFromPosition(moving));
  act(() => jest.advanceTimersByTime(computerThinkDelayMs('moving')));
  act(() => result.current.resetGame());
  const reset = result.current.state;
  act(() => jest.advanceTimersByTime(2000));
  expect(result.current.state).toBe(reset);
  expect(result.current.moveAnimation).toBeNull();
  expect(result.current.moveLog).toHaveLength(0);
});

it('drop, cold resume, next game and new match preserve computer mode and Crawford', () => {
  const state = board('black');
  state.match!.length = 3;
  state.match!.score.black = 1;
  const dropped = dropDouble(offerDouble(state, 0));
  savePersistedSession({ state: dropped, moveLog: [], replayBaseline: state });
  const { result } = renderHook(() => useGameProviderValue(true));
  expect(loadPersistedGame()?.match?.score.black).toBe(2);
  act(() => result.current.matchAction!('next'));
  expect(result.current.state).toMatchObject({ mode: 'vs-computer', phase: 'opening-roll', currentPlayer: 'white', match: { crawford: true, crawfordPlayed: true, gameNumber: 2, score: { white: 0, black: 2 } } });
  expect(result.current.moveLog).toHaveLength(0);
  expect(result.current.canUndo).toBe(false);
  act(() => result.current.resetGame());
  expect(result.current.state).toEqual(createMatchGame(3, 'vs-computer'));
});

it.each([false, true])('accepted cube + AI blocked roll keeps binding undo floor (cold: %s)', (cold) => {
  let utils = renderHook(() => useGameProviderValue(true));
  const state = createPositionState({ mode: 'vs-computer', match: createMatch(5), dice: [3, 4], placements: [{ point: 1, player: 'white', count: 2 }, { point: 2, player: 'white', count: 2 }, { point: 6, player: 'white', count: 11 }, { point: 24, player: 'black', count: 14 }], bar: { black: 1 } });
  state.match!.cube = { value: 2, owner: 'white' };
  // Retain two real human history plies before the computer's binding roll.
  act(() => utils.result.current.startFromPosition(state));
  for (const to of [3, 2]) {
    act(() => utils.result.current.doMove(getLegalMoves(utils.result.current.state!).find(m => m.from === 6 && m.to === to)!));
    act(() => utils.result.current.moveAnimation?.onFinish?.());
  }
  // Black does not own the cube. Its revealed blocked roll is binding,
  // and the automatic pass must not make White's previous moves undoable.
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.01);
  think();
  random.mockRestore();
  expect(utils.result.current.state?.phase).toBe('no-move');
  expect(utils.result.current.state?.match?.undoFloor).toBe(2);
  act(() => jest.advanceTimersByTime(computerThinkDelayMs('no-move')));
  if (cold) {
    utils.unmount();
    utils = renderHook(() => useGameProviderValue(true));
  }
  expect(utils.result.current.moveLog).toHaveLength(3);
  expect(utils.result.current.canUndo).toBe(false);
  const before = utils.result.current.state;
  act(() => utils.result.current.doUndo());
  expect(utils.result.current.state).toBe(before);
  utils.unmount();
});

it('keeps a taken cube through cold resume before the computer roll', () => {
  const accepted = acceptDouble(offerDouble(board('black'), 0));
  savePersistedSession({ state: accepted, moveLog: [], replayBaseline: accepted });
  const { result } = renderHook(() => useGameProviderValue(true));
  think();
  expect(result.current.state?.match?.cube).toEqual({ value: 2, owner: 'white' });
  expect(result.current.state?.match?.pendingOffer).toBeNull();
});

it('rejects human checker selection and moves during the computer turn', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const moving = createPositionState({ useStandardSetup: true, mode: 'vs-computer', currentPlayer: 'black', match: createMatch(5), dice: [3, 1] });
  act(() => result.current.startFromPosition(moving));
  const before = result.current.state;
  const move = getLegalMoves(moving)[0]!;
  act(() => result.current.selectPoint(move.from));
  act(() => result.current.doMove(move));
  act(() => result.current.doMoveSequence([move]));
  expect(result.current.state).toBe(before);
  expect(result.current.moveAnimation).toBeNull();
  expect(result.current.moveLog).toHaveLength(0);
});

it('lets the computer bear off, finish the match, and start a fresh computer match', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const state = createPositionState({ mode: 'vs-computer', currentPlayer: 'black', dice: [1, 2], match: { ...createMatch(3), score: { black: 2, white: 1 }, crawford: true, crawfordPlayed: true }, placements: [{ point: 24, player: 'black', count: 1 }, { point: 1, player: 'white', count: 14 }], borneOff: { black: 14, white: 1 } });
  act(() => result.current.startFromPosition(state));
  act(() => jest.advanceTimersByTime(computerThinkDelayMs('moving')));
  act(() => jest.advanceTimersByTime(1200));
  act(() => result.current.moveAnimation?.onFinish?.());
  expect(result.current.state).toMatchObject({ phase: 'game-over', mode: 'vs-computer', winner: 'black', match: { winner: 'black', score: { black: 3, white: 1 }, result: { kind: 'single', points: 1 } } });
  const won = result.current.state;
  act(() => result.current.matchAction!('next'));
  expect(result.current.state).toBe(won);
  act(() => result.current.resetGame());
  expect(result.current.state).toEqual(createMatchGame(3, 'vs-computer'));
});

it('rechecks current eligibility when the tutor invokes its retained replay callback', () => {
  const { result } = renderHook(() => useGameProviderValue(true));
  const start = createPositionState({ useStandardSetup: true, mode: 'vs-computer', dice: [3, 1] });
  const move = getLegalMoves(start)[0]!;
  act(() => result.current.startFromPosition(start));
  act(() => showGuidance({ kind: 'blunder', questionState: start, myMoves: [], engineMoves: [move], revealed: true, showMine: false, showEngine: true }));
  const replayBest = result.current.doMoveSequence;
  act(() => replayBest([move]));
  expect(result.current.moveAnimation).toBeNull();
  act(() => clearGuidance());
  act(() => result.current.tutorRevertTurn(start, 0));
  act(() => replayBest([move]));
  expect(result.current.moveAnimation).not.toBeNull();
});
