import type { GamePreferences } from './types';

import { getItem, setItem } from '@/lib/storage';
import { DEFAULT_GAME_PREFERENCES } from './types';

const STORAGE_KEY = 'GAME_PREFERENCES';

export function loadGamePreferences(): GamePreferences {
  const stored = getItem<Partial<GamePreferences>>(STORAGE_KEY);
  return { ...DEFAULT_GAME_PREFERENCES, ...stored };
}

export function saveGamePreferences(prefs: GamePreferences): void {
  void setItem(STORAGE_KEY, prefs);
}
