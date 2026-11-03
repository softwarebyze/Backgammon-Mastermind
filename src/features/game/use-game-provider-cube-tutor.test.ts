import { createPositionState, getLegalMoves } from '@/lib/game';
import { loadGamePreferences } from '@/lib/game-preferences/storage';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { patchGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { createMatch } from '@/lib/game/match';
import { clearActiveGame } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';
import { analyzeCubeDecision } from './cube-analysis';
import { clearGuidance, setGuidanceVerdictPending, showGuidance } from './guidance-store';
import { useGameProviderValue } from './use-game-provider-value';

jest.mock('./cube-analysis', () => ({ analyzeCubeDecision: jest.fn() }));
jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn().mockReturnValue({ capture: jest.fn() }) }));
beforeEach(() => {
  jest.mocked(loadGamePreferences).mockReturnValue({ ...DEFAULT_GAME_PREFERENCES, tutorMode: true, autoRoll: false });
  clearActiveGame();
  patchGamePreferences({ tutorMode: true, autoRoll: false });
  jest.mocked(analyzeCubeDecision).mockReset().mockResolvedValue({ actor: 'white', best: 'offer', values: { roll: 0.3, offer: 0.8 } });
});
afterEach(() => patchGamePreferences({ tutorMode: false }));
it.each([0, 5])('holds a missed double before revealing dice in a %s-point game', async (length) => {
  const initial = createPositionState({ useStandardSetup: true, match: createMatch(length) });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  await act(async () => result.current.doRollDice());
  expect(result.current.state).toBe(initial);
  expect(result.current.cubeTutorSession?.phase).toBe('mistake');
  act(() => result.current.cancelCubeTutor!());
  await act(async () => result.current.matchAction!('offer'));
  expect(result.current.state?.match?.pendingOffer).toBe('white');
  expect(result.current.cubeEvents?.map(e => e.kind)).toEqual(['offer']);
});
it('does not commit an incorrect double until Continue is chosen', async () => {
  jest.mocked(analyzeCubeDecision).mockResolvedValue({ actor: 'white', best: 'roll', values: { roll: 0.3, offer: -0.1 } });
  const initial = createPositionState({ useStandardSetup: true, match: createMatch(0) });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  await act(async () => result.current.matchAction!('offer'));
  expect(result.current.state).toBe(initial);
  expect(result.current.cubeEvents).toHaveLength(0);
  act(() => result.current.continueCubeTutor!());
  expect(result.current.state?.match?.pendingOffer).toBe('white');
  expect(result.current.cubeEvents).toHaveLength(1);
});

it('does not let a retained Undo callback rewind checkers while Tutor is checking', () => {
  const initial = createPositionState({ useStandardSetup: true, mode: 'vs-human', dice: [3, 1], match: createMatch(0) });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.doMove(getLegalMoves(initial)[0]!));
  act(() => result.current.moveAnimation?.onFinish?.());
  const moved = result.current.state;
  const retainedUndo = result.current.doUndo;
  act(() => setGuidanceVerdictPending(true));
  act(() => retainedUndo());
  expect(result.current.state).toBe(moved);
  expect(result.current.moveLog).toHaveLength(1);
  act(() => setGuidanceVerdictPending(false));
});

it('allows the blunder dialog’s Undo last move after clearing the prompt in the same batch', () => {
  const initial = createPositionState({ useStandardSetup: true, mode: 'vs-human', dice: [3, 1], match: createMatch(0) });
  const { result } = renderHook(() => useGameProviderValue(true));
  act(() => result.current.startFromPosition(initial));
  act(() => result.current.doMove(getLegalMoves(initial)[0]!));
  act(() => result.current.moveAnimation?.onFinish?.());
  const retainedUndo = result.current.doUndo;
  act(() => showGuidance({ kind: 'blunder', questionState: initial, myMoves: [], engineMoves: [], revealed: false, showMine: false, showEngine: false }));
  act(() => retainedUndo());
  expect(result.current.moveLog).toHaveLength(1);
  act(() => {
    clearGuidance();
    retainedUndo();
  });
  expect(result.current.moveLog).toHaveLength(0);
});
