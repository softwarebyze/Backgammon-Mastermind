/**
 * Right-to-left board layout.
 *
 * React Native mirrors the board's flex rows natively, so in an RTL locale the
 * rendered board is a left-right reflection of the LTR geometry. Board-local x
 * values that reach the screen (checker anchors, move arrows, drag previews) or
 * come from a touch have to cross that mirror, otherwise the drawn geometry
 * disagrees with the checkers underneath it:
 *
 *   - hint/review arrows pointed at the wrong end of the board
 *   - drag-and-drop resolved to the point on the opposite side
 *   - the direction lane exited on the wrong side and pointed the wrong way
 *
 * `dims.rtl` is the single source of truth. `getCheckerAnchor` emits mirrored x
 * and `resolveDropTarget` accepts mirrored x, so every consumer that already
 * works in screen space stays correct without extra bookkeeping.
 */
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';

import {
  getCheckerAnchor,
  resolveDropTarget,
} from '@/features/game/board-point-layout';
import { movePathAnchors } from '@/features/game/components/board/move-path-anchors';
import { BAR_POINT, BEAR_OFF, createInitialState } from '@/lib/game/constants';

function dims(rtl: boolean): BoardDimensions {
  const boardWidth = 400;
  const boardFrameWidth = 4;
  const barWidth = 28;
  const bearOffWidth = 38;
  const colWidth = (boardWidth - barWidth - bearOffWidth) / 12;
  const checkerSize = 28;
  const pointHeight = 150;
  const middleHeight = 12;
  return {
    boardWidth,
    boardHeight: pointHeight * 2 + middleHeight,
    boardFrameWidth,
    boardOuterWidth: boardWidth + boardFrameWidth * 2,
    boardOuterHeight: pointHeight * 2 + middleHeight + boardFrameWidth * 2,
    colWidth,
    checkerSize,
    pointHeight,
    barWidth,
    bearOffWidth,
    middleHeight,
    rtl,
  };
}

const LTR = dims(false);
const RTL = dims(true);

function anchor(d: BoardDimensions, pointIndex: number, player: 'white' | 'black' = 'white') {
  return getCheckerAnchor({ pointIndex, dims: d, stackCount: 1, player });
}

describe('checker anchors in RTL', () => {
  it('puts the bear-off on the left, mirroring LTR', () => {
    expect(anchor(LTR, BEAR_OFF).x).toBeGreaterThan(LTR.boardWidth - LTR.bearOffWidth);
    expect(anchor(RTL, BEAR_OFF).x).toBeLessThan(RTL.bearOffWidth);
  });

  it('reverses the horizontal order of the columns', () => {
    // Point 1 sits in the rightmost column in LTR; point 13 in the leftmost.
    expect(anchor(LTR, 1).x).toBeGreaterThan(anchor(LTR, 13).x);
    expect(anchor(RTL, 1).x).toBeLessThan(anchor(RTL, 13).x);
  });

  it('mirrors the bar along with the rest of the board', () => {
    // The bar is not at the true centre — the bear-off strip occupies the far
    // edge, so the bar sits off-centre and swaps sides in RTL.
    expect(anchor(LTR, BAR_POINT).x).toBeLessThan(LTR.boardWidth / 2);
    expect(anchor(RTL, BAR_POINT).x).toBeGreaterThan(RTL.boardWidth / 2);
    expect(anchor(RTL, BAR_POINT).x).toBeCloseTo(
      LTR.boardWidth - anchor(LTR, BAR_POINT).x,
      5,
    );
  });

  it('is an exact reflection of the LTR layout', () => {
    for (let point = 1; point <= 24; point++) {
      expect(anchor(RTL, point).x).toBeCloseTo(LTR.boardWidth - anchor(LTR, point).x, 5);
    }
  });

  it('leaves vertical positions untouched', () => {
    for (let point = 1; point <= 24; point++) {
      expect(anchor(RTL, point).y).toBe(anchor(LTR, point).y);
    }
  });
});

describe('drop targets in RTL', () => {
  it('puts point 24 in the rendered leftmost point column', () => {
    const rtl24 = anchor(RTL, 24);
    expect(resolveDropTarget(rtl24.x, rtl24.y, RTL)).toBe(24);
    // Bear-off is the only thing further left in RTL.
    expect(anchor(RTL, BEAR_OFF).x).toBeLessThan(rtl24.x);
    // Every other point column renders to its right (point 1 shares 24's column).
    for (const point of [6, 7, 13, 18, 19, 23]) {
      expect(anchor(RTL, point).x).toBeGreaterThan(rtl24.x);
    }
  });

  it('resolves a touch on the rendered bear-off strip', () => {
    const y = RTL.checkerSize / 2;
    const x = RTL.bearOffWidth / 2;
    expect(resolveDropTarget(x, y, RTL)).toBe(BEAR_OFF);
    expect(resolveDropTarget(x, y, LTR)).not.toBe(BEAR_OFF);
  });

  it('round-trips every anchor back to its own point', () => {
    for (const d of [LTR, RTL]) {
      for (let point = 1; point <= 24; point++) {
        for (const player of ['white', 'black'] as const) {
          const { x, y } = anchor(d, point, player);
          expect(resolveDropTarget(x, y, d)).toBe(point);
        }
      }
      for (const player of ['white', 'black'] as const) {
        const bar = anchor(d, BAR_POINT, player);
        expect(resolveDropTarget(bar.x, bar.y, d)).toBe(BAR_POINT);
        const off = anchor(d, BEAR_OFF, player);
        expect(resolveDropTarget(off.x, off.y, d)).toBe(BEAR_OFF);
      }
    }
  });

  it('still rejects taps outside the surface', () => {
    expect(resolveDropTarget(-1, 10, RTL)).toBeNull();
    expect(resolveDropTarget(RTL.boardWidth + 1, 10, RTL)).toBeNull();
  });
});

describe('move path arrows in RTL', () => {
  function anchorsFor(from: number, to: number, d: BoardDimensions) {
    const state = createInitialState('vs-computer');
    // Occupied so the anchors land on real checker centres.
    state.points[from] = { count: 1, player: 'white' };
    state.points[to] = { count: 1, player: 'white' };
    return movePathAnchors(
      { ply: 1, player: 'white', dice: [3, 1], from, to },
      state,
      d,
    );
  }

  it('points along the direction of play', () => {
    // In LTR a top-row move always travels to the right; mirrored, it travels left.
    const ltr = anchorsFor(19, 20, LTR);
    expect(ltr.to.x).toBeGreaterThan(ltr.from.x);

    const rtl = anchorsFor(19, 20, RTL);
    expect(rtl.to.x).toBeLessThan(rtl.from.x);
  });

  it('keeps the arrow over the points it connects', () => {
    const rtl = anchorsFor(19, 20, RTL);
    expect(resolveDropTarget(rtl.from.x, rtl.from.y, RTL)).toBe(19);
    expect(resolveDropTarget(rtl.to.x, rtl.to.y, RTL)).toBe(20);
  });
});
