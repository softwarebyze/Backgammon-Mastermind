import type { MoveLogEntry } from './move-log';
import type { GameState } from './types';
import { createInitialState } from './constants';
import {
  addGameNote,
  GAME_NOTE_MAX_LENGTH,
  notePipCounts,
  notePositionFromState,
  notesAtPly,
  noteTurnAtPly,
  parseGameNotes,
  removeGameNote,
  updateGameNote,
} from './game-notes';

function moving(player: 'white' | 'black', dice: [number, number]): GameState {
  return { ...createInitialState('vs-human'), phase: 'moving', currentPlayer: player, dice, remainingDice: [...dice] };
}

function entry(ply: number, player: 'white' | 'black', dice: [number, number]): MoveLogEntry {
  return { ply, player, dice, from: 13, to: 10 };
}

const log: MoveLogEntry[] = [
  entry(1, 'white', [3, 1]),
  entry(2, 'white', [3, 1]),
  entry(3, 'black', [6, 4]),
  entry(4, 'black', [6, 4]),
];

function note(ply: number, text: string, opts: { at: number; id?: string }) {
  return { id: opts.id ?? `n${opts.at}`, ply, turn: 1, text, createdAt: opts.at, position: notePositionFromState(moving('white', [3, 1])) };
}

describe('notePositionFromState', () => {
  it('keeps the roll on the board while it is being played', () => {
    const position = notePositionFromState(moving('black', [6, 4]));
    expect(position).toMatchObject({ currentPlayer: 'black', dice: [6, 4], phase: 'moving' });
  });

  it('has no dice before anyone has rolled', () => {
    const state = { ...createInitialState('vs-human'), phase: 'rolling' as const, dice: [5, 2] as [number, number] };
    expect(notePositionFromState(state).dice).toBeNull();
    expect(notePositionFromState(createInitialState('vs-human')).dice).toBeNull();
  });

  it('copies the board so later moves cannot change the note', () => {
    const state = moving('white', [3, 1]);
    const position = notePositionFromState(state);
    state.points[24]!.count = 0;
    state.bar.white = 3;
    expect(position.points[24]!.count).toBe(2);
    expect(position.bar.white).toBe(0);
  });
});

describe('noteTurnAtPly', () => {
  it('is 0 during the opening roll', () => {
    expect(noteTurnAtPly([], 0, createInitialState('vs-human'))).toBe(0);
  });

  it('is turn 1 before the first checker moves', () => {
    expect(noteTurnAtPly([], 0, moving('white', [3, 1]))).toBe(1);
  });

  it('stays in the turn being played mid-turn', () => {
    expect(noteTurnAtPly(log, 1, moving('white', [3, 1]))).toBe(1);
    expect(noteTurnAtPly(log, 3, moving('black', [6, 4]))).toBe(2);
  });

  it('moves on to the next turn once the other player is up', () => {
    expect(noteTurnAtPly(log, 2, moving('black', [6, 4]))).toBe(2);
    expect(noteTurnAtPly(log, 4, { ...moving('white', [2, 2]), phase: 'rolling' })).toBe(3);
  });

  it('keeps the last turn once the game is over', () => {
    expect(noteTurnAtPly(log, 4, { ...moving('white', [3, 1]), phase: 'game-over' })).toBe(2);
  });
});

describe('notePipCounts', () => {
  it('counts the standard start as 167 each', () => {
    expect(notePipCounts(notePositionFromState(createInitialState('vs-human')))).toEqual({ white: 167, black: 167 });
  });
});

describe('note list edits', () => {
  it('adds trimmed notes in game order, then by time', () => {
    let notes = addGameNote([], note(4, '  late  ', { at: 3 }));
    notes = addGameNote(notes, note(0, 'opening', { at: 2 }));
    notes = addGameNote(notes, note(4, 'later still', { at: 5 }));
    notes = addGameNote(notes, note(4, 'same ply, earlier', { at: 1 }));
    expect(notes.map(n => n.text)).toEqual(['opening', 'same ply, earlier', 'late', 'later still']);
  });

  it('ignores blank notes and duplicate ids', () => {
    const notes = addGameNote([], note(1, 'one', { at: 1, id: 'a' }));
    expect(addGameNote(notes, note(2, '   ', { at: 2 }))).toBe(notes);
    expect(addGameNote(notes, note(2, 'again', { at: 2, id: 'a' }))).toBe(notes);
  });

  it('caps the text length', () => {
    const [saved] = addGameNote([], note(1, 'x'.repeat(GAME_NOTE_MAX_LENGTH + 20), { at: 1 }));
    expect(saved!.text).toHaveLength(GAME_NOTE_MAX_LENGTH);
  });

  it('edits text and stamps the update, keeping the position', () => {
    const notes = addGameNote([], note(1, 'one', { at: 1, id: 'a' }));
    const [edited] = updateGameNote(notes, { id: 'a', text: ' better ', now: 9 });
    expect(edited).toMatchObject({ text: 'better', updatedAt: 9, ply: 1, position: notes[0]!.position });
  });

  it('deletes a note whose edit leaves no text', () => {
    const notes = addGameNote([], note(1, 'one', { at: 1, id: 'a' }));
    expect(updateGameNote(notes, { id: 'a', text: '  ', now: 9 })).toEqual([]);
  });

  it('removes by id and returns the same list when nothing matches', () => {
    const notes = addGameNote(addGameNote([], note(1, 'one', { at: 1, id: 'a' })), note(2, 'two', { at: 2, id: 'b' }));
    expect(removeGameNote(notes, 'a').map(n => n.id)).toEqual(['b']);
    expect(removeGameNote(notes, 'zzz')).toBe(notes);
  });

  it('finds the notes for one ply', () => {
    const notes = addGameNote(addGameNote([], note(1, 'one', { at: 1, id: 'a' })), note(2, 'two', { at: 2, id: 'b' }));
    expect(notesAtPly(notes, 2).map(n => n.id)).toEqual(['b']);
  });
});

describe('parseGameNotes', () => {
  it('round-trips saved notes through JSON', () => {
    const notes = addGameNote(addGameNote([], note(3, 'three', { at: 2, id: 'b' })), note(1, 'one', { at: 1, id: 'a' }));
    expect(parseGameNotes(JSON.parse(JSON.stringify(notes)))).toEqual(notes);
  });

  it('drops malformed entries instead of throwing', () => {
    const good = note(1, 'one', { at: 1, id: 'a' });
    const badDice = { ...note(2, 'two', { at: 2, id: 'b' }), position: { ...good.position, dice: [7, 1] } };
    const badBoard = { ...note(2, 'two', { at: 2, id: 'c' }), position: { ...good.position, points: [] } };
    expect(parseGameNotes([good, badDice, badBoard, null, 'x', { id: 'd' }])).toEqual([good]);
  });

  it('treats anything but an array as no notes', () => {
    expect(parseGameNotes(null)).toEqual([]);
    expect(parseGameNotes({ notes: [] })).toEqual([]);
  });
});
