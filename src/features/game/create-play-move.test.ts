import type { GameState, Move } from '@/lib/game';
import { createPlayMove } from '@/features/game/create-play-move';
import { applyDiceRoll, createInitialState } from '@/lib/game';

function makeHarness() {
  const generationRef = { current: 0 };
  const commitGenRef = { current: 0 };
  const finishOnceRef: { current: (() => void) | null } = { current: null };
  const setStateCalls: GameState[] = [];
  const setMoveAnimationCalls: unknown[] = [];
  const started: Array<{ before: GameState; move: Move; after: GameState }> = [];
  const applied: Array<{ before: GameState; move: Move; after: GameState }> = [];
  const playMove = createPlayMove({
    generationRef,
    commitGenRef,
    finishOnceRef,
    setState: ((s: GameState | null) => { setStateCalls.push(s as GameState); }) as never,
    setMoveAnimation: ((a: unknown) => { setMoveAnimationCalls.push(a); }) as never,
    onMoveApplied: (before, move, after) => { applied.push({ before, move, after }); },
    onMoveStarted: (before, move, after) => { started.push({ before, move, after }); },
  });
  return { playMove, finishOnceRef, setStateCalls, setMoveAnimationCalls, started, applied };
}

function openingState(): GameState {
  let state = createInitialState('vs-human');
  state = applyDiceRoll(state, [4, 2]);
  return state;
}

describe('createPlayMove onMoveStarted', () => {
  it('fires onMoveStarted synchronously at animation start, before settle', () => {
    const h = makeHarness();
    const snapshot = openingState();
    const order: string[] = [];
    const playMove = createPlayMove({
      generationRef: { current: 0 },
      commitGenRef: { current: 0 },
      finishOnceRef: h.finishOnceRef,
      setState: (() => {}) as never,
      setMoveAnimation: (() => {}) as never,
      onMoveStarted: () => { order.push('started'); },
      onMoveApplied: () => { order.push('applied'); },
    });
    playMove(snapshot, { from: 8, to: 4, dieIndex: 0 });
    // Animation started but settle hasn't run yet.
    expect(order).toEqual(['started']);
    expect(h.started).toHaveLength(0); // sanity: separate harness untouched
    // Now run the settle callback.
    h.finishOnceRef.current?.();
    expect(order).toEqual(['started', 'applied']);
  });

  it('passes a preview after-state identical to what settle commits', () => {
    const h = makeHarness();
    const snapshot = openingState();
    h.playMove(snapshot, { from: 8, to: 4, dieIndex: 0 });
    expect(h.started).toHaveLength(1);
    const preview = h.started[0]!.after;
    h.finishOnceRef.current?.();
    expect(h.applied).toHaveLength(1);
    const committed = h.applied[0]!.after;
    expect(preview).toEqual(committed);
    expect(h.setStateCalls[0]).toEqual(committed);
  });

  it('does not fire onMoveStarted for an illegal move', () => {
    const h = makeHarness();
    const snapshot = openingState();
    h.playMove(snapshot, { from: 8, to: 5, dieIndex: 0 }); // 8->5 not legal with [4,2]
    expect(h.started).toHaveLength(0);
    expect(h.setMoveAnimationCalls).toHaveLength(1); // animation frame still built
  });

  it('still commits via settle when onMoveStarted is absent', () => {
    const finishOnceRef: { current: (() => void) | null } = { current: null };
    const applied: Move[] = [];
    const playMove = createPlayMove({
      generationRef: { current: 0 },
      commitGenRef: { current: 0 },
      finishOnceRef,
      setState: (() => {}) as never,
      setMoveAnimation: (() => {}) as never,
      onMoveApplied: (_b, move) => { applied.push(move); },
    });
    playMove(openingState(), { from: 8, to: 4, dieIndex: 0 });
    finishOnceRef.current?.();
    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({ from: 8, to: 4 });
  });
});
