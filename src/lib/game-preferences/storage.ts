import type { GamePreferences } from './types';

import { getItem, setItem } from '@/lib/storage';
import { migrateDiceDisplayToDots } from './dice-display-migration';
import { DEFAULT_GAME_PREFERENCES } from './types';

const STORAGE_KEY = 'GAME_PREFERENCES';
const DICE_DOTS_MIGRATION_KEY = 'GAME_PREFERENCES_DICE_DOTS_V1';

export function loadGamePreferences(): GamePreferences {
  const stored = getItem<Partial<GamePreferences>>(STORAGE_KEY);
  const migratedFlag = getItem<boolean>(DICE_DOTS_MIGRATION_KEY) === true;
  const { prefs, didMigrate } = migrateDiceDisplayToDots(stored, migratedFlag);
  if (didMigrate) {
    void setItem(DICE_DOTS_MIGRATION_KEY, true);
    const next = { ...DEFAULT_GAME_PREFERENCES, ...prefs };
    void setItem(STORAGE_KEY, next);
    return next;
  }
  if (!migratedFlag) {
    void setItem(DICE_DOTS_MIGRATION_KEY, true);
  }
  return { ...DEFAULT_GAME_PREFERENCES, ...prefs };
}

export function saveGamePreferences(prefs: GamePreferences): void {
  void setItem(STORAGE_KEY, prefs);
}
