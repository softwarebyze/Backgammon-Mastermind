import type { BoardPoint, GamePhase, GameState, Move, Player } from './types';
import { BAR_POINT, BEAR_OFF } from './constants';

/** Sentinel points for a logged roll with zero legal moves. */
const NO_MOVE_FROM = -1;
const NO_MOVE_TO = -1;

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
  /** True when this move hit a blot. Present on new entries. */
  hit?: boolean;
  /** Present on new entries; legacy logs backfilled on load. */
  after?: ReplaySnapshot;
};

export function isNoMoveLogEntry(entry: MoveLogEntry): boolean {
  return entry.from === NO_MOVE_FROM && entry.to === NO_MOVE_TO;
}

function captureReplaySnapshot(state: GameState): ReplaySnapshot {
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
  if (isNoMoveLogEntry(entry)) {
    return `${who}: no move (${entry.dice[0]}, ${entry.dice[1]})`;
  }
  return `${who}: ${pointLabel(entry.from)} → ${pointLabel(entry.to)} (${entry.dice[0]}, ${entry.dice[1]})`;
}

export function appendMoveLogEntry(
  log: MoveLogEntry[],
  ctx: {
    player: Player;
    dice: [number, number];
    move: Move;
    after: GameState;
    /** Pre-move board — used to record whether this ply hit a blot. */
    before?: GameState;
  },
): MoveLogEntry[] {
  const opp = ctx.player === 'white' ? 'black' : 'white';
  const dest = ctx.before && ctx.move.to >= 1 && ctx.move.to <= 24
    ? ctx.before.points[ctx.move.to]
    : null;
  const hit = dest
    ? dest.player === opp && dest.count === 1
    : undefined;
  return [
    ...log,
    {
      ply: log.length + 1,
      player: ctx.player,
      dice: [...ctx.dice] as [number, number],
      from: ctx.move.from,
      to: ctx.move.to,
      ...(hit !== undefined ? { hit } : {}),
      after: captureReplaySnapshot(ctx.after),
    },
  ];
}

/** Log a roll that had zero legal moves so history still shows the dice. */
export function appendNoMoveLogEntry(
  log: MoveLogEntry[],
  ctx: { player: Player; dice: [number, number]; after: GameState },
): MoveLogEntry[] {
  // Skip if this roll already has log entries (partial play, or already recorded).
  if (turnAlreadyLogged(log, ctx.player, ctx.dice)) {
    return log;
  }
  return [
    ...log,
    {
      ply: log.length + 1,
      player: ctx.player,
      dice: [...ctx.dice] as [number, number],
      from: NO_MOVE_FROM,
      to: NO_MOVE_TO,
      after: captureReplaySnapshot(ctx.after),
    },
  ];
}

function turnAlreadyLogged(
  log: MoveLogEntry[],
  player: Player,
  dice: [number, number],
): boolean {
  const last = log[log.length - 1];
  return !!last
    && last.player === player
    && diceTupleKey(last.dice) === diceTupleKey(dice);
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
    const previous = last?.moves[last.moves.length - 1];
    // Snapshot-aware: same player+dice after a no-move handoff is a new turn.
    const continuesTurn = previous?.after
      ? previous.after.currentPlayer === entry.player
      : true;
    if (
      last
      && last.player === entry.player
      && diceTupleKey(last.dice) === diceTupleKey(entry.dice)
      && continuesTurn
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

/**
 * Live mid-turn: omit the current player's unfinished turn so the strip only
 * shows completed history (Live owns the in-progress dice).
 */
export function turnsForReviewStrip(
  entries: MoveLogEntry[],
  opts: { hideInProgressFor?: Player | null } = {},
): MoveLogTurn[] {
  const turns = groupMoveLogByTurn(entries);
  const hideFor = opts.hideInProgressFor;
  if (!hideFor || turns.length === 0) {
    return turns;
  }
  const last = turns[turns.length - 1]!;
  if (last.player !== hideFor) {
    return turns;
  }
  // No-move rolls are finished turns (show ×), not in-progress.
  if (last.moves.length === 1 && last.moves[0] && isNoMoveLogEntry(last.moves[0])) {
    return turns;
  }
  if (unusedDiceInTurn(last) > 0) {
    return turns.slice(0, -1);
  }
  return turns;
}

function formatPointShort(point: number): string {
  if (point === BAR_POINT) {
    return 'bar';
  }
  if (point === BEAR_OFF) {
    return 'off';
  }
  return String(point);
}

export function formatTurnMoveSummary(moves: MoveLogEntry[]): string {
  if (moves.length === 1 && moves[0] && isNoMoveLogEntry(moves[0])) {
    return 'no move';
  }
  return moves
    .filter(entry => !isNoMoveLogEntry(entry))
    .map(entry => `${formatPointShort(entry.from)}→${formatPointShort(entry.to)}`)
    .join(' · ');
}

/** How many dice from the roll were left unused (partial or full no-move). */
export function unusedDiceInTurn(turn: MoveLogTurn): number {
  const rolled = turn.dice[0] === turn.dice[1] ? 4 : 2;
  const played = turn.moves.filter(m => !isNoMoveLogEntry(m)).length;
  return Math.max(0, rolled - played);
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
