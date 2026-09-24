import type { BoardPoint, GameState, Player } from '../game/types';

import { TOTAL_CHECKERS } from '../game/constants';

/**
 * iMessage turn codec (v1).
 *
 * The Messages extension and the main app never talk to a server — the full
 * turn position travels inside the MSMessage URL query (like "Backgammon
 * Match"). This module is the single source of truth for that wire format;
 * the Swift side (`targets/imessage/.../MessagePayload.swift`) implements the
 * same grammar and is covered by the round-trip vectors in `codec.test.ts`.
 *
 * Wire format (all values URL-query encoded):
 *   v    codec version, currently "1"
 *   gid  game id, 6-24 chars of [A-Za-z0-9_-]
 *   turn 1-based turn number (int >= 1)
 *   cur  player to act next: "w" | "b"
 *   pts  48 chars: 24 points × (owner + count). owner ∈ {w,b,.},
 *        count is a single base-36 digit (0-15 → 0-9a-f). Empty point = ".0".
 *   bar  "white,black" bar counts, e.g. "0,1"
 *   off  "white,black" borne-off counts, e.g. "0,0"
 *   win  "" (no winner) | "w" | "b"
 *   d    dice just played, "" or "d1,d2" (each 1-6). Display only.
 *   last human-readable summary of the turn just played (≤ 140 chars).
 *        Used for the message bubble caption.
 */

export const IMESSAGE_CODEC_VERSION = 1;

/** Opaque payload host — the URL never needs to resolve; Messages treats it as data. */
export const IMESSAGE_URL_BASE = 'https://backgammonmastermind.game/i';

export const IMESSAGE_MAX_SUMMARY_LENGTH = 140;

const GAME_ID_PATTERN = /^[\w-]{6,24}$/;
const POINTS_PATTERN = /^([wb.][0-9a-f]){24}$/;
const COUNT_PAIR_PATTERN = /^(\d{1,2}),(\d{1,2})$/;
const DICE_PATTERN = /^[1-6],[1-6]$/;

export type ImessageTurnPayload = {
  gid: string;
  turn: number;
  cur: Player;
  points: BoardPoint[];
  bar: Record<Player, number>;
  off: Record<Player, number>;
  win: Player | null;
  dice: [number, number] | null;
  last: string;
};

export type ImessageDecodeError
  = | { kind: 'missing-param'; param: string }
    | { kind: 'invalid-param'; param: string; reason: string };

export function createImessageGameId(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += alphabet[Math.floor(random() * alphabet.length)];
  }
  return id;
}

function playerToShort(player: Player): 'w' | 'b' {
  return player === 'white' ? 'w' : 'b';
}

function shortToPlayer(short: 'w' | 'b'): Player {
  return short === 'w' ? 'white' : 'black';
}

export function encodePoints(points: BoardPoint[]): string {
  let out = '';
  for (let i = 1; i <= 24; i++) {
    const point = points[i];
    if (!point || point.player === null || point.count === 0) {
      out += '.0';
      continue;
    }
    out += `${playerToShort(point.player)}${point.count.toString(36)}`;
  }
  return out;
}

export function decodePoints(encoded: string): BoardPoint[] | null {
  if (!POINTS_PATTERN.test(encoded)) {
    return null;
  }
  const points: BoardPoint[] = Array.from({ length: 25 }, () => ({
    player: null,
    count: 0,
  }));
  for (let i = 1; i <= 24; i++) {
    const owner = encoded[(i - 1) * 2];
    const count = Number.parseInt(encoded[(i - 1) * 2 + 1]!, 36);
    if (owner === '.' || count === 0) {
      continue;
    }
    points[i] = {
      player: owner === 'w' ? 'white' : 'black',
      count,
    };
  }
  return points;
}

function parseCountPair(raw: string | null): [number, number] | null {
  if (!raw) {
    return null;
  }
  const match = COUNT_PAIR_PATTERN.exec(raw);
  if (!match) {
    return null;
  }
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (first > TOTAL_CHECKERS || second > TOTAL_CHECKERS) {
    return null;
  }
  return [first, second];
}

/** Every side must always account for exactly 15 checkers (points + bar + off). */
function checkerCountsBalance(
  points: BoardPoint[],
  bar: Record<Player, number>,
  off: Record<Player, number>,
): boolean {
  for (const player of ['white', 'black'] as const) {
    let total = bar[player] + off[player];
    for (let i = 1; i <= 24; i++) {
      const point = points[i]!;
      if (point.player === player) {
        total += point.count;
      }
    }
    if (total !== TOTAL_CHECKERS) {
      return false;
    }
  }
  return true;
}

export function encodeImessageTurn(
  payload: ImessageTurnPayload,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('v', String(IMESSAGE_CODEC_VERSION));
  params.set('gid', payload.gid);
  params.set('turn', String(payload.turn));
  params.set('cur', playerToShort(payload.cur));
  params.set('pts', encodePoints(payload.points));
  params.set('bar', `${payload.bar.white},${payload.bar.black}`);
  params.set('off', `${payload.off.white},${payload.off.black}`);
  params.set('win', payload.win ? playerToShort(payload.win) : '');
  params.set('d', payload.dice ? `${payload.dice[0]},${payload.dice[1]}` : '');
  params.set('last', payload.last);
  return params;
}

export function buildImessageUrl(payload: ImessageTurnPayload): string {
  return `${IMESSAGE_URL_BASE}?${encodeImessageTurn(payload).toString()}`;
}

type DecodeResult
  = | { ok: true; payload: ImessageTurnPayload }
    | { ok: false; error: ImessageDecodeError };

function fail(param: string, reason: string): DecodeResult {
  return { ok: false, error: { kind: 'invalid-param', param, reason } };
}

export function decodeImessageTurn(
  query: URLSearchParams | string,
): DecodeResult {
  const params = typeof query === 'string' ? new URLSearchParams(query) : query;

  const version = params.get('v');
  if (version === null) {
    return { ok: false, error: { kind: 'missing-param', param: 'v' } };
  }
  if (version !== String(IMESSAGE_CODEC_VERSION)) {
    return fail('v', `unsupported codec version "${version}"`);
  }

  const gid = params.get('gid');
  if (gid === null) {
    return { ok: false, error: { kind: 'missing-param', param: 'gid' } };
  }
  if (!GAME_ID_PATTERN.test(gid)) {
    return fail('gid', 'must be 6-24 chars of [A-Za-z0-9_-]');
  }

  const turnRaw = params.get('turn');
  if (turnRaw === null) {
    return { ok: false, error: { kind: 'missing-param', param: 'turn' } };
  }
  const turn = Number(turnRaw);
  if (!Number.isInteger(turn) || turn < 1 || turn > 10000) {
    return fail('turn', 'must be an integer in 1..10000');
  }

  const curRaw = params.get('cur');
  if (curRaw !== 'w' && curRaw !== 'b') {
    return fail('cur', 'must be "w" or "b"');
  }

  const points = decodePoints(params.get('pts') ?? '');
  if (!points) {
    return fail('pts', 'must be 24 × (owner + base36 count)');
  }

  const barPair = parseCountPair(params.get('bar'));
  if (!barPair) {
    return fail('bar', 'must be "white,black" counts 0..15');
  }
  const offPair = parseCountPair(params.get('off'));
  if (!offPair) {
    return fail('off', 'must be "white,black" counts 0..15');
  }
  const bar = { white: barPair[0], black: barPair[1] };
  const off = { white: offPair[0], black: offPair[1] };

  if (!checkerCountsBalance(points, bar, off)) {
    return fail('pts', 'each side must account for exactly 15 checkers');
  }

  const winRaw = params.get('win') ?? '';
  if (winRaw !== '' && winRaw !== 'w' && winRaw !== 'b') {
    return fail('win', 'must be "" | "w" | "b"');
  }

  const diceRaw = params.get('d') ?? '';
  let dice: [number, number] | null = null;
  if (diceRaw !== '') {
    if (!DICE_PATTERN.test(diceRaw)) {
      return fail('d', 'must be "" or two dice 1-6');
    }
    const [d1, d2] = diceRaw.split(',').map(Number);
    dice = [d1!, d2!];
  }

  const last = params.get('last') ?? '';
  if (last.length > IMESSAGE_MAX_SUMMARY_LENGTH) {
    return fail('last', `must be ≤ ${IMESSAGE_MAX_SUMMARY_LENGTH} chars`);
  }

  return {
    ok: true,
    payload: {
      gid,
      turn,
      cur: shortToPlayer(curRaw),
      points,
      bar,
      off,
      win: winRaw === '' ? null : shortToPlayer(winRaw),
      dice,
      last,
    },
  };
}

export function parseImessageUrl(url: string): DecodeResult {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return fail('v', 'URL carries no query payload');
  }
  return decodeImessageTurn(url.slice(queryIndex + 1));
}

/** Convert a decoded turn into a playable GameState (next player to roll). */
export function imessagePayloadToGameState(
  payload: ImessageTurnPayload,
): GameState {
  return {
    points: payload.points.map(p => ({ ...p })),
    bar: { ...payload.bar },
    borneOff: { ...payload.off },
    currentPlayer: payload.cur,
    dice: payload.dice ? [...payload.dice] as [number, number] : [0, 0],
    remainingDice: [],
    phase: payload.win ? 'game-over' : 'rolling',
    winner: payload.win,
    mode: 'vs-human',
    openingRolls: { white: null, black: null },
    selectedPoint: null,
    legalMovesForSelected: [],
  };
}

/** Snapshot a post-turn GameState into a sendable payload. */
export function gameStateToImessagePayload(
  state: GameState,
  opts: { gid: string; turn: number; last: string },
): ImessageTurnPayload {
  return {
    gid: opts.gid,
    turn: opts.turn,
    cur: state.currentPlayer,
    points: state.points.map(p => ({ ...p })),
    bar: { ...state.bar },
    off: { ...state.borneOff },
    win: state.winner,
    dice: state.dice[0] === 0 ? null : [...state.dice] as [number, number],
    last: opts.last.slice(0, IMESSAGE_MAX_SUMMARY_LENGTH),
  };
}

/** Bubble caption, e.g. "White hit a blot · 5→2 — your move, Black". */
export function formatImessageCaption(payload: ImessageTurnPayload): string {
  const mover = payload.cur === 'white' ? 'Black' : 'White';
  if (payload.win) {
    const winner = payload.win === 'white' ? 'White' : 'Black';
    return `${winner} wins in ${payload.turn} turn${payload.turn === 1 ? '' : 's'} 🏆`;
  }
  const summary = payload.last.trim() || 'made a move';
  const next = payload.cur === 'white' ? 'White' : 'Black';
  return `${mover} ${summary} — your move, ${next}`;
}
