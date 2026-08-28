import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState } from '@/lib/game/types';
import { getCheckerAnchor, resolveDropTarget } from '@/features/game/board-point-layout';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';
import { getMovableSources } from '@/lib/game/move-hints';
import { getReachableDestinations, opponent } from '@/lib/game/moves';

/** When two legal hits are this close, prefer the geometric cell if it is one of them. */
const CONTEST_PX = 12;

type RankedHit = {
  point: number;
  dist2: number;
};

type BoardHitContext = {
  state: GameState;
  dims: BoardDimensions;
  extraCandidates?: ReadonlySet<number>;
};

type BoardTap = BoardHitContext & {
  x: number;
  y: number;
};

type ColumnHit = BoardHitContext & {
  pointIndex: number;
};

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function isOnPlayingSurface(tap: { x: number; y: number }, dims: BoardDimensions): boolean {
  const pad = dims.checkerSize;
  return tap.x >= -pad && tap.y >= -pad && tap.x <= dims.boardWidth + pad && tap.y <= dims.boardHeight + pad;
}

/** Pixel radius for snapping empty wood when more than one legal origin/dest exists. */
function multiSnapPx(dims: BoardDimensions): number {
  return dims.colWidth * 1.75;
}

/** Pixel target for a point/bar/bear-off — top checker, or the empty-point home. */
export function pointTouchAnchor(
  pointIndex: number,
  state: GameState,
  dims: BoardDimensions,
): { x: number; y: number } {
  if (pointIndex === BAR_POINT) {
    return getCheckerAnchor({
      pointIndex: BAR_POINT,
      dims,
      stackCount: Math.max(1, state.bar[state.currentPlayer]),
      player: state.currentPlayer,
    });
  }
  if (pointIndex === BEAR_OFF) {
    return getCheckerAnchor({
      pointIndex: BEAR_OFF,
      dims,
      stackCount: Math.max(1, state.borneOff[state.currentPlayer]),
      player: state.currentPlayer,
    });
  }
  const point = state.points[pointIndex];
  return getCheckerAnchor({
    pointIndex,
    dims,
    stackCount: Math.max(1, point?.count ?? 1),
    player: point?.player ?? state.currentPlayer,
  });
}

function rankHits(tap: BoardTap, candidates: readonly number[]): RankedHit[] {
  return candidates
    .map((point) => {
      const anchor = pointTouchAnchor(point, tap.state, tap.dims);
      return { point, dist2: dist2(tap, anchor) };
    })
    .sort((a, b) => a.dist2 - b.dist2 || a.point - b.point);
}

function pickNearest(opts: {
  tap: BoardTap;
  candidates: readonly number[];
  geometric: number | null;
  maxDistPx?: number;
}): RankedHit | null {
  const ranked = rankHits(opts.tap, opts.candidates);
  const best = ranked[0];
  if (!best) {
    return null;
  }
  if (opts.maxDistPx != null && Math.sqrt(best.dist2) > opts.maxDistPx) {
    return null;
  }
  const second = ranked[1];
  if (second && opts.geometric !== null) {
    const gap = Math.sqrt(second.dist2) - Math.sqrt(best.dist2);
    if (gap < CONTEST_PX && (opts.geometric === best.point || opts.geometric === second.point)) {
      return ranked.find(h => h.point === opts.geometric) ?? best;
    }
  }
  return best;
}

export function boardHitExtraCandidates(
  emphasisPoints?: ReadonlySet<number>,
  emphasisBar?: boolean,
): ReadonlySet<number> | undefined {
  if (!emphasisPoints?.size && !emphasisBar) {
    return undefined;
  }
  const extra = new Set(emphasisPoints);
  if (emphasisBar) {
    extra.add(BAR_POINT);
  }
  return extra;
}

function originSet(ctx: BoardHitContext): Set<number> {
  const origins = getMovableSources(ctx.state);
  ctx.extraCandidates?.forEach(point => origins.add(point));
  return origins;
}

function destinationList(state: GameState): number[] {
  if (state.selectedPoint === null) {
    return [];
  }
  return [...getReachableDestinations(state, state.selectedPoint).keys()];
}

function columnMate(pointIndex: number): number | null {
  if (pointIndex < 1 || pointIndex > 24) {
    return null;
  }
  return 25 - pointIndex;
}

function holdsCurrentPlayerChecker(state: GameState, pointIndex: number): boolean {
  if (pointIndex === BEAR_OFF) {
    return false;
  }
  if (pointIndex === BAR_POINT) {
    return state.bar[state.currentPlayer] > 0;
  }
  const point = state.points[pointIndex];
  return !!point && point.count > 0 && point.player === state.currentPlayer;
}

function isOpponentOccupied(state: GameState, pointIndex: number): boolean {
  if (pointIndex === BEAR_OFF) {
    return false;
  }
  if (pointIndex === BAR_POINT) {
    return state.bar[state.currentPlayer] === 0
      && state.bar[opponent(state.currentPlayer)] > 0;
  }
  const point = state.points[pointIndex];
  return !!point && point.count > 0 && point.player !== null && point.player !== state.currentPlayer;
}

/**
 * Map a board-local tap/drag to a legal origin or destination.
 * Voronoi among legal origins so a wide unique target cannot steal from a closer legal checker.
 */
export function hitTestFatFinger(tap: BoardTap): number | null {
  if (!isOnPlayingSurface(tap, tap.dims)) {
    return null;
  }

  const origins = originSet(tap);
  const dests = destinationList(tap.state);
  const geometric = resolveDropTarget(tap.x, tap.y, tap.dims);

  if (geometric !== null && origins.has(geometric)) {
    return geometric;
  }
  if (geometric !== null && dests.includes(geometric)) {
    return geometric;
  }
  // Never retarget an immovable own checker onto a neighbor / the bar.
  if (geometric !== null && holdsCurrentPlayerChecker(tap.state, geometric) && !origins.has(geometric)) {
    return geometric;
  }
  // Same-column opponent stack (1 vs 24, 6 vs 19, …) belongs to the mate, not a nearer far-side origin.
  if (geometric !== null && isOpponentOccupied(tap.state, geometric)) {
    const mate = columnMate(geometric);
    if (mate !== null && origins.has(mate)) {
      return mate;
    }
  }

  const uniqueOrigin = origins.size === 1;
  const originPick = pickNearest({
    tap,
    candidates: [...origins],
    geometric,
    maxDistPx: uniqueOrigin ? undefined : multiSnapPx(tap.dims),
  });
  const destPick = dests.length > 0
    ? pickNearest({
        tap,
        candidates: dests,
        geometric,
        maxDistPx: dests.length === 1 ? undefined : multiSnapPx(tap.dims),
      })
    : null;

  if (destPick && tap.state.selectedPoint !== null) {
    const originCloser
      = originPick != null
        && originPick.point !== tap.state.selectedPoint
        && originPick.dist2 + 1 < destPick.dist2;
    if (!originCloser) {
      return destPick.point;
    }
  }

  if (originPick) {
    return originPick.point;
  }

  return geometric;
}

/** Remap a geometric column/bar/tray index using that cell's home as the tap. */
export function remapTapIndex(hit: ColumnHit): number {
  const tap = pointTouchAnchor(hit.pointIndex, hit.state, hit.dims);
  return hitTestFatFinger({ ...hit, x: tap.x, y: tap.y }) ?? hit.pointIndex;
}

/**
 * Which checker a pan on this column/bar should lift. Null = do not start a drag
 * (opponent piece, own immovable checker, or no legal origin claims this wood).
 */
export function resolveColumnDragOrigin(hit: ColumnHit): number | null {
  if (isOpponentOccupied(hit.state, hit.pointIndex)) {
    return null;
  }
  const origins = originSet(hit);
  if (origins.has(hit.pointIndex)) {
    return hit.pointIndex;
  }
  if (holdsCurrentPlayerChecker(hit.state, hit.pointIndex)) {
    return null;
  }
  const remapped = remapTapIndex(hit);
  return origins.has(remapped) ? remapped : null;
}

/**
 * Pan origin for a geometric cell, including rolling-phase roll-nudge drags
 * (own checkers only — no fat-finger remap before dice are out).
 */
export function resolvePanOrigin(hit: ColumnHit): number | null {
  if (hit.state.phase === 'rolling' || hit.state.phase === 'opening-roll') {
    if (hit.pointIndex === BAR_POINT) {
      return hit.state.bar[hit.state.currentPlayer] > 0 ? BAR_POINT : null;
    }
    if (hit.pointIndex === BEAR_OFF) {
      return null;
    }
    const point = hit.state.points[hit.pointIndex];
    if (point && point.count > 0 && point.player === hit.state.currentPlayer) {
      return hit.pointIndex;
    }
    return null;
  }
  if (hit.state.phase !== 'moving') {
    return null;
  }
  return resolveColumnDragOrigin(hit);
}

/** Drop / tap destination with slop among legal to-points (and bear-off). */
export function resolveFatFingerDrop(opts: {
  x: number;
  y: number;
  state: GameState;
  from: number;
  dims: BoardDimensions;
}): number | null {
  const dests = [...getReachableDestinations(opts.state, opts.from).keys()];
  const geometric = resolveDropTarget(opts.x, opts.y, opts.dims);
  if (geometric === opts.from) {
    return opts.from;
  }
  if (geometric !== null && dests.includes(geometric)) {
    return geometric;
  }
  if (dests.length === 0) {
    return geometric;
  }
  if (!isOnPlayingSurface(opts, opts.dims)) {
    return geometric;
  }
  if (dests.length === 1) {
    return dests[0]!;
  }
  const nearest = pickNearest({
    tap: { x: opts.x, y: opts.y, state: opts.state, dims: opts.dims },
    candidates: dests,
    geometric,
    maxDistPx: multiSnapPx(opts.dims),
  });
  return nearest?.point ?? geometric;
}
