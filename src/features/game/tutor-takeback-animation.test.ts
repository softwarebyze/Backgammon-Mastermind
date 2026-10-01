import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';
import type { MoveLogEntry, ReplaySnapshot } from '@/lib/game/move-log';

import { applyMove } from '@/lib/game';
import { createInitialState } from '@/lib/game/constants';
import { appendNoMoveLogEntry } from '@/lib/game/move-log';
import { runTakeBackAnimation } from './tutor-takeback-animation';

function snapshotOf(state: GameState): ReplaySnapshot {
  return {
    points: state.points.map(p => ({ ...p })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
    dice: [...state.dice] as [number, number],
    remainingDice: [...state.remainingDice],
    currentPlayer: state.currentPlayer,
    phase: state.phase,
  };
}

/** A mid-turn white state with two played moves, as the tutor question sees it. */
function twoMoveFixture() {
  const baseline = createInitialState('vs-human');
  const turnStart: GameState = {
    ...baseline,
    phase: 'moving',
    dice: [3, 2],
    remainingDice: [3, 2],
  };
  const moves: Move[] = [
    { from: 13, to: 10, dieIndex: 0 },
    { from: 13, to: 11, dieIndex: 1 },
  ];
  const log: MoveLogEntry[] = [];
  let snap = turnStart;
  moves.forEach((move, i) => {
    snap = applyMove(snap, move);
    log.push({
      ply: i + 1,
      player: 'white',
      dice: [3, 2],
      from: move.from,
      to: move.to,
      after: snapshotOf(snap),
    });
  });
  return { baseline, turnStart, log };
}

type Harness = {
  frames: MoveAnimationFrame[];
  states: GameState[];
  finishedWith: number[];
  /** Simulate every pending animation finishing, in order. */
  flush: () => void;
};

function makeHarness(
  baseline: GameState,
  log: MoveLogEntry[],
  finish: (n: number) => void,
): Harness {
  const frames: MoveAnimationFrame[] = [];
  const states: GameState[] = [];
  const finishedWith: number[] = [];
  const live = [...log];
  const queue: Array<() => void> = [];
  runTakeBackAnimation(
    {
      replayBaseline: baseline,
      moveLog: log,
      popLastMove: () => live.pop() ?? null,
      setState: s => states.push(s),
      setMoveAnimation: f => frames.push(f!),
      // Test double: queue the commit instead of arming a watchdog.
      armAnimationFinish: (onFinish) => {
        queue.push(onFinish);
        return onFinish;
      },
      finish: (n) => {
        finishedWith.push(n);
        finish(n);
      },
    },
    log.length,
  );
  return {
    frames,
    states,
    finishedWith,
    flush: () => {
      while (queue.length > 0) {
        queue.shift()!();
      }
    },
  };
}

describe('runTakeBackAnimation', () => {
  it('slides the newest move back first, then finishes', () => {
    const { baseline, log } = twoMoveFixture();
    const h = makeHarness(baseline, log, () => {});
    // One reverse frame per move; newest (13->11) animates first.
    expect(h.frames).toHaveLength(1);
    expect(h.frames[0]!.from).toBe(11);
    expect(h.frames[0]!.to).toBe(13);
    expect(h.frames[0]!.player).toBe('white');
    expect(h.finishedWith).toEqual([]);

    // First slide lands -> second (older) move animates back.
    h.flush();
    expect(h.frames).toHaveLength(2);
    expect(h.frames[1]!.from).toBe(10);
    expect(h.frames[1]!.to).toBe(13);

    // Second slide lands -> finish with both moves undone.
    h.flush();
    expect(h.finishedWith).toEqual([2]);
    expect(h.frames).toHaveLength(2);
  });

  it('pops the move log as each slide lands and shows the pre-move board', () => {
    const { baseline, log } = twoMoveFixture();
    const live = [...log];
    const states: GameState[] = [];
    const queue: Array<() => void> = [];
    runTakeBackAnimation(
      {
        replayBaseline: baseline,
        moveLog: log,
        popLastMove: () => live.pop() ?? null,
        setState: s => states.push(s),
        setMoveAnimation: () => {},
        armAnimationFinish: (onFinish) => {
          queue.push(onFinish);
          return onFinish;
        },
        finish: () => {},
      },
      2,
    );
    queue.shift()!();
    expect(live).toHaveLength(1);
    // The board under the next slide is the pre-move position: the 13->11
    // checker is back on 13 (13 holds 4 after only the 13->10 move).
    expect(states).toHaveLength(1);
    expect(states[0]!.points[13]!.count).toBe(4);
    expect(states[0]!.points[11]!.count).toBe(0);
    queue.shift()!();
    expect(live).toHaveLength(0);
  });

  it('pops exactly once per move across the animation and the provider finish', () => {
    // Regression: the animation pops the log as slides land, and the
    // provider's finish must not pop again (skipPop) — otherwise a 2-move
    // turn would lose 4 log entries.
    const { baseline, log } = twoMoveFixture();
    const live = [...log];
    let popCount = 0;
    const finishedWith: number[] = [];
    const queue: Array<() => void> = [];
    runTakeBackAnimation(
      {
        replayBaseline: baseline,
        moveLog: log,
        popLastMove: () => {
          popCount++;
          return live.pop() ?? null;
        },
        setState: () => {},
        setMoveAnimation: () => {},
        armAnimationFinish: (onFinish) => {
          queue.push(onFinish);
          return onFinish;
        },
        // Models the provider wiring: finish(skipPop: true) pops zero times.
        finish: (n) => {
          finishedWith.push(n);
        },
      },
      log.length,
    );
    while (queue.length > 0) {
      queue.shift()!();
    }
    expect(finishedWith).toEqual([2]);
    expect(popCount).toBe(2);
    expect(live).toHaveLength(0);
  });
});

describe('runTakeBackAnimation edge cases', () => {
  it('falls back to finish when the log is empty', () => {
    const baseline = createInitialState('vs-human');
    const finished: number[] = [];
    runTakeBackAnimation(
      {
        replayBaseline: baseline,
        moveLog: [],
        popLastMove: () => null,
        setState: () => {},
        setMoveAnimation: () => {
          throw new Error('should not animate with an empty log');
        },
        armAnimationFinish: f => f,
        finish: n => finished.push(n),
      },
      3,
    );
    expect(finished).toEqual([0]);
  });

  it('skips no-move entries without animating them', () => {
    const { baseline, turnStart, log } = twoMoveFixture();
    const withNoMove = appendNoMoveLogEntry(log, {
      player: 'white',
      // Different dice so the helper doesn't dedupe against the played turn.
      dice: [6, 1],
      after: turnStart,
    });
    const frames: MoveAnimationFrame[] = [];
    const queue: Array<() => void> = [];
    const finished: number[] = [];
    runTakeBackAnimation(
      {
        replayBaseline: baseline,
        moveLog: withNoMove,
        popLastMove: () => withNoMove.pop() ?? null,
        setState: () => {},
        setMoveAnimation: f => frames.push(f!),
        armAnimationFinish: (onFinish) => {
          queue.push(onFinish);
          return onFinish;
        },
        finish: n => finished.push(n),
      },
      3,
    );
    // The no-move entry is popped instantly; the two real moves animate.
    expect(frames).toHaveLength(1);
    expect(frames[0]!.from).toBe(11);
    queue.shift()!();
    expect(frames).toHaveLength(2);
    queue.shift()!();
    expect(finished).toEqual([3]);
  });

  it('clamps to eight moves', () => {
    const { baseline, log } = twoMoveFixture();
    const finished: number[] = [];
    const live = [...log];
    runTakeBackAnimation(
      {
        replayBaseline: baseline,
        moveLog: log,
        popLastMove: () => live.pop() ?? null,
        setState: () => {},
        setMoveAnimation: () => {},
        // Fire each commit immediately: the whole chain runs synchronously.
        armAnimationFinish: (f) => {
          f();
          return f;
        },
        finish: n => finished.push(n),
      },
      99,
    );
    // Only the 2 logged moves are undone.
    expect(finished).toEqual([2]);
    expect(live).toHaveLength(0);
  });
});
