import type { GameState } from '@/lib/game';
import { clearGuidance, getGuidance, showGuidance } from '@/features/game/guidance-store';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { getLegalMoves, getReachableDestinations } from '@/lib/game';
import { createPositionState } from '@/lib/game/create-position';
import { loadPersistedSession, savePersistedSession } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';

type Provider = ReturnType<typeof useGameProviderValue>;
function settle(result: { current: Provider }) {
  for (let i = 0; result.current.moveAnimation && i < 20; i++) {
    act(() => {
      const frame = result.current.moveAnimation!;
      (frame.parallel ?? [frame]).forEach(f => f.onFinish());
    });
  }
  expect(result.current.isAnimating).toBe(false);
}
function position(dice: [number, number] = [1, 1]) {
  return createPositionState({
    placements: [{ point: 8, player: 'white', count: 15 }, { point: 24, player: 'black', count: 15 }],
    dice,
    mode: 'vs-human',
  });
}
function flag(questionState: GameState) {
  showGuidance({ kind: 'blunder', questionState, myMoves: [], engineMoves: [], revealed: false, showMine: false, showEngine: false });
}
afterEach(() => clearGuidance());

// eslint-disable-next-line max-lines-per-function -- provider integration scenarios share the action fixture
describe('action undo through the real provider', () => {
  it.each([false, true])('keeps earlier actions when undoing a compound (concurrent=%s), then redoes every leg', (concurrent) => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => result.current.startFromPosition(position()));
    const first = getLegalMoves(result.current.state!).find(m => m.from === 8)!;
    act(() => result.current.doMove(first, { concurrent }));
    settle(result);
    const earlier = result.current.state!;
    const compound = getReachableDestinations(earlier, 8).get(6)!;
    expect(compound).toHaveLength(2);
    act(() => result.current.doMoveSequence(compound, { concurrent }));
    settle(result);
    const after = result.current.state!;
    expect(result.current.moveLog).toHaveLength(3);
    expect(result.current.moveLog[1]!.actionId).toBe(result.current.moveLog[2]!.actionId);
    expect(result.current.moveLog[0]!.actionId).not.toBe(result.current.moveLog[1]!.actionId);
    // The action boundary survives the actual saved-session schema too.
    expect(loadPersistedSession()!.moveLog[2]!.actionId).toBe(result.current.moveLog[2]!.actionId);
    act(() => flag(position()));
    act(() => result.current.doUndo());
    settle(result);
    expect(getGuidance()).toBeNull();
    expect(result.current.state!.points).toEqual(earlier.points);
    expect(result.current.state!.remainingDice).toEqual(earlier.remainingDice);
    expect(result.current.moveLog).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.doRedo());
    settle(result);
    expect(result.current.state!.points).toEqual(after.points);
    expect(result.current.state!.remainingDice).toEqual(after.remainingDice);
    expect(result.current.moveLog).toHaveLength(3);
    expect(result.current.canRedo).toBe(false);
    act(() => result.current.doUndo());
    settle(result);
    act(() => result.current.doMove(getLegalMoves(result.current.state!)[0]!));
    settle(result);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.moveLog).toHaveLength(2);
  });
  it('undoes a compound then an earlier action immediately, and redoes both during reverse flights', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const initial = position();
    act(() => result.current.startFromPosition(initial));
    act(() => result.current.doMove({ from: 8, to: 7, dieIndex: 0 }, { concurrent: true }));
    settle(result);
    const earlier = result.current.state!;
    act(() => result.current.doMoveSequence([{ from: 8, to: 7, dieIndex: 0 }, { from: 7, to: 6, dieIndex: 0 }], { concurrent: true }));
    settle(result);
    const final = result.current.state!;
    act(() => result.current.doUndo());
    expect(result.current.state!.points).toEqual(earlier.points);
    expect(result.current.moveLog).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(loadPersistedSession()!.moveLog).toHaveLength(1);
    const reverse = result.current.moveAnimation!.parallel!;
    expect(reverse).toHaveLength(2);
    // The earlier checker at 7 is already available: these reverse legs can overlap.
    expect(reverse[1]!.waitFor).toBeUndefined();
    act(() => result.current.doUndo());
    expect(result.current.state!.points).toEqual(initial.points);
    expect(result.current.moveLog).toHaveLength(0);
    expect(result.current.moveAnimation!.parallel).toHaveLength(3);
    act(() => {
      result.current.doRedo();
      result.current.doRedo();
    });
    expect(result.current.state!.points).toEqual(final.points);
    expect(result.current.state!.remainingDice).toEqual(final.remainingDice);
    expect(result.current.moveLog).toHaveLength(3);
    expect(loadPersistedSession()!.moveLog).toHaveLength(3);
    expect(result.current.canRedo).toBe(false);
    act(() => reverse.forEach(f => f.onFinish()));
    settle(result);
    expect(result.current.state!.points).toEqual(final.points);
    act(() => result.current.doUndo());
    const callbacks = result.current.moveAnimation!.parallel!;
    act(() => result.current.resetGame());
    act(() => callbacks.forEach(f => f.onFinish()));
    expect(result.current.state!.phase).toBe('opening-roll');
    expect(result.current.moveLog).toEqual([]);
    expect(result.current.moveAnimation).toBeNull();
  });
  it('treats two independent checker flights as distinct actions even before either lands', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => result.current.startFromPosition(position()));
    act(() => {
      result.current.doMove({ from: 8, to: 7, dieIndex: 0 }, { concurrent: true });
      result.current.doMove({ from: 8, to: 7, dieIndex: 0 }, { concurrent: true });
    });
    expect(result.current.moveAnimation!.parallel).toHaveLength(2);
    const frames = result.current.moveAnimation!.parallel!;
    act(() => frames[1]!.onFinish());
    act(() => frames[0]!.onFinish());
    act(() => result.current.doUndo());
    settle(result);
    expect(result.current.moveLog).toHaveLength(1);
    expect(result.current.state!.points[7]!.count).toBe(1);
  });
  it('undo preserves in-flight committed legs and ignores late logical commits', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const initial = position([3, 1]);
    act(() => result.current.startFromPosition(initial));
    const compound = getReachableDestinations(initial, 8).get(4)!;
    act(() => result.current.doMoveSequence(compound, { concurrent: true }));
    const flight = result.current.moveAnimation!;
    expect(result.current.moveLog).toHaveLength(2);
    act(() => flag(initial));
    act(() => result.current.doUndo());
    expect(getGuidance()).toBeNull();
    expect(result.current.state!.points).toEqual(initial.points);
    expect(result.current.moveLog).toHaveLength(0);
    expect(result.current.isAnimating).toBe(true);
    act(() => flight.onFinish());
    settle(result);
    expect(result.current.state!.points).toEqual(initial.points);
    expect(result.current.moveLog).toHaveLength(0);
  });
  it('keeps the entire action together through an intermediate hit and a saved-game reload', () => {
    const initial = createPositionState({
      placements: [{ point: 8, player: 'white', count: 15 }, { point: 5, player: 'black', count: 1 }, { point: 24, player: 'black', count: 14 }],
      dice: [3, 1],
      mode: 'vs-human',
    });
    const { result: originalResult, unmount } = renderHook(() => useGameProviderValue(true));
    act(() => originalResult.current.startFromPosition(initial));
    act(() => originalResult.current.doMoveSequence([{ from: 8, to: 5, dieIndex: 0 }, { from: 5, to: 4, dieIndex: 0 }], { concurrent: true }));
    settle(originalResult);
    expect(originalResult.current.state!.bar.black).toBe(1);
    unmount();
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => flag(initial));
    act(() => result.current.doUndo());
    settle(result);
    expect(result.current.state!.points).toEqual(initial.points);
    expect(result.current.state!.bar.black).toBe(0);
    expect(result.current.moveLog).toHaveLength(0);
    act(() => result.current.doRedo());
    settle(result);
    expect(result.current.state!.points[4]!.count).toBe(1);
    expect(result.current.state!.bar.black).toBe(1);
    expect(result.current.moveLog).toHaveLength(2);
  });
  it('does not dismiss guidance if no action can be undone', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => result.current.startFromPosition(position()));
    act(() => flag(position()));
    act(() => result.current.doUndo());
    expect(getGuidance()).not.toBeNull();
  });
});

describe('old saved-game action compatibility', () => {
  it('resumes old sessions without action IDs and preserves their per-ply undo', () => {
    const { result: original, unmount } = renderHook(() => useGameProviderValue(true));
    const initial = position([3, 1]);
    act(() => original.current.startFromPosition(initial));
    act(() => original.current.doMoveSequence([{ from: 8, to: 5, dieIndex: 0 }, { from: 5, to: 4, dieIndex: 0 }]));
    settle(original);
    const saved = loadPersistedSession()!;
    unmount();
    savePersistedSession({ ...saved, moveLog: saved.moveLog.map(({ actionId: _actionId, ...entry }) => entry) });
    const { result } = renderHook(() => useGameProviderValue(true));
    expect(result.current.moveLog).toHaveLength(2);
    act(() => result.current.doUndo());
    settle(result);
    expect(result.current.moveLog).toHaveLength(1);
    expect(result.current.state!.points[5]!.count).toBe(1);
    act(() => result.current.doRedo());
    settle(result);
    expect(result.current.moveLog).toHaveLength(2);
    expect(result.current.state!.points[4]!.count).toBe(1);
  });
});
