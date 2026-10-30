import type { GameState } from '@/lib/game';
import { displayBarCountDuringAnimation, displayPointDuringAnimation } from '@/features/game/move-animation';
import { createInitialPoints, getLegalMoves } from '@/lib/game';
import { act, renderHook } from '@/lib/test-utils';

import { useGameProviderValue } from './use-game-provider-value';

type Provider = ReturnType<typeof useGameProviderValue>;
type Result = { current: Provider };

function position(): GameState {
  const points = createInitialPoints().map(() => ({ player: null, count: 0 })) as GameState['points'];
  points[1] = { player: 'black', count: 2 };
  points[10] = { player: 'black', count: 13 };
  points[24] = { player: 'white', count: 15 };
  return {
    points,
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
    currentPlayer: 'black',
    dice: [1, 2],
    remainingDice: [1, 2],
    phase: 'moving',
    winner: null,
    mode: 'vs-human',
    openingRolls: { white: null, black: null },
    selectedPoint: null,
    legalMovesForSelected: [],
  };
}

function frames(result: Result) {
  const animation = result.current.moveAnimation;
  return animation?.parallel ?? (animation ? [animation] : []);
}

function settle(result: Result) {
  let guard = 0;
  while (result.current.moveAnimation && guard++ < 20) {
    act(() => {
      for (const frame of frames(result)) {
        frame.onFinish();
      }
    });
  }
  expect(result.current.moveAnimation).toBeNull();
}

function move(result: Result, [from, to]: readonly number[], finish = true) {
  const legal = getLegalMoves(result.current.state!).find(candidate => candidate.from === from && candidate.to === to);
  expect(legal).toBeDefined();
  act(() => result.current.doMove(legal!, { concurrent: true }));
  if (finish) {
    settle(result);
  }
}

function setup() {
  const view = renderHook(() => useGameProviderValue(true));
  act(() => view.result.current.startFromPosition(position()));
  return view;
}

function playTwoIndependent(result: Result) {
  move(result, [1, 2]);
  move(result, [10, 12]);
  expect(result.current.moveLog).toHaveLength(2);
}

function expectAtStart(result: Result) {
  expect(result.current.state?.points).toEqual(position().points);
  expect(result.current.state?.remainingDice).toEqual([1, 2]);
  expect(result.current.state?.dice).toEqual([1, 2]);
  expect(result.current.state?.currentPlayer).toBe('black');
  expect(result.current.state?.phase).toBe('moving');
  expect(result.current.moveLog).toHaveLength(0);
  expect(result.current.canUndo).toBe(false);
  expect(result.current.canRedo).toBe(true);
}

describe('real provider rapid history input', () => {
  it('commits both Undo taps before either reverse animation lands', () => {
    const { result } = setup();
    playTwoIndependent(result);

    act(() => result.current.doUndo());
    expect(result.current.moveLog).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    const firstFlight = frames(result)[0]!;
    expect(firstFlight).toMatchObject({ from: 12, to: 10, committed: true });

    act(() => result.current.doUndo());
    expectAtStart(result);
    expect(frames(result)).toHaveLength(2);
    expect(frames(result).map(frame => [frame.from, frame.to])).toEqual([[12, 10], [2, 1]]);
    expect(new Set(frames(result).map(frame => frame.id)).size).toBe(2);
    expect(frames(result).every(frame => frame.waitFor === undefined)).toBe(true);

    // A third click is harmless, even while two flights are still visible.
    act(() => result.current.doUndo());
    expectAtStart(result);
    settle(result);
    act(() => firstFlight.onFinish());
    expectAtStart(result);
  });

  it('reads live history for two Undo calls in the same React event turn', () => {
    const { result } = setup();
    playTwoIndependent(result);
    const undo = result.current.doUndo;
    act(() => {
      undo();
      undo();
    });
    expectAtStart(result);
    expect(frames(result)).toHaveLength(2);
    settle(result);
    expectAtStart(result);
  });

  it('accepts two Redo calls in the same event turn before reverse flights finish', () => {
    const { result } = setup();
    playTwoIndependent(result);
    const finalPoints = result.current.state!.points;
    act(() => {
      result.current.doUndo();
      result.current.doUndo();
    });
    expectAtStart(result);
    const reverseFlights = frames(result);

    act(() => {
      result.current.doRedo();
      result.current.doRedo();
    });
    expect(result.current.state?.points).toEqual(finalPoints);
    expect(result.current.moveLog.map(entry => [entry.from, entry.to])).toEqual([[1, 2], [10, 12]]);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
    // Finishing previous directions must never rewind the logical board/log.
    act(() => reverseFlights.forEach(frame => frame.onFinish()));
    expect(result.current.state?.points).toEqual(finalPoints);
    expect(result.current.moveLog).toHaveLength(2);
    settle(result);
    expect(result.current.state?.points).toEqual(finalPoints);
  });

  it('can Undo a logically committed forward flight without waiting for its landing', () => {
    const { result } = setup();
    move(result, [1, 2], false);
    const forward = frames(result)[0]!;
    expect(result.current.moveLog).toHaveLength(1);

    act(() => result.current.doUndo());
    expectAtStart(result);
    expect(frames(result).some(frame => frame.from === 2 && frame.to === 1)).toBe(true);
    act(() => forward.onFinish());
    expectAtStart(result);
    settle(result);
    expectAtStart(result);
  });
});

describe('rapid history special positions and reset', () => {
  it('chains reverse steps of the same checker while committing both taps immediately', () => {
    const { result } = setup();
    // Leave only one checker on the first point, so the second reverse flight
    // must continue the checker arriving from point 4 rather than another one.
    const start = position();
    start.points[1].count = 1;
    start.points[10].count = 14;
    act(() => result.current.startFromPosition(start));
    move(result, [1, 2]);
    move(result, [2, 4]);

    act(() => {
      result.current.doUndo();
      result.current.doUndo();
    });
    expect(result.current.state?.points).toEqual(start.points);
    expect(result.current.moveLog).toHaveLength(0);
    const reverse = frames(result);
    expect(reverse).toHaveLength(2);
    expect(reverse[0]).toMatchObject({ from: 4, to: 2 });
    expect(reverse[1]).toMatchObject({ from: 2, to: 1, waitFor: reverse[0]!.id, consumesArrival: true });
    settle(result);
    expect(result.current.state?.points).toEqual(start.points);
    expect(result.current.state?.remainingDice).toEqual([1, 2]);
  });

  it.each([
    { label: 'bar entry and capture restoration', moves: [[0, 2], [2, 3]], kind: 'hit' },
    { label: 'two bear-offs', moves: [[23, 25], [24, 25]], kind: 'off' },
    { label: 'same-point doubles', moves: [[1, 2], [1, 2]], kind: 'double' },
  ])('restores $label on rapid Undo and Redo', ({ moves, kind }) => {
    const { result } = setup();
    const start = position();
    if (kind === 'hit') {
      start.points[1] = { player: null, count: 0 };
      start.points[10].count = 14;
      start.bar.black = 1;
      start.points[2] = { player: 'white', count: 1 };
      start.points[24].count = 14;
    }
    if (kind === 'off') {
      start.points[1] = { player: null, count: 0 };
      start.points[10] = { player: null, count: 0 };
      start.points[24] = { player: 'black', count: 1 };
      start.points[23] = { player: 'black', count: 2 };
      start.points[6] = { player: 'white', count: 15 };
      start.borneOff.black = 12;
    }
    if (kind === 'double') {
      start.dice = [1, 1];
      start.remainingDice = [1, 1, 1, 1];
    }
    act(() => result.current.startFromPosition(start));
    for (const [from, to] of moves) {
      move(result, [from!, to!]);
    }
    const after = result.current.state!;
    act(() => {
      result.current.doUndo();
      result.current.doUndo();
    });
    expect(result.current.state?.points).toEqual(start.points);
    expect(result.current.state?.bar).toEqual(start.bar);
    expect(result.current.state?.borneOff).toEqual(start.borneOff);
    expect(result.current.state?.remainingDice).toEqual(start.remainingDice);
    expect(result.current.moveLog).toHaveLength(0);
    const animation = result.current.moveAnimation;
    if (kind === 'hit') {
      expect(displayBarCountDuringAnimation('black', start.bar.black, animation)).toBe(0);
      expect(displayPointDuringAnimation(2, start.points[2]!, animation).count).toBe(0);
      expect(frames(result).some(frame => frame.capture?.from === 0 && frame.capture.to === 2)).toBe(true);
    }
    if (kind === 'double') {
      expect(displayPointDuringAnimation(1, start.points[1]!, animation).count).toBe(0);
    }
    if (kind === 'off') {
      expect(displayPointDuringAnimation(23, start.points[23]!, animation).count).toBe(1);
      expect(displayPointDuringAnimation(24, start.points[24]!, animation).count).toBe(0);
    }
    settle(result);
    act(() => {
      result.current.doRedo();
      result.current.doRedo();
    });
    expect(result.current.state?.points).toEqual(after.points);
    expect(result.current.state?.bar).toEqual(after.bar);
    expect(result.current.state?.borneOff).toEqual(after.borneOff);
    expect(result.current.moveLog).toHaveLength(2);
    settle(result);
    expect(result.current.state?.points).toEqual(after.points);
  });

  it('old history finishes cannot modify a newly started position', () => {
    const { result } = setup();
    playTwoIndependent(result);
    act(() => result.current.doUndo());
    const stale = frames(result);
    const replacement = position();
    replacement.points[1].count = 3;
    replacement.points[10].count = 12;
    act(() => result.current.startFromPosition(replacement));
    act(() => stale.forEach(frame => frame.onFinish()));
    expect(result.current.state?.points).toEqual(replacement.points);
    expect(result.current.moveLog).toHaveLength(0);
    expect(result.current.moveAnimation).toBeNull();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

describe('rapid history watchdog and unmount', () => {
  afterEach(() => jest.useRealTimers());

  it('watchdogs settle reverse flights without committing history again', () => {
    jest.useFakeTimers();
    const { result } = setup();
    playTwoIndependent(result);
    act(() => {
      result.current.doUndo();
      result.current.doUndo();
    });
    const stale = frames(result);
    expectAtStart(result);
    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.moveAnimation).toBeNull();
    expectAtStart(result);
    act(() => stale.forEach(frame => frame.onFinish()));
    expectAtStart(result);
  });

  it('unmount clears pending flight timers and invalidates captured finishes', () => {
    jest.useFakeTimers();
    const schedule = jest.spyOn(globalThis, 'setTimeout');
    const cancel = jest.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = setup();
    playTwoIndependent(result);
    act(() => {
      result.current.doUndo();
      result.current.doUndo();
    });
    const stale = frames(result);
    const flightTimers = stale.map((frame) => {
      const call = schedule.mock.calls.findIndex(args => args[0] === frame.onFinish);
      expect(call).toBeGreaterThanOrEqual(0);
      return schedule.mock.results[call]!.value;
    });
    unmount();
    for (const timer of flightTimers) {
      expect(cancel).toHaveBeenCalledWith(timer);
    }
    const scheduledBeforeStaleFinish = schedule.mock.calls.length;
    expect(() => act(() => stale.forEach(frame => frame.onFinish()))).not.toThrow();
    expect(schedule.mock.calls).toHaveLength(scheduledBeforeStaleFinish);
    schedule.mockRestore();
    cancel.mockRestore();
  });
});

describe('converging arrivals keep distinct checker lifetimes', () => {
  function converge(result: Result) {
    const start = position();
    start.points[1].count = 1;
    start.points[2] = { player: 'black', count: 1 };
    act(() => result.current.startFromPosition(start));
    move(result, [1, 3], false);
    move(result, [2, 3], false);
    return frames(result);
  }

  it('each reverse departure waits for its own unconsumed forward arrival', () => {
    const { result } = setup();
    const [first, second] = converge(result);
    act(() => {
      result.current.doUndo();
      result.current.doUndo();
    });
    const flights = frames(result);
    const reverseSecond = flights.find(frame => frame.from === 3 && frame.to === 2)!;
    const reverseFirst = flights.find(frame => frame.from === 3 && frame.to === 1)!;
    expect(reverseSecond.waitFor).toBe(second!.id);
    expect(reverseFirst.waitFor).toBe(first!.id);
    act(() => second!.onFinish());
    expect(frames(result).find(frame => frame.id === reverseSecond.id)?.waitFor).toBeUndefined();
    expect(frames(result).find(frame => frame.id === reverseFirst.id)?.waitFor).toBe(first!.id);
    settle(result);
    expect(result.current.state?.points[1].count).toBe(1);
    expect(result.current.state?.points[2].count).toBe(1);
    expect(result.current.state?.points[3].count).toBe(0);
    expect(result.current.moveLog).toHaveLength(0);
  });

  it('a released reverse departure cannot unmask another checker still arriving at the same point', () => {
    const { result } = setup();
    const [first, second] = converge(result);
    act(() => result.current.doUndo());
    expect(result.current.state?.points[3].count).toBe(1);
    // The first checker remains logically at 3 but is still airborne.
    expect(displayPointDuringAnimation(3, result.current.state!.points[3]!, result.current.moveAnimation).count).toBe(0);
    act(() => second!.onFinish());
    expect(frames(result).some(frame => frame.id === first!.id)).toBe(true);
    expect(displayPointDuringAnimation(3, result.current.state!.points[3]!, result.current.moveAnimation).count).toBe(0);
    const reverse = frames(result).find(frame => frame.from === 3 && frame.to === 2)!;
    act(() => reverse.onFinish());
    expect(displayPointDuringAnimation(3, result.current.state!.points[3]!, result.current.moveAnimation).count).toBe(0);
    settle(result);
    expect(result.current.state?.points[3].count).toBe(1);
    expect(result.current.moveLog).toHaveLength(1);
  });
});
