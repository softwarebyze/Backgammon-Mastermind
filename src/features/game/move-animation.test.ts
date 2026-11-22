import { checkerTravelDurationMs } from '@/features/game/checker-travel';
import {
  animationKey,
  buildMoveAnimationFrame,
  checkerRenderSize,
  checkerSlideTransform,
  countAtPoint,
  destStackCount,
  displayBarCountDuringAnimation,
  displayPointDuringAnimation,
  isBoardHighlightActive,
} from '@/features/game/move-animation';
import { applyDiceRoll, createInitialState } from '@/lib/game';

import { BAR_POINT } from '@/lib/game/constants';

describe('buildMoveAnimationFrame', () => {
  it('snapshots source stack counts before the move is applied', () => {
    let state = createInitialState('vs-human');
    state = applyDiceRoll(state, [4, 2]);
    state = { ...state, selectedPoint: 8, legalMovesForSelected: [{ from: 8, to: 4, dieIndex: 0 }] };

    const frame = buildMoveAnimationFrame(
      state,
      { from: 8, to: 4, dieIndex: 0 },
      { onFinish: () => {} },
    );

    expect(frame.sourceStackCount).toBe(state.points[8].count);
    expect(frame.sourceDisplayCount).toBe(state.points[8].count - 1);
    expect(frame.destStackCount).toBe(destStackCount(state, 4, state.currentPlayer));
    expect(frame.player).toBe('white');
    expect(frame.fromAnchor).toBeUndefined();
    expect(frame.durationMs).toBe(checkerTravelDurationMs({ from: 8, to: 4, pace: 'human' }));
  });

  it('keeps an optional release anchor for drag handoff', () => {
    let state = createInitialState('vs-human');
    state = applyDiceRoll(state, [4, 2]);
    const fromAnchor = { x: 40, y: 80 };
    const frame = buildMoveAnimationFrame(
      state,
      { from: 8, to: 4, dieIndex: 0 },
      { onFinish: () => {}, fromAnchor },
    );
    expect(frame.fromAnchor).toEqual(fromAnchor);
  });

  it('honors an explicit slide duration', () => {
    let state = createInitialState('vs-human');
    state = applyDiceRoll(state, [4, 2]);
    const frame = buildMoveAnimationFrame(
      state,
      { from: 8, to: 4, dieIndex: 0 },
      { onFinish: () => {}, durationMs: 720 },
    );
    expect(frame.durationMs).toBe(720);
  });

  it('hides the moving checker on the bar during animation', () => {
    const state = createInitialState('vs-human');
    const frame = buildMoveAnimationFrame(
      {
        ...state,
        bar: { white: 2, black: 0 },
        phase: 'moving',
        currentPlayer: 'white',
        selectedPoint: BAR_POINT,
      },
      { from: BAR_POINT, to: 19, dieIndex: 0 },
      { onFinish: () => {} },
    );

    expect(frame.sourceDisplayCount).toBe(1);
    expect(displayBarCountDuringAnimation('white', 2, frame)).toBe(1);
    expect(frame.capture).toBeUndefined();
  });

  it('adds a parallel capture slide when a blot is hit', () => {
    const state = createInitialState('vs-human');
    const hitPoint = 5;
    const snapshot = {
      ...state,
      phase: 'moving' as const,
      currentPlayer: 'white' as const,
      points: state.points.map((point, index) =>
        index === hitPoint ? { player: 'black' as const, count: 1 } : point,
      ),
      bar: { white: 0, black: 0 },
    };

    const frame = buildMoveAnimationFrame(
      snapshot,
      { from: 8, to: hitPoint, dieIndex: 0 },
      { onFinish: () => {} },
    );

    expect(frame.capture).toEqual({
      from: hitPoint,
      to: BAR_POINT,
      player: 'black',
      sourceStackCount: 1,
      destStackCount: 1,
    });
    expect(displayPointDuringAnimation(hitPoint, snapshot.points[hitPoint], frame)).toEqual({
      player: null,
      count: 0,
    });
  });
});

describe('displayPointDuringAnimation', () => {
  it('leaves unrelated points untouched', () => {
    const point = { player: 'white' as const, count: 3 };
    const frame = buildMoveAnimationFrame(
      createInitialState('vs-human'),
      { from: 8, to: 4, dieIndex: 0 },
      { onFinish: () => {} },
    );

    expect(displayPointDuringAnimation(6, point, frame)).toBe(point);
  });

  it('clears the source when the last checker is moving', () => {
    const frame = buildMoveAnimationFrame(
      createInitialState('vs-human'),
      { from: 8, to: 4, dieIndex: 0 },
      { onFinish: () => {} },
    );
    frame.sourceDisplayCount = 0;

    expect(displayPointDuringAnimation(8, { player: 'white', count: 1 }, frame)).toEqual({
      player: null,
      count: 0,
    });
  });
});

describe('checkerRenderSize', () => {
  it('matches bar and bear-off token sizing', () => {
    expect(checkerRenderSize(32, BAR_POINT)).toBeCloseTo(28.16);
    expect(checkerRenderSize(32, 25)).toBe(Math.round(32 * 0.78));
    expect(checkerRenderSize(32, 8)).toBe(32);
  });
});

describe('animationKey', () => {
  it('changes when a second checker leaves the same point', () => {
    const frame = buildMoveAnimationFrame(
      createInitialState('vs-human'),
      { from: 6, to: 4, dieIndex: 0 },
      { onFinish: () => {} },
    );

    expect(animationKey(frame)).not.toBe(animationKey({ ...frame, sourceStackCount: frame.sourceStackCount - 1 }));
  });
});

describe('isBoardHighlightActive', () => {
  it('hides selection tints while a checker is animating', () => {
    const frame = buildMoveAnimationFrame(
      createInitialState('vs-human'),
      { from: 8, to: 4, dieIndex: 0 },
      { onFinish: () => {} },
    );

    expect(isBoardHighlightActive(null)).toBe(true);
    expect(isBoardHighlightActive(frame)).toBe(false);
  });
});

describe('countAtPoint', () => {
  it('reads bar and point counts', () => {
    const state = createInitialState('vs-human');
    expect(countAtPoint(state, BAR_POINT, 'white')).toBe(0);
    expect(countAtPoint(state, 24, 'white')).toBeGreaterThan(0);
  });
});

describe('checkerSlideTransform', () => {
  const from = { x: 40, y: 200 };
  const to = { x: 160, y: 20 };

  /** Where the proxy's center lands, given it is placed centered on `from`. */
  function centerAt(t: number) {
    const [dx, dy] = checkerSlideTransform({ from, to, fromSize: 30, toSize: 24, t });
    return { x: from.x + (dx as { translateX: number }).translateX, y: from.y + (dy as { translateY: number }).translateY };
  }

  it('starts at the source at full size', () => {
    expect(centerAt(0)).toEqual({ x: 40, y: 200 });
    const [, , scale] = checkerSlideTransform({ from, to, fromSize: 30, toSize: 24, t: 0 });
    expect(scale).toEqual({ scale: 1 });
  });

  it('lands centered on the destination at the destination size', () => {
    expect(centerAt(1)).toEqual(to);
    const [, , scale] = checkerSlideTransform({ from, to, fromSize: 30, toSize: 24, t: 1 });
    expect(scale).toEqual({ scale: 0.8 });
  });

  it('follows the same straight path the old left/top slide did', () => {
    expect(centerAt(0.5)).toEqual({ x: 100, y: 110 });
  });

  it('translates before scaling so the checker grows about its center', () => {
    const keys = checkerSlideTransform({ from, to, fromSize: 30, toSize: 24, t: 0.5 }).map(step => Object.keys(step)[0]);
    expect(keys).toEqual(['translateX', 'translateY', 'scale']);
  });
});
