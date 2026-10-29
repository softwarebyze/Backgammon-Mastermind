import type { Position } from './position';
import { getRawString, setRawString } from '@/lib/storage';
import { validatePosition } from './position';

const KEY = 'SAVED_POSITIONS_V1';
const NAME_LIMIT = 80;
const NOTE_LIMIT = 500;
const SAVED_POSITIONS_LIMIT = 50;

type SavedPositionSource = 'editor' | 'game';
export type SavedPosition = {
  id: string;
  name: string;
  position: Position;
  /** Epoch ms. Older entries were saved before timestamps existed. */
  savedAt?: number;
  note?: string;
  source?: SavedPositionSource;
};

function readEntry(entry: Record<string, unknown>): SavedPosition[] {
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string')
    return [];
  const saved: SavedPosition = { id: entry.id, name: entry.name.slice(0, NAME_LIMIT), position: validatePosition(entry.position) };
  if (typeof entry.savedAt === 'number' && Number.isFinite(entry.savedAt))
    saved.savedAt = entry.savedAt;
  if (typeof entry.note === 'string' && entry.note)
    saved.note = entry.note.slice(0, NOTE_LIMIT);
  if (entry.source === 'editor' || entry.source === 'game')
    saved.source = entry.source;
  return [saved];
}

export function loadSavedPositions(): SavedPosition[] {
  try {
    const raw: unknown = JSON.parse(getRawString(KEY) ?? '[]');
    if (!Array.isArray(raw))
      return [];
    return raw.slice(0, SAVED_POSITIONS_LIMIT).flatMap((entry) => {
      try {
        return readEntry(entry as Record<string, unknown>);
      }
      catch { return []; }
    });
  }
  catch { return []; }
}

/**
 * Newest first. Saving the same board again replaces the older entry, so a
 * rename or a fresh note never leaves duplicates behind.
 */
export function savePosition(
  name: string,
  position: Position,
  options: { note?: string; source?: SavedPositionSource; now?: number } = {},
): SavedPosition[] {
  const existing = loadSavedPositions();
  const value = validatePosition(position);
  const id = JSON.stringify(value);
  const entry: SavedPosition = {
    id,
    name: name.trim().slice(0, NAME_LIMIT),
    position: value,
    savedAt: options.now ?? Date.now(),
    source: options.source ?? 'editor',
  };
  const note = options.note?.trim().slice(0, NOTE_LIMIT);
  if (note)
    entry.note = note;
  const entries = [entry, ...existing.filter(saved => saved.id !== id)].slice(0, SAVED_POSITIONS_LIMIT);
  setRawString(KEY, JSON.stringify(entries));
  return entries;
}

export function deleteSavedPosition(id: string): SavedPosition[] {
  const entries = loadSavedPositions().filter(entry => entry.id !== id);
  setRawString(KEY, JSON.stringify(entries));
  return entries;
}
