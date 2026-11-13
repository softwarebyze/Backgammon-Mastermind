import type { GameNote } from '@/lib/game/game-notes';
import { useSyncExternalStore } from 'react';

import { addGameNote, parseGameNotes, removeGameNote, updateGameNote } from '@/lib/game/game-notes';
import { getItem, removeItem, setItem } from '@/lib/storage';

/** The active game's notes live beside its saved session and go with it. */
const GAME_NOTES_STORAGE_KEY = 'ACTIVE_GAME_NOTES';

const EMPTY: GameNote[] = [];
let notes: GameNote[] | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function current(): GameNote[] {
  if (notes === null) {
    notes = parseGameNotes(getItem<unknown>(GAME_NOTES_STORAGE_KEY));
  }
  return notes;
}

function commit(next: GameNote[]) {
  if (next === notes) {
    return;
  }
  notes = next;
  if (next.length === 0) {
    void removeItem(GAME_NOTES_STORAGE_KEY);
  }
  else {
    void setItem(GAME_NOTES_STORAGE_KEY, next);
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): GameNote[] {
  const value = current();
  return value.length === 0 ? EMPTY : value;
}

export function useGameNotes(): GameNote[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function getGameNotes(): GameNote[] {
  return snapshot();
}

export function addNote(note: Omit<GameNote, 'id' | 'createdAt' | 'updatedAt'>, now = Date.now()): void {
  commit(addGameNote(current(), { ...note, id: `${now.toString(36)}-${nextId++}`, createdAt: now }));
}

export function editNote(id: string, text: string, now = Date.now()): void {
  commit(updateGameNote(current(), { id, text, now }));
}

export function deleteNote(id: string): void {
  commit(removeGameNote(current(), id));
}

/** A new game or a reset starts with no notes. */
export function clearGameNotes(): void {
  commit(EMPTY);
}

/** Tests: forget the in-memory copy so the next read comes from storage. */
export function resetGameNotesCacheForTests(): void {
  notes = null;
}
