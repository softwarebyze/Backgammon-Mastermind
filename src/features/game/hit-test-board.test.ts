import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { getCheckerAnchor } from '@/features/game/board-point-layout';
import {
  boardHitExtraCandidates,
  hitTestFatFinger,
  remapTapIndex,
  resolveColumnDragOrigin,
  resolveFatFingerDrop,
  resolvePanOrigin,
} from '@/features/game/hit-test-board';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';
import { createPositionState } from '@/lib/game/create-position';
import { getMovableSources } from '@/lib/game/move-hints';

const DIMS: BoardDimensions = {
  boardWidth: 400,
  boardHeight: 200,
  boardFrameWidth: 4,
  boardOuterWidth: 408,
  boardOuterHeight: 208,
  colWidth: 28,
  checkerSize: 24,
  pointHeight: 94,
  barWidth: 28,
  bearOffWidth: 38,
  middleHeight: 12,
};

function tapOn(point: number, state = createPositionState()) {
  return getCheckerAnchor({
    pointIndex: point,
    dims: DIMS,
    stackCount: 1,
    player: state.currentPlayer,
  });
}

function hitAt(x: number, y: number, state: ReturnType<typeof createPositionState>) {
  return hitTestFatFinger({ x, y, state, dims: DIMS });
}

function remap(state: ReturnType<typeof createPositionState>, pointIndex: number, extra?: ReadonlySet<number>) {
  return remapTapIndex({ state, pointIndex, dims: DIMS, extraCandidates: extra });
}

function dragOrigin(state: ReturnType<typeof createPositionState>, pointIndex: number) {
  return resolveColumnDragOrigin({ state, pointIndex, dims: DIMS });
}

function panOrigin(state: ReturnType<typeof createPositionState>, pointIndex: number) {
  return resolvePanOrigin({ state, pointIndex, dims: DIMS });
}

function dropAt(
  point: { x: number; y: number },
  state: ReturnType<typeof createPositionState>,
  from: number,
) {
  return resolveFatFingerDrop({ x: point.x, y: point.y, state, from, dims: DIMS });
}

describe('hitTestFatFinger origins', () => {
  it('single legal origin claims nearby empty wood', () => {
    const state = createPositionState({
      placements: [{ point: 8, player: 'white', count: 1 }],
      dice: [3, 5],
    });
    expect([...getMovableSources(state)]).toEqual([8]);

    const empty = tapOn(10, state);
    expect(hitAt(empty.x, empty.y, state)).toBe(8);
    expect(remap(state, 9)).toBe(8);
    expect(remap(state, 24)).toBe(8);
  });

  it('two adjacent legal origins never swap', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 9, player: 'white', count: 1 },
      ],
      dice: [2, 3],
    });
    const sources = getMovableSources(state);
    expect(sources.has(8)).toBe(true);
    expect(sources.has(9)).toBe(true);

    expect(remap(state, 8)).toBe(8);
    expect(remap(state, 9)).toBe(9);
    // Empty 10 sits beside 9, not 8.
    expect(remap(state, 10)).toBe(9);
  });

  it('illegal point does not win over a nearby legal one', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 7, player: 'black', count: 2 },
      ],
      dice: [3, 4],
    });
    expect(getMovableSources(state).has(8)).toBe(true);
    expect(getMovableSources(state).has(7)).toBe(false);

    expect(remap(state, 7)).toBe(8);
    const onBlack = tapOn(7, state);
    expect(hitAt(onBlack.x, onBlack.y, state)).toBe(8);
  });

  it('bar vs point 24: unique bar claims empty 24 wood', () => {
    const state = createPositionState({
      bar: { white: 1 },
      dice: [2, 4],
    });
    expect([...getMovableSources(state)]).toEqual([BAR_POINT]);
    expect(remap(state, 24)).toBe(BAR_POINT);
    expect(remap(state, 1)).toBe(BAR_POINT);
  });

  it('bar vs point 24: unique 24 claims the bar wood', () => {
    const state = createPositionState({
      placements: [{ point: 24, player: 'white', count: 1 }],
      dice: [1, 2],
    });
    expect([...getMovableSources(state)]).toEqual([24]);
    expect(remap(state, BAR_POINT)).toBe(24);
  });

  it('bar vs 24/1: same-column 1 snaps to 24, not 6; opponent 1 is not draggable', () => {
    const state = createPositionState({
      useStandardSetup: true,
      dice: [1, 2],
      currentPlayer: 'white',
    });
    expect(getMovableSources(state).has(24)).toBe(true);
    expect(getMovableSources(state).has(6)).toBe(true);
    expect(remap(state, 24)).toBe(24);
    expect(remap(state, 1)).toBe(24);
    expect(dragOrigin(state, 1)).toBeNull();
    expect(remap(state, 6)).toBe(6);
  });

  it('does not retarget an immovable own checker onto the bar', () => {
    const state = createPositionState({
      placements: [{ point: 24, player: 'white', count: 1 }],
      bar: { white: 1 },
      dice: [1, 2],
    });
    expect([...getMovableSources(state)]).toEqual([BAR_POINT]);
    expect(remap(state, 24)).toBe(24);
    expect(remap(state, 23)).toBe(BAR_POINT);
    expect(dragOrigin(state, 24)).toBeNull();
    expect(dragOrigin(state, 23)).toBe(BAR_POINT);
  });

  it('learn extraCandidates: unique emphasis claims nearby empty wood', () => {
    const state = createPositionState({
      useStandardSetup: true,
    });
    const extra = boardHitExtraCandidates(new Set([24]));
    expect(remap(state, 23, extra)).toBe(24);
    expect(remap(state, 22, extra)).toBe(24);
  });

  it('learn extraCandidates: two adjacent emphasis points never swap', () => {
    const state = createPositionState({ useStandardSetup: true });
    const extra = boardHitExtraCandidates(new Set([8, 6]));
    expect(remap(state, 8, extra)).toBe(8);
    expect(remap(state, 6, extra)).toBe(6);
  });
});

describe('resolveColumnDragOrigin', () => {
  it('lifts the only blot when panning empty neighbor wood', () => {
    const state = createPositionState({
      placements: [{ point: 8, player: 'white', count: 1 }],
      dice: [3, 5],
    });
    expect(dragOrigin(state, 8)).toBe(8);
    expect(dragOrigin(state, 9)).toBe(8);
    expect(dragOrigin(state, 10)).toBe(8);
  });

  it('does not start a drag on an opponent checker', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 7, player: 'black', count: 2 },
      ],
      dice: [3, 4],
    });
    expect(dragOrigin(state, 7)).toBeNull();
    expect(dragOrigin(state, 8)).toBe(8);
  });

  it('does not let a wide unique target steal from a closer legal checker', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 9, player: 'white', count: 1 },
      ],
      dice: [2, 3],
    });
    expect(dragOrigin(state, 8)).toBe(8);
    expect(dragOrigin(state, 9)).toBe(9);
  });

  it('does not start a drag on opponent bar checkers', () => {
    const state = createPositionState({
      placements: [{ point: 8, player: 'white', count: 1 }],
      bar: { black: 2 },
      dice: [3, 5],
    });
    expect(dragOrigin(state, BAR_POINT)).toBeNull();
    expect(remap(state, BAR_POINT)).toBe(8);
  });
});

describe('resolvePanOrigin', () => {
  it('uses own checkers only while rolling (no empty-wood remap)', () => {
    const state = createPositionState({
      placements: [{ point: 8, player: 'white', count: 1 }],
    });
    expect(state.phase).toBe('rolling');
    expect(panOrigin(state, 8)).toBe(8);
    expect(panOrigin(state, 9)).toBeNull();
  });
});

describe('resolveFatFingerDrop', () => {
  it('unique destination claims nearby empty wood', () => {
    const state = createPositionState({
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 3, player: 'black', count: 2 },
      ],
      dice: [3, 5],
    });
    const selected = { ...state, selectedPoint: 8 };
    const on6 = tapOn(6, selected);
    expect(dropAt(on6, selected, 8)).toBe(5);
    expect(remap(selected, 4)).toBe(5);
    const on4 = tapOn(4, selected);
    expect(dropAt(on4, selected, 8)).toBe(5);
  });

  it('unique bear-off claims empty home-board wood', () => {
    const state = createPositionState({
      placements: [
        { point: 2, player: 'white', count: 1 },
        { point: 1, player: 'white', count: 14 },
      ],
      dice: [2, 2],
    });
    const on4 = tapOn(4, state);
    expect(dropAt(on4, state, 2)).toBe(BEAR_OFF);
  });

  it('geometric legal dest still wins over a farther dest', () => {
    const state = createPositionState({
      placements: [{ point: 8, player: 'white', count: 1 }],
      dice: [2, 3],
    });
    const on6 = tapOn(6, state);
    expect(dropAt(on6, state, 8)).toBe(6);
    const on5 = tapOn(5, state);
    expect(dropAt(on5, state, 8)).toBe(5);
  });
});
