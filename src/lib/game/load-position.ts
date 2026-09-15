import type { CreatePositionOptions, PointPlacement } from './create-position';
import type { GameMode, GameState, Player } from './types';

import { createPositionState } from './create-position';

export type PositionLoaderPreset = {
  id: string;
  label: string;
  description: string;
  options: CreatePositionOptions;
};

export type ParsePositionJsonResult
  = | { ok: true; options: CreatePositionOptions; state: GameState }
    | { ok: false; error: string };

export const POSITION_JSON_ERRORS = {
  empty: 'Paste createPositionState JSON to load a board.',
  invalidJson: 'JSON is not valid.',
  notObject: 'JSON must be an object of createPositionState options.',
  gameStateSnapshot:
    'Expected createPositionState options (placements, bar, dice), not a GameState snapshot.',
} as const;

/**
 * #155 / PR #153 audit boards — White to play 1–2 from the bar.
 * Same fixtures as `moves.test.ts` so QA can inspect them on the live board.
 */
export const POSITION_LOADER_PRESETS: PositionLoaderPreset[] = [
  {
    id: 'issue-155-bar-1-2-both-dice',
    label: '#155 bar 1–2 (both dice)',
    description: 'Only bar→23 is legal: it leaves 6→5 with the 1.',
    options: {
      placements: [
        { point: 6, player: 'white', count: 14 },
        { point: 22, player: 'black', count: 2 },
        { point: 4, player: 'black', count: 2 },
        { point: 19, player: 'black', count: 11 },
      ],
      bar: { white: 1 },
      dice: [1, 2],
      mode: 'vs-human',
    },
  },
  {
    id: 'issue-155-bar-1-2-higher-die',
    label: '#155 bar 1–2 (higher die)',
    description: 'Neither leftover die plays, so only higher-die bar→23.',
    options: {
      placements: [
        { point: 6, player: 'white', count: 14 },
        { point: 22, player: 'black', count: 2 },
        { point: 4, player: 'black', count: 2 },
        { point: 5, player: 'black', count: 2 },
        { point: 19, player: 'black', count: 9 },
      ],
      bar: { white: 1 },
      dice: [1, 2],
      mode: 'vs-human',
    },
  },
];

export const POSITION_JSON_EXAMPLE = `{
  "placements": [
    { "point": 6, "player": "white", "count": 14 },
    { "point": 22, "player": "black", "count": 2 }
  ],
  "bar": { "white": 1 },
  "dice": [1, 2],
  "mode": "vs-human"
}`;

export function loadPositionPreset(preset: PositionLoaderPreset): GameState {
  return createPositionState(preset.options);
}

export function parsePositionJson(raw: string): ParsePositionJsonResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: POSITION_JSON_ERRORS.empty };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  }
  catch {
    return { ok: false, error: POSITION_JSON_ERRORS.invalidJson };
  }

  try {
    const options = readCreatePositionOptions(parsed);
    return { ok: true, options, state: createPositionState(options) };
  }
  catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : POSITION_JSON_ERRORS.invalidJson,
    };
  }
}

function readCreatePositionOptions(value: unknown): CreatePositionOptions {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(POSITION_JSON_ERRORS.notObject);
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.points)) {
    throw new TypeError(POSITION_JSON_ERRORS.gameStateSnapshot);
  }

  const options: CreatePositionOptions = {};
  if (record.useStandardSetup !== undefined) {
    options.useStandardSetup = readBoolean(record.useStandardSetup, 'useStandardSetup');
  }
  if (record.placements !== undefined) {
    options.placements = readPlacements(record.placements);
  }
  if (record.bar !== undefined) {
    options.bar = readCheckerCounts(record.bar, 'bar');
  }
  if (record.borneOff !== undefined) {
    options.borneOff = readCheckerCounts(record.borneOff, 'borneOff');
  }
  if (record.dice !== undefined) {
    options.dice = readDice(record.dice);
  }
  if (record.currentPlayer !== undefined) {
    options.currentPlayer = readPlayer(record.currentPlayer, 'currentPlayer');
  }
  if (record.mode !== undefined) {
    options.mode = readMode(record.mode);
  }
  return options;
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${field} must be a boolean.`);
  }
  return value;
}

function readPlacements(value: unknown): PointPlacement[] {
  if (!Array.isArray(value)) {
    throw new TypeError('placements must be an array.');
  }
  return value.map((item, index) => readPlacement(item, index));
}

function readPlacement(value: unknown, index: number): PointPlacement {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`placements[${index}] must be an object.`);
  }
  const record = value as Record<string, unknown>;
  const point = readInt(record.point, `placements[${index}].point`);
  if (point < 1 || point > 24) {
    throw new Error(`placements[${index}].point must be 1–24.`);
  }
  const count = readInt(record.count, `placements[${index}].count`);
  if (count < 0) {
    throw new Error(`placements[${index}].count must be ≥ 0.`);
  }
  return {
    point,
    player: readPlayer(record.player, `placements[${index}].player`),
    count,
  };
}

function readCheckerCounts(
  value: unknown,
  field: string,
): Partial<Record<Player, number>> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  const counts: Partial<Record<Player, number>> = {};
  if (record.white !== undefined) {
    counts.white = readNonNegativeInt(record.white, `${field}.white`);
  }
  if (record.black !== undefined) {
    counts.black = readNonNegativeInt(record.black, `${field}.black`);
  }
  return counts;
}

function readDice(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error('dice must be [die, die] with two values 1–6.');
  }
  const first = readDie(value[0], 'dice[0]');
  const second = readDie(value[1], 'dice[1]');
  return [first, second];
}

function readDie(value: unknown, field: string): number {
  const die = readInt(value, field);
  if (die < 1 || die > 6) {
    throw new Error(`${field} must be 1–6.`);
  }
  return die;
}

function readPlayer(value: unknown, field: string): Player {
  if (value === 'white' || value === 'black') {
    return value;
  }
  throw new Error(`${field} must be "white" or "black".`);
}

function readMode(value: unknown): GameMode {
  if (value === 'vs-computer' || value === 'vs-human') {
    return value;
  }
  throw new Error('mode must be "vs-computer" or "vs-human".');
}

function readNonNegativeInt(value: unknown, field: string): number {
  const count = readInt(value, field);
  if (count < 0) {
    throw new Error(`${field} must be ≥ 0.`);
  }
  return count;
}

function readInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`${field} must be an integer.`);
  }
  return value;
}
