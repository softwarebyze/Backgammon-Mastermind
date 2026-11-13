import { createInitialState } from '@/lib/game/constants';
import { notePositionFromState } from '@/lib/game/game-notes';
import { getRawString, setRawString } from '@/lib/storage';
import * as store from './game-notes-store';

const KEY = 'ACTIVE_GAME_NOTES';
const position = notePositionFromState(createInitialState('vs-human'));

/** The store as a cold start sees it: nothing in memory, only what was saved. */
function loadStore(): typeof store {
  store.resetGameNotesCacheForTests();
  return store;
}

beforeEach(() => {
  setRawString(KEY, '[]');
});

it('saves notes so a resumed game still has them', () => {
  const first = loadStore();
  first.addNote({ ply: 2, turn: 1, text: 'Should I split?', position }, 100);
  const resumed = loadStore();
  expect(resumed.getGameNotes()).toEqual([
    expect.objectContaining({ ply: 2, turn: 1, text: 'Should I split?', createdAt: 100 }),
  ]);
});

it('edits and deletes notes in storage', () => {
  const store = loadStore();
  store.addNote({ ply: 0, turn: 0, text: 'one', position }, 1);
  const [saved] = store.getGameNotes();
  store.editNote(saved!.id, 'one, revised', 2);
  expect(loadStore().getGameNotes()[0]).toMatchObject({ text: 'one, revised', updatedAt: 2 });
  store.deleteNote(saved!.id);
  expect(getRawString(KEY)).toBeUndefined();
  expect(loadStore().getGameNotes()).toEqual([]);
});

it('clears every note for a new game', () => {
  const store = loadStore();
  store.addNote({ ply: 0, turn: 0, text: 'old game', position }, 1);
  store.clearGameNotes();
  expect(store.getGameNotes()).toEqual([]);
  expect(getRawString(KEY)).toBeUndefined();
});

it('clears notes saved by an earlier run before anything was read', () => {
  loadStore().addNote({ ply: 0, turn: 0, text: 'old game', position }, 1);
  const fresh = loadStore();
  fresh.clearGameNotes();
  expect(getRawString(KEY)).toBeUndefined();
});

it('ignores a corrupt saved payload', () => {
  setRawString(KEY, '{nope');
  expect(loadStore().getGameNotes()).toEqual([]);
});
