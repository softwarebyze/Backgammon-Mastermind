import type { GameState } from '@/lib/game';
/**
 * Provider-level regression test for tutor "take back & retry".
 *
 * Covers Zachary's report (2026-09-24): after take-back, the board animated
 * back nicely but then went stuck/unresponsive (green triangles visible, no
 * cancel button). The fix clears the animation frame before restoring the
 * turn-start state; this test locks in that the board is immediately
 * interactive afterwards.
 */
import { clearGuidance, getGuidance, showGuidance } from '@/features/game/guidance-store';
import { getLegalMoves, getReachableDestinations } from '@/lib/game';
import { act, renderHook } from '@/lib/test-utils';

import { useGameProviderValue } from './use-game-provider-value';

type Provider = ReturnType<typeof useGameProviderValue>;

/** Fire one pending animation frame's onFinish, like the board UI does. */
function finishOneAnimation(result: { current: Provider }): boolean {
  const frame = result.current.moveAnimation;
  if (!frame?.onFinish) {
    return false;
  }
  act(() => {
    frame.onFinish();
  });
  return true;
}

/** Settle chained animation frames (take-back slides one checker per step). */
function settleAllAnimations(result: { current: Provider }) {
  let guard = 0;
  while (finishOneAnimation(result) && guard++ < 20) {
    // Each finished step arms the next reverse slide.
  }
  expect(result.current.moveAnimation).toBeNull();
}

function playOpening(result: { current: Provider }) {
  let guard = 0;
  while (result.current.state?.phase === 'opening-roll' && guard++ < 10) {
    act(() => {
      result.current.doRollDice();
    });
  }
  expect(result.current.state?.phase).toBe('moving');
}

function startRolledTurn(result: { current: Provider }) {
  act(() => {
    result.current.startGame('vs-human');
  });
  playOpening(result);
  act(() => {
    result.current.doRollDice();
  });
  expect(result.current.state?.phase).toBe('moving');
  return JSON.parse(JSON.stringify(result.current.state)) as GameState;
}

function findCompound(result: { current: Provider }) {
  return Array.from({ length: 24 }, (_, i) => i + 1)
    .flatMap(from => [...getReachableDestinations(result.current.state!, from).values()])
    .find(sequence => sequence.length === 2);
}

function makeMove(result: { current: Provider }) {
  const moves = getLegalMoves(result.current.state!);
  expect(moves.length).toBeGreaterThan(0);
  act(() => {
    result.current.doMove(moves[0]!);
  });
  settleAllAnimations(result);
}

describe('provider tutor take-back', () => {
  beforeEach(() => {
    // Exercise the take-back contract, not the chance of five tied openings.
    let roll = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => (++roll % 2 ? 0.2 : 0.6));
  });

  afterEach(() => {
    clearGuidance();
    jest.restoreAllMocks();
  });

  it('take-back restores turn-start and the board is immediately interactive', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const turnStart = startRolledTurn(result);

    makeMove(result);
    if (result.current.state?.phase === 'moving') {
      makeMove(result);
    }
    expect(result.current.canUndo).toBe(true);

    // Take back & retry, as the tutor guidance modal triggers it.
    const onComplete = jest.fn();
    act(() => {
      result.current.tutorRevertTurn(turnStart, 2, onComplete);
    });
    expect(onComplete).not.toHaveBeenCalled();
    settleAllAnimations(result);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Not stuck: no lingering animation frame.
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.moveAnimation).toBeNull();

    // Turn-start state restored.
    const restored = result.current.state!;
    expect(restored.phase).toBe('moving');
    expect(restored.dice).toEqual(turnStart.dice);
    expect(restored.remainingDice).toEqual(turnStart.remainingDice);
    expect(restored.points).toEqual(turnStart.points);
    expect(restored.selectedPoint).toBeNull();

    // Log was popped as each reverse slide landed: nothing left to undo.
    expect(result.current.canUndo).toBe(false);

    // Immediately interactive: a fresh legal move can be made.
    const fresh = getLegalMoves(restored);
    expect(fresh.length).toBeGreaterThan(0);
    act(() => {
      result.current.doMove(fresh[0]!);
    });
    settleAllAnimations(result);
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.state!.remainingDice.length)
      .toBe(turnStart.remainingDice.length - 1);
  });

  it('reverts a flagged compound move as one action', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const turnStart = startRolledTurn(result);

    // One tap on a destination that needs both dice: a compound action.
    const compound = findCompound(result);
    expect(compound).toBeDefined();
    act(() => {
      result.current.doMoveSequence(compound!);
    });
    settleAllAnimations(result);
    expect(result.current.moveLog).toHaveLength(2);
    expect(result.current.canUndo).toBe(true);

    // Take back & retry, as the tutor guidance modal triggers it.
    act(() => {
      showGuidance({ kind: 'blunder', questionState: turnStart, myMoves: compound!, engineMoves: [], revealed: false, showMine: false, showEngine: false });
      result.current.doUndo();
    });
    settleAllAnimations(result);

    // The whole compound is gone, not just its final die.
    expect(result.current.moveLog).toHaveLength(0);
    expect(result.current.state?.points).toEqual(turnStart.points);
    expect(result.current.state?.remainingDice).toEqual(turnStart.remainingDice);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(getGuidance()).toBeNull();
  });

  it('take-back with no moves to animate falls back to an instant revert', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    act(() => {
      result.current.doRollDice();
    });
    const turnStart: GameState = JSON.parse(JSON.stringify(result.current.state));

    act(() => {
      result.current.tutorRevertTurn(turnStart, 0);
    });
    settleAllAnimations(result);

    expect(result.current.isAnimating).toBe(false);
    expect(result.current.state?.phase).toBe('moving');
    expect(result.current.state?.dice).toEqual(turnStart.dice);
  });
});
