import type { MoveLogEntry } from './move-log';
import type { GameState, Player } from './types';
import { BAR_POINT, BEAR_OFF } from './constants';
import { isNoMoveLogEntry, mergeSnapshotIntoState } from './move-log';
import { applyMove, getLegalMoves, opponent } from './moves';

function cloneBoard(state: GameState): GameState {
  return {
    ...state,
    points: state.points.map(p => ({ ...p })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
    remainingDice: [...state.remainingDice],
    legalMovesForSelected: [],
    selectedPoint: null,
  };
}

function addChecker(state: GameState, point: number, player: Player): void {
  if (point === BAR_POINT) {
    state.bar[player]++;
    return;
  }
  const pt = state.points[point];
  if (pt.player === player || pt.player === null) {
    state.points[point] = { player, count: pt.count + 1 };
  }
}

function removeChecker(state: GameState, point: number, player: Player): void {
  if (point === BAR_POINT) {
    state.bar[player]--;
    return;
  }
  const pt = state.points[point];
  pt.count--;
  if (pt.count <= 0) {
    state.points[point] = { player: null, count: 0 };
  }
}

function unapplyLogEntry(state: GameState, entry: MoveLogEntry): GameState {
  if (isNoMoveLogEntry(entry)) {
    return cloneBoard(state);
  }
  const player = entry.player;
  const opp = opponent(player);
  const next = cloneBoard(state);

  if (entry.to === BEAR_OFF) {
    next.borneOff[player]--;
    addChecker(next, entry.from, player);
  }
  else {
    const dest = next.points[entry.to];
    const likelyHit = dest.player === player
      && dest.count === 1
      && next.bar[opp] > 0;

    removeChecker(next, entry.to, player);

    if (likelyHit) {
      next.points[entry.to] = { player: opp, count: 1 };
      next.bar[opp]--;
    }
  }

  if (entry.from === BAR_POINT) {
    next.bar[player]++;
  }
  else {
    addChecker(next, entry.from, player);
  }

  next.currentPlayer = player;
  return next;
}

/** Derive pre-game replay baseline by rewinding the move log from the live board. */
export function deriveReplayBaseline(
  current: GameState,
  entries: MoveLogEntry[],
): GameState {
  let state = cloneBoard(current);
  for (let i = entries.length - 1; i >= 0; i--) {
    state = unapplyLogEntry(state, entries[i]!);
  }
  const first = entries[0];
  return {
    ...state,
    mode: current.mode,
    openingRolls: current.openingRolls,
    winner: null,
    phase: first ? 'moving' : current.phase,
    currentPlayer: first?.player ?? current.currentPlayer,
    dice: first?.dice ?? current.dice,
    remainingDice: first ? [...first.dice] : [...current.remainingDice],
  };
}

export function resolveMoveFromLogEntry(state: GameState, entry: MoveLogEntry) {
  if (isNoMoveLogEntry(entry)) {
    return null;
  }
  return getLegalMoves(state).find(m => m.from === entry.from && m.to === entry.to) ?? null;
}

/** Board + dice at ply `N` (0 = baseline before any logged move). */
export function stateAtPly(
  baseline: GameState,
  entries: MoveLogEntry[],
  ply: number,
): GameState {
  if (ply <= 0) {
    return {
      ...baseline,
      selectedPoint: null,
      legalMovesForSelected: [],
    };
  }

  const entry = entries[ply - 1];
  if (entry?.after) {
    return mergeSnapshotIntoState(baseline, entry.after);
  }

  return reconstructStateAtPlyLegacy(baseline, entries, ply);
}

function reconstructStateAtPlyLegacy(
  baseline: GameState,
  entries: MoveLogEntry[],
  ply: number,
): GameState {
  let state = baseline;
  const limit = Math.min(ply, entries.length);

  for (let i = 0; i < limit; i++) {
    const entry = entries[i]!;
    if (isNoMoveLogEntry(entry)) {
      continue;
    }
    const move = resolveMoveFromLogEntry(state, entry);
    if (!move) {
      break;
    }
    state = applyMove(state, move);
  }

  return {
    ...state,
    selectedPoint: null,
    legalMovesForSelected: [],
  };
}

/** Backfill missing snapshots by replaying from baseline (one-time migration). */
export function backfillMoveLogSnapshots(
  baseline: GameState,
  entries: MoveLogEntry[],
): MoveLogEntry[] {
  if (entries.every(entry => entry.after)) {
    return entries;
  }

  let state = baseline;
  return entries.map((entry) => {
    if (entry.after) {
      state = mergeSnapshotIntoState(baseline, entry.after);
      return entry;
    }
    if (isNoMoveLogEntry(entry)) {
      return entry;
    }
    const move = resolveMoveFromLogEntry(state, entry);
    if (!move) {
      return entry;
    }
    state = applyMove(state, move);
    return {
      ...entry,
      after: {
        points: state.points.map(p => ({ ...p })),
        bar: { ...state.bar },
        borneOff: { ...state.borneOff },
        dice: [...state.dice] as [number, number],
        remainingDice: [...state.remainingDice],
        currentPlayer: state.currentPlayer,
        phase: state.phase,
      },
    };
  });
}
