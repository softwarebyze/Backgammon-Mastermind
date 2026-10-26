import type { Position } from './position';
import { getRawString, setRawString } from '@/lib/storage';
import { validatePosition } from './position';

const KEY = 'SAVED_POSITIONS_V1';
export type SavedPosition = { id: string; name: string; position: Position };

export function loadSavedPositions(): SavedPosition[] {
  try {
    const raw: unknown = JSON.parse(getRawString(KEY) ?? '[]');
    if (!Array.isArray(raw))
      return [];
    return raw.slice(0, 50).flatMap((entry) => {
      try {
        if (typeof entry.id !== 'string' || typeof entry.name !== 'string')
          return [];
        return [{ id: entry.id, name: entry.name.slice(0, 80), position: validatePosition(entry.position) }];
      }
      catch { return []; }
    });
  }
  catch { return []; }
}

export function savePosition(name: string, position: Position): SavedPosition[] {
  const existing = loadSavedPositions();
  const value = validatePosition(position);
  const id = JSON.stringify(value);
  const entries = [{ id, name: name.trim().slice(0, 80), position: value }, ...existing.filter(entry => entry.id !== id)].slice(0, 50);
  setRawString(KEY, JSON.stringify(entries));
  return entries;
}

export function deleteSavedPosition(id: string): SavedPosition[] {
  const entries = loadSavedPositions().filter(entry => entry.id !== id);
  setRawString(KEY, JSON.stringify(entries));
  return entries;
}
