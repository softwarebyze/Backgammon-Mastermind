import type { CubeHistoryEvent } from './cube-history';
import type { MoveLogEntry, ReplaySnapshot } from './move-log';
import type { BoardPoint, GamePhase, GameState, Player } from './types';
import { z } from 'zod';

import { TOTAL_CHECKERS } from './constants';
import { acceptDouble, canOfferDouble, dropDouble, offerDouble } from './match';

const PERSISTED_SESSION_VERSION = 1;

const playerSchema = z.enum(['white', 'black']);
const phaseSchema = z.enum(['opening-roll', 'rolling', 'moving', 'no-move', 'game-over']);

const boardPointSchema = z.object({
  player: playerSchema.nullable(),
  count: z.number().int().nonnegative(),
});

const playerCountSchema = z.object({
  white: z.number().int().nonnegative(),
  black: z.number().int().nonnegative(),
});

const diceTupleSchema = z.tuple([z.number(), z.number()]);

const moveSchema = z.object({
  from: z.number().int(),
  to: z.number().int(),
  dieIndex: z.number().int().nonnegative(),
});

const openingRollsSchema = z.object({
  white: z.number().nullable(),
  black: z.number().nullable(),
});

const matchSchema = z.object({
  length: z.number().int().min(1).max(32767),
  score: playerCountSchema,
  cube: z.object({ value: z.number().int().positive().refine(n => Number.isSafeInteger(n) && Math.log2(n) % 1 === 0), owner: z.enum(['white', 'black', 'center']) }),
  pendingOffer: playerSchema.nullable(),
  crawford: z.boolean(),
  crawfordPlayed: z.boolean(),
  crawfordRule: z.boolean().optional(),
  gameNumber: z.number().int().positive(),
  winner: playerSchema.nullable(),
  result: z.object({ winner: playerSchema, points: z.number().int().positive(), kind: z.enum(['single', 'gammon', 'backgammon', 'drop']) }).nullable(),
  undoFloor: z.number().int().nonnegative(),
});

const replaySnapshotSchema = z.object({
  match: matchSchema.optional(),
  points: z.array(boardPointSchema).length(25),
  bar: playerCountSchema,
  borneOff: playerCountSchema,
  dice: diceTupleSchema,
  remainingDice: z.array(z.number()),
  currentPlayer: playerSchema,
  phase: phaseSchema,
});

const gameStateSchema = z.object({
  match: matchSchema.optional(),
  points: z.array(boardPointSchema).length(25),
  bar: playerCountSchema,
  borneOff: playerCountSchema,
  currentPlayer: playerSchema,
  dice: diceTupleSchema,
  remainingDice: z.array(z.number()),
  phase: phaseSchema,
  winner: playerSchema.nullable(),
  mode: z.enum(['vs-computer', 'vs-human']),
  openingRolls: openingRollsSchema.optional(),
  selectedPoint: z.number().int().nullable(),
  legalMovesForSelected: z.array(moveSchema),
});

const moveLogEntrySchema = z.object({
  ply: z.number().int().positive(),
  player: playerSchema,
  dice: diceTupleSchema,
  from: z.number().int(),
  to: z.number().int(),
  hit: z.boolean().optional(),
  after: replaySnapshotSchema.optional(),
});

const cubeHistoryEventSchema = z.object({
  id: z.number().int().positive(),
  kind: z.enum(['offer', 'accept', 'drop']),
  player: playerSchema,
  afterPly: z.number().int().nonnegative(),
  before: gameStateSchema,
  after: gameStateSchema,
});

const persistedSessionSchema = z.object({
  cubeEvents: z.array(cubeHistoryEventSchema).optional(),
  version: z.literal(PERSISTED_SESSION_VERSION),
  state: gameStateSchema,
  moveLog: z.array(moveLogEntrySchema),
  replayBaseline: gameStateSchema.nullable(),
});

export type PersistedSession = {
  cubeEvents?: CubeHistoryEvent[];
  version: typeof PERSISTED_SESSION_VERSION;
  state: GameState;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
};

type SessionParseFailure = {
  ok: false;
  error: string;
};

type SessionParseSuccess = {
  ok: true;
  session: PersistedSession;
};

type SessionParseResult = SessionParseSuccess | SessionParseFailure;

function isDieFace(value: number, allowZero: boolean): boolean {
  if (!Number.isInteger(value)) {
    return false;
  }
  if (allowZero && value === 0) {
    return true;
  }
  return value >= 1 && value <= 6;
}

function countCheckers(state: Pick<GameState, 'points' | 'bar' | 'borneOff'>, player: Player): number {
  let total = state.bar[player] + state.borneOff[player];
  for (const point of state.points) {
    if (point.player === player) {
      total += point.count;
    }
  }
  return total;
}

function occupancyError(points: BoardPoint[]): string | null {
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!;
    if (point.count === 0 && point.player !== null) {
      return `point ${i} has a player with no checkers`;
    }
    if (point.count > 0 && point.player === null) {
      return `point ${i} has checkers with no player`;
    }
  }
  return null;
}

function diceError(dice: [number, number], remainingDice: number[]): string | null {
  if (!isDieFace(dice[0], true) || !isDieFace(dice[1], true)) {
    return 'dice faces must be 0–6';
  }
  if (remainingDice.some(die => !isDieFace(die, false))) {
    return 'remaining dice must be 1–6';
  }
  if (remainingDice.length > 4) {
    return 'remaining dice cannot exceed 4';
  }
  return null;
}

function phaseWinnerError(phase: GamePhase, winner: Player | null): string | null {
  if (phase === 'game-over') {
    return winner == null ? 'game-over requires a winner' : null;
  }
  return winner != null ? 'in-progress games cannot have a winner' : null;
}

function selectedPointError(selectedPoint: number | null): string | null {
  if (selectedPoint == null) {
    return null;
  }
  if (selectedPoint < 0 || selectedPoint > 24) {
    return 'selectedPoint must be null or 0–24';
  }
  return null;
}

function openingRollsError(rolls: GameState['openingRolls']): string | null {
  for (const value of [rolls.white, rolls.black]) {
    if (value == null) {
      continue;
    }
    if (!isDieFace(value, false)) {
      return 'opening rolls must be 1–6';
    }
  }
  return null;
}

export function gameStateInvariantError(state: GameState): string | null {
  const occupancy = occupancyError(state.points);
  if (occupancy) {
    return occupancy;
  }
  if (countCheckers(state, 'white') !== TOTAL_CHECKERS) {
    return 'white must have exactly 15 checkers';
  }
  if (countCheckers(state, 'black') !== TOTAL_CHECKERS) {
    return 'black must have exactly 15 checkers';
  }
  if (state.match && ((state.match.pendingOffer && (state.match.pendingOffer !== state.currentPlayer || !canOfferDouble({ ...state, match: { ...state.match, pendingOffer: null } }))) || (!!state.match.result !== (state.phase === 'game-over')))) {
    return 'invalid match phase or pending cube offer';
  }
  return diceError(state.dice, state.remainingDice)
    ?? phaseWinnerError(state.phase, state.winner)
    ?? selectedPointError(state.selectedPoint)
    ?? openingRollsError(state.openingRolls);
}

function hydrateGameState(raw: z.infer<typeof gameStateSchema>): GameState {
  return {
    ...raw,
    ...(raw.match ? { match: raw.match } : {}),
    points: raw.points.map(point => ({ ...point })),
    bar: { ...raw.bar },
    borneOff: { ...raw.borneOff },
    dice: [...raw.dice] as [number, number],
    remainingDice: [...raw.remainingDice],
    legalMovesForSelected: raw.legalMovesForSelected.map(move => ({ ...move })),
    openingRolls: raw.openingRolls
      ? { ...raw.openingRolls }
      : { white: null, black: null },
  };
}

function hydrateMoveLog(entries: z.infer<typeof moveLogEntrySchema>[]): MoveLogEntry[] {
  return entries.map(entry => ({
    ...entry,
    dice: [...entry.dice] as [number, number],
    after: entry.after ? hydrateSnapshot(entry.after) : undefined,
  }));
}

function hydrateSnapshot(raw: z.infer<typeof replaySnapshotSchema>): ReplaySnapshot {
  return {
    ...(raw.match ? { match: raw.match } : {}),
    points: raw.points.map(point => ({ ...point })),
    bar: { ...raw.bar },
    borneOff: { ...raw.borneOff },
    dice: [...raw.dice] as [number, number],
    remainingDice: [...raw.remainingDice],
    currentPlayer: raw.currentPlayer,
    phase: raw.phase,
  };
}

function invariantErrorForSession(session: PersistedSession): string | null {
  const stateError = gameStateInvariantError(session.state);
  if (stateError) {
    return stateError;
  }
  let priorId = 0;
  let priorPly = 0;
  for (const event of session.cubeEvents ?? []) {
    if (event.id <= priorId || event.afterPly < priorPly || event.afterPly > session.moveLog.length)
      return 'invalid cube history order';
    if (gameStateInvariantError(event.before) || gameStateInvariantError(event.after))
      return 'invalid cube history state';
    const expected = event.kind === 'offer'
      ? offerDouble(event.before, event.afterPly)
      : event.kind === 'accept' ? acceptDouble(event.before) : dropDouble(event.before);
    const actor = event.kind === 'offer'
      ? event.before.currentPlayer
      : event.before.match?.pendingOffer === 'white' ? 'black' : 'white';
    if (expected === event.before || actor !== event.player || JSON.stringify(expected) !== JSON.stringify(event.after))
      return 'invalid cube history transition';
    priorId = event.id;
    priorPly = event.afterPly;
  }
  if (session.replayBaseline) {
    return gameStateInvariantError(session.replayBaseline);
  }
  return null;
}

export function parsePersistedSessionJson(raw: string): SessionParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  }
  catch {
    return { ok: false, error: 'session JSON is not parseable' };
  }
  return parsePersistedSessionValue(json);
}

export function parsePersistedSessionValue(value: unknown): SessionParseResult {
  const parsed = persistedSessionSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: 'session shape is invalid' };
  }
  const session: PersistedSession = {
    cubeEvents: parsed.data.cubeEvents?.map(event => ({
      ...event,
      before: hydrateGameState(event.before),
      after: hydrateGameState(event.after),
    })),
    version: PERSISTED_SESSION_VERSION,
    state: hydrateGameState(parsed.data.state),
    moveLog: hydrateMoveLog(parsed.data.moveLog),
    replayBaseline: parsed.data.replayBaseline
      ? hydrateGameState(parsed.data.replayBaseline)
      : null,
  };
  const invariant = invariantErrorForSession(session);
  if (invariant) {
    return { ok: false, error: invariant };
  }
  return { ok: true, session };
}

export function parseLegacyGameState(value: unknown): GameState | null {
  const parsed = gameStateSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  const state = hydrateGameState(parsed.data);
  return gameStateInvariantError(state) ? null : state;
}

export function parseLegacyMoveLog(value: unknown): MoveLogEntry[] | null {
  const parsed = z.array(moveLogEntrySchema).safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return hydrateMoveLog(parsed.data);
}

export function makePersistedSession(parts: {
  cubeEvents?: CubeHistoryEvent[];
  state: GameState;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
}): PersistedSession {
  return {
    version: PERSISTED_SESSION_VERSION,
    cubeEvents: parts.cubeEvents,
    state: parts.state,
    moveLog: parts.moveLog,
    replayBaseline: parts.replayBaseline,
  };
}
