import type { MoveLogEntry } from './move-log';
import type { BoardPoint, GamePhase, GameState, Player } from './types';
import { z } from 'zod';

import { groupMoveLogByTurn } from './move-log';
import { calculatePipCount } from './moves';

export const GAME_NOTE_MAX_LENGTH = 500;

/** The board and dice a note was written about, frozen at the time. */
export type GameNotePosition = {
  points: BoardPoint[];
  bar: { white: number; black: number };
  borneOff: { white: number; black: number };
  currentPlayer: Player;
  /** The roll on the board, or null when nobody has rolled yet. */
  dice: [number, number] | null;
  phase: GamePhase;
};

/**
 * A player's comment on one moment of the game. `ply` is how many checker
 * moves had been played (the move log length, or the reviewed ply), so the
 * review can return to it; `position` keeps the board and dice the note was
 * about even if that history is later undone and played differently.
 */
export type GameNote = {
  id: string;
  ply: number;
  /** 1-based turn the note belongs to; 0 is the opening roll. */
  turn: number;
  text: string;
  createdAt: number;
  updatedAt?: number;
  position: GameNotePosition;
};

function rolledDice(state: GameState): [number, number] | null {
  const [a, b] = state.dice;
  if ((state.phase !== 'moving' && state.phase !== 'no-move') || a < 1 || b < 1) {
    return null;
  }
  return [a, b];
}

export function notePositionFromState(state: GameState): GameNotePosition {
  return {
    points: state.points.map(point => ({ ...point })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
    currentPlayer: state.currentPlayer,
    dice: rolledDice(state),
    phase: state.phase,
  };
}

/**
 * Turn number of the position at `ply`. A position whose player to act is
 * not the one who played the last turn is the start of the next turn, so a
 * fresh roll belongs to the turn about to be played, not the one before it.
 */
export function noteTurnAtPly(moveLog: MoveLogEntry[], ply: number, state: GameState): number {
  if (state.phase === 'opening-roll') {
    return 0;
  }
  const started = groupMoveLogByTurn(moveLog.slice(0, Math.max(0, ply)));
  const last = started[started.length - 1];
  if (!last) {
    return 1;
  }
  return last.player === state.currentPlayer || state.phase === 'game-over'
    ? last.turnIndex
    : last.turnIndex + 1;
}

export function notePipCounts(position: GameNotePosition): { white: number; black: number } {
  return {
    white: calculatePipCount(position, 'white'),
    black: calculatePipCount(position, 'black'),
  };
}

function cleanText(text: string): string {
  return text.trim().slice(0, GAME_NOTE_MAX_LENGTH);
}

/** Game order: by ply, then by when the note was written. */
function sortNotes(notes: GameNote[]): GameNote[] {
  return [...notes].sort((a, b) => a.ply - b.ply || a.createdAt - b.createdAt);
}

export function addGameNote(
  notes: GameNote[],
  note: Omit<GameNote, 'text' | 'updatedAt'> & { text: string },
): GameNote[] {
  const text = cleanText(note.text);
  if (!text || notes.some(existing => existing.id === note.id)) {
    return notes;
  }
  return sortNotes([...notes, { ...note, text }]);
}

/** Saving an edit with no text left deletes the note. */
export function updateGameNote(notes: GameNote[], { id, text, now }: { id: string; text: string; now: number }): GameNote[] {
  const cleaned = cleanText(text);
  if (!cleaned) {
    return removeGameNote(notes, id);
  }
  return notes.map(note => (note.id === id ? { ...note, text: cleaned, updatedAt: now } : note));
}

export function removeGameNote(notes: GameNote[], id: string): GameNote[] {
  const next = notes.filter(note => note.id !== id);
  return next.length === notes.length ? notes : next;
}

export function notesAtPly(notes: GameNote[], ply: number): GameNote[] {
  return notes.filter(note => note.ply === ply);
}

const playerSchema = z.enum(['white', 'black']);
const countSchema = z.object({ white: z.number().int().nonnegative(), black: z.number().int().nonnegative() });
const dieSchema = z.number().int().min(1).max(6);

const noteSchema = z.object({
  id: z.string().min(1),
  ply: z.number().int().nonnegative(),
  turn: z.number().int().nonnegative(),
  text: z.string().min(1).max(GAME_NOTE_MAX_LENGTH),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  position: z.object({
    points: z.array(z.object({ player: playerSchema.nullable(), count: z.number().int().nonnegative() })).length(25),
    bar: countSchema,
    borneOff: countSchema,
    currentPlayer: playerSchema,
    dice: z.tuple([dieSchema, dieSchema]).nullable(),
    phase: z.enum(['opening-roll', 'rolling', 'moving', 'no-move', 'game-over']),
  }),
});

/** Saved notes from storage; malformed entries are dropped, never thrown. */
export function parseGameNotes(value: unknown): GameNote[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const notes: GameNote[] = [];
  for (const raw of value) {
    const parsed = noteSchema.safeParse(raw);
    if (parsed.success) {
      notes.push(parsed.data as GameNote);
    }
  }
  return sortNotes(notes);
}
