import type { MatchState } from '@/lib/game/match';
import type { GameMode, GameState, Player } from '@/lib/game/types';
import { z } from 'zod';
import { createInitialPoints } from '@/lib/game/constants';
import { createPositionState } from '@/lib/game/create-position';

const count = z.number().int().min(0).max(15);
const player = z.enum(['white', 'black']);
const counts = z.object({ white: count, black: count });
const positionSchema = z.object({
  version: z.literal(1),
  points: z.array(z.object({ player: player.nullable(), count })).length(25),
  bar: counts,
  borneOff: counts,
  currentPlayer: player,
  dice: z.tuple([z.number().int().min(0).max(6), z.number().int().min(0).max(6)]),
  context: z.object({
    cubeExponent: z.number().int().min(0).max(15),
    cubeOwner: player.nullable(),
    turnOwner: player,
    matchLength: z.number().int().min(0).max(32767),
    scores: z.object({ white: z.number().int().min(0).max(32767), black: z.number().int().min(0).max(32767) }),
    crawford: z.boolean(),
    /** The match plays the Crawford rule; missing means it does (XGID and GNU IDs cannot say). */
    crawfordRule: z.boolean().optional(),
    jacoby: z.boolean(),
    beavers: z.boolean(),
    maxCube: z.number().int().min(0).max(15),
    gameState: z.number().int().min(0).max(4),
    resignation: z.number().int().min(0).max(3),
    doubleAction: z.enum(['', 'D', 'B', 'R']),
  }),
});
export type Position = z.infer<typeof positionSchema>;
export type PositionError = 'format' | 'checkers' | 'dice' | 'overlap' | 'context' | 'conversion';

export class PositionFormatError extends Error {
  constructor(public code: PositionError) {
    super(code);
  }
}

export function newPosition(empty = false): Position {
  return {
    version: 1,
    points: empty ? Array.from({ length: 25 }, () => ({ player: null, count: 0 })) : createInitialPoints(),
    bar: { white: 0, black: 0 },
    borneOff: { white: empty ? 15 : 0, black: empty ? 15 : 0 },
    currentPlayer: 'white',
    dice: [0, 0],
    context: {
      cubeExponent: 0,
      cubeOwner: null,
      turnOwner: 'white',
      matchLength: 0,
      scores: { white: 0, black: 0 },
      crawford: false,
      jacoby: false,
      beavers: false,
      maxCube: 10,
      gameState: 1,
      resignation: 0,
      doubleAction: '',
    },
  };
}

export function validatePosition(value: unknown): Position {
  const result = positionSchema.safeParse(value);
  if (!result.success)
    throw new PositionFormatError('format');
  const p = result.data;
  if (p.points[0]!.count !== 0 || p.points[0]!.player !== null
    || p.points.some(point => (point.count === 0) !== (point.player === null))) {
    throw new PositionFormatError('overlap');
  }
  for (const side of ['white', 'black'] as const) {
    const total = p.points.reduce((sum, point) => sum + (point.player === side ? point.count : 0), p.bar[side] + p.borneOff[side]);
    if (total !== 15)
      throw new PositionFormatError('checkers');
  }
  if ((p.dice[0] === 0) !== (p.dice[1] === 0))
    throw new PositionFormatError('dice');
  const c = p.context;
  if ((!c.matchLength && c.crawford)
    || (c.matchLength > 0 && (c.scores.white > c.matchLength || c.scores.black > c.matchLength || c.beavers))
    || c.cubeExponent > c.maxCube) {
    throw new PositionFormatError('context');
  }
  return p;
}

/** Missing checkers in interchange IDs have been borne off, not lost. */
export function inferBorneOff(p: Position): Position {
  for (const side of ['white', 'black'] as const) {
    p.borneOff[side] = 15 - p.points.reduce((n, point) => n + (point.player === side ? point.count : 0), p.bar[side]);
    if (p.borneOff[side] < 0)
      throw new PositionFormatError('checkers');
  }
  return validatePosition(p);
}

/** Snapshots taken after a die was spent start a fresh roll; never replay spent dice. */
export function positionFromGame(state: GameState): Position {
  const p = newPosition();
  p.points = state.points.map(point => ({ ...point }));
  p.bar = { ...state.bar };
  p.borneOff = { ...state.borneOff };
  p.currentPlayer = state.currentPlayer;
  p.context.turnOwner = state.currentPlayer;
  const fullRoll = state.dice[0] === state.dice[1] ? 4 : 2;
  p.dice = state.phase === 'moving' && state.remainingDice.length === fullRoll ? [...state.dice] : [0, 0];
  return validatePosition(p);
}

export function positionGame(p: Position, mode: GameMode = 'vs-human'): GameState {
  validatePosition(p);
  const state = createPositionState({
    placements: p.points.flatMap((point, i) => point.player ? [{ point: i, player: point.player, count: point.count }] : []),
    bar: p.bar,
    borneOff: p.borneOff,
    currentPlayer: p.currentPlayer,
    mode,
    dice: p.dice[0] ? p.dice : undefined,
  });
  const match = positionMatch(p);
  const withMatch = match ? { ...state, match } : state;
  const winner = p.borneOff.white === 15 ? 'white' : p.borneOff.black === 15 ? 'black' : null;
  return winner ? { ...withMatch, phase: 'game-over', winner, dice: [0, 0], remainingDice: [] } : withMatch;
}

/**
 * A match position plays on as that match: its score, cube and Crawford
 * game carry into play. Money positions play checkers only.
 */
function positionMatch(p: Position): MatchState | undefined {
  const c = p.context;
  if (!c.matchLength)
    return undefined;
  const crawfordRule = c.crawfordRule !== false;
  const atMatchPoint = c.scores.white === c.matchLength - 1 || c.scores.black === c.matchLength - 1;
  return {
    length: c.matchLength,
    score: { ...c.scores },
    // No doubling in the Crawford game: the cube stays at 1 in the middle.
    cube: c.crawford ? { value: 1, owner: 'center' } : { value: 2 ** c.cubeExponent, owner: c.cubeOwner ?? 'center' },
    pendingOffer: null,
    crawford: c.crawford,
    // Someone at match point outside the Crawford game means it has been played.
    crawfordPlayed: c.crawford || (crawfordRule && atMatchPoint),
    crawfordRule,
    gameNumber: 1,
    winner: null,
    result: null,
    undoFloor: 0,
  };
}

/** The Crawford game has no doubling, so turning it on puts the cube back to 1 in the middle. */
export function withCrawfordGame(context: Position['context'], crawford: boolean): Position['context'] {
  return crawford ? { ...context, crawford, cubeExponent: 0, cubeOwner: null } : { ...context, crawford };
}

export type PositionLocation = number | 'white-bar' | 'black-bar';

/** Add/remove at a point or bar, transferring checkers to/from its off tray. */
// eslint-disable-next-line max-params -- position, location, checker owner and increment
export function editCheckers(p: Position, location: PositionLocation, side: Player, delta: number): Position {
  const next = validatePosition(p);
  if (typeof location === 'number') {
    if (location < 1 || location > 24)
      return next;
    const point = next.points[location]!;
    if (point.player && point.player !== side)
      return next;
    const change = Math.max(-point.count, Math.min(delta, next.borneOff[side]));
    next.points[location] = { player: point.count + change ? side : null, count: point.count + change };
    next.borneOff[side] -= change;
  }
  else {
    const owner = location === 'white-bar' ? 'white' : 'black';
    const change = Math.max(-next.bar[owner], Math.min(delta, next.borneOff[owner]));
    next.bar[owner] += change;
    next.borneOff[owner] -= change;
  }
  return validatePosition(next);
}
