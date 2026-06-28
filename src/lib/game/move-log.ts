import type { BoardPoint, GamePhase, GameState, Move, Player } from './types';
import { BAR_POINT, BEAR_OFF } from './constants';

/** Compact post-move state for reliable replay (no re-simulating dice/turns). */
export type ReplaySnapshot = {
  points: BoardPoint[];
  bar: Record<Player, number>;
  borneOff: Record<Player, number>;
  dice: [number, number];
  remainingDice: number[];
  currentPlayer: Player;
  phase: GamePhase;
};

export type MoveLogEntry = {
  ply: number;
  player: Player;
  dice: [number, number];
  from: number;
  to: number;
  /** Present on new entries; legacy logs backfilled on load. */
  after?: ReplaySnapshot;
};

export function captureReplaySnapshot(state: GameState): ReplaySnapshot {
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

function pointLabel(point: number): string {
  if (point === BAR_POINT) {
    return 'bar';
  }
  if (point === BEAR_OFF) {
    return 'off';
  }
  return String(point);
}

export function formatMoveLogEntry(entry: MoveLogEntry): string {
  const who = entry.player === 'white' ? 'White' : 'Black';
  return `${who}: ${pointLabel(entry.from)} → ${pointLabel(entry.to)} (${entry.dice[0]}, ${entry.dice[1]})`;
}

export function appendMoveLogEntry(
  log: MoveLogEntry[],
  ctx: { player: Player; dice: [number, number]; move: Move; after: GameState },
): MoveLogEntry[] {
  return [
    ...log,
    {
      ply: log.length + 1,
      player: ctx.player,
      dice: [...ctx.dice] as [number, number],
      from: ctx.move.from,
      to: ctx.move.to,
      after: captureReplaySnapshot(ctx.after),
    },
  ];
}

export type MoveLogTurn = {
  turnIndex: number;
  player: Player;
  dice: [number, number];
  moves: MoveLogEntry[];
  /** Ply index after last move in this turn. */
  endPly: number;
};

function diceTupleKey(dice: [number, number]): string {
  return `${dice[0]},${dice[1]}`;
}

export function groupMoveLogByTurn(entries: MoveLogEntry[]): MoveLogTurn[] {
  const turns: MoveLogTurn[] = [];

  for (const entry of entries) {
    const last = turns[turns.length - 1];
    if (
      last
      && last.player === entry.player
      && diceTupleKey(last.dice) === diceTupleKey(entry.dice)
    ) {
      last.moves.push(entry);
      last.endPly = entry.ply;
      continue;
    }

    turns.push({
      turnIndex: turns.length + 1,
      player: entry.player,
      dice: entry.dice,
      moves: [entry],
      endPly: entry.ply,
    });
  }

  return turns;
}

export function formatPointShort(point: number): string {
  if (point === BAR_POINT) {
    return 'bar';
  }
  if (point === BEAR_OFF) {
    return 'off';
  }
  return String(point);
}

export function formatTurnMoveSummary(moves: MoveLogEntry[]): string {
  return moves
    .map(entry => `${formatPointShort(entry.from)}→${formatPointShort(entry.to)}`)
    .join(' · ');
}

/** Which turn (1-based) contains this ply index. */
export function turnIndexForPly(entries: MoveLogEntry[], ply: number): number {
  if (ply <= 0) {
    return 0;
  }
  const turns = groupMoveLogByTurn(entries);
  for (const turn of turns) {
    const startPly = turn.endPly - turn.moves.length + 1;
    if (ply >= startPly && ply <= turn.endPly) {
      return turn.turnIndex;
    }
  }
  return turns.length;
}

export function mergeSnapshotIntoState(base: GameState, snapshot: ReplaySnapshot): GameState {
  return {
    ...base,
    points: snapshot.points.map(p => ({ ...p })),
    bar: { ...snapshot.bar },
    borneOff: { ...snapshot.borneOff },
    dice: [...snapshot.dice] as [number, number],
    remainingDice: [...snapshot.remainingDice],
    currentPlayer: snapshot.currentPlayer,
    phase: snapshot.phase,
    selectedPoint: null,
    legalMovesForSelected: [],
    winner: snapshot.phase === 'game-over' ? snapshot.currentPlayer : null,
  };
}
