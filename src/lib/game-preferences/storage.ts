import type { GamePreferences } from './types';

import { getItem, setItem } from '@/lib/storage';
import { migrateDiceDisplayToDots } from './dice-display-migration';
import { DEFAULT_GAME_PREFERENCES, migrateImplicitPlayDefaults, omitRetiredPreferences } from './types';

const STORAGE_KEY = 'GAME_PREFERENCES';
const DICE_DOTS_MIGRATION_KEY = 'GAME_PREFERENCES_DICE_DOTS_V1';
const PLAY_DEFAULTS_MIGRATION_KEY = 'GAME_PREFERENCES_PLAY_DEFAULTS_V1';

export function loadGamePreferences(): GamePreferences {
  const stored = getItem<Partial<GamePreferences> & { fastComputer?: boolean }>(STORAGE_KEY);
  const diceMigrated = getItem<boolean>(DICE_DOTS_MIGRATION_KEY) === true;
  const playDefaultsMigrated = getItem<boolean>(PLAY_DEFAULTS_MIGRATION_KEY) === true;
  const { prefs: stripped, didStrip } = omitRetiredPreferences(stored);
  const { prefs: dicePrefs, didMigrate: didDice } = migrateDiceDisplayToDots(stripped, diceMigrated);
  const { prefs, didMigrate: didPlayDefaults } = migrateImplicitPlayDefaults(dicePrefs, playDefaultsMigrated);
  if (didDice || didPlayDefaults || didStrip) {
    if (didDice)
      void setItem(DICE_DOTS_MIGRATION_KEY, true);
    if (didPlayDefaults)
      void setItem(PLAY_DEFAULTS_MIGRATION_KEY, true);
    const next = { ...DEFAULT_GAME_PREFERENCES, ...prefs };
    void setItem(STORAGE_KEY, next);
    return next;
  }
  if (!diceMigrated)
    void setItem(DICE_DOTS_MIGRATION_KEY, true);
  if (!playDefaultsMigrated)
    void setItem(PLAY_DEFAULTS_MIGRATION_KEY, true);
  return { ...DEFAULT_GAME_PREFERENCES, ...prefs };
}

export function saveGamePreferences(prefs: GamePreferences): void {
  void setItem(STORAGE_KEY, prefs);
}
