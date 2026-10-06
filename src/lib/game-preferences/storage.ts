import type { GamePreferences } from './types';

import { getItem, setItem } from '@/lib/storage';
import { migrateDiceDisplayToDots } from './dice-display-migration';
import {
  DEFAULT_GAME_PREFERENCES,
  migrateConfirmMoveDefault,
  migrateImplicitPlayDefaults,
} from './types';

const STORAGE_KEY = 'GAME_PREFERENCES';
const DICE_DOTS_MIGRATION_KEY = 'GAME_PREFERENCES_DICE_DOTS_V1';
const PLAY_DEFAULTS_MIGRATION_KEY = 'GAME_PREFERENCES_PLAY_DEFAULTS_V1';
const CONFIRM_MOVE_MIGRATION_KEY = 'GAME_PREFERENCES_CONFIRM_MOVE_V1';

export function loadGamePreferences(): GamePreferences {
  const stored = getItem<Partial<GamePreferences>>(STORAGE_KEY);
  const diceMigrated = getItem<boolean>(DICE_DOTS_MIGRATION_KEY) === true;
  const playDefaultsMigrated = getItem<boolean>(PLAY_DEFAULTS_MIGRATION_KEY) === true;
  const confirmMoveMigrated = getItem<boolean>(CONFIRM_MOVE_MIGRATION_KEY) === true;
  const { prefs: dicePrefs, didMigrate: didDice } = migrateDiceDisplayToDots(stored, diceMigrated);
  const { prefs: playPrefs, didMigrate: didPlayDefaults } = migrateImplicitPlayDefaults(
    dicePrefs,
    playDefaultsMigrated,
  );
  const { prefs, didMigrate: didConfirmMove } = migrateConfirmMoveDefault(
    playPrefs,
    confirmMoveMigrated,
  );
  if (didDice || didPlayDefaults || didConfirmMove) {
    if (didDice)
      void setItem(DICE_DOTS_MIGRATION_KEY, true);
    if (didPlayDefaults)
      void setItem(PLAY_DEFAULTS_MIGRATION_KEY, true);
    if (didConfirmMove)
      void setItem(CONFIRM_MOVE_MIGRATION_KEY, true);
    const next = { ...DEFAULT_GAME_PREFERENCES, ...prefs };
    void setItem(STORAGE_KEY, next);
    return next;
  }
  if (!diceMigrated)
    void setItem(DICE_DOTS_MIGRATION_KEY, true);
  if (!playDefaultsMigrated)
    void setItem(PLAY_DEFAULTS_MIGRATION_KEY, true);
  if (!confirmMoveMigrated)
    void setItem(CONFIRM_MOVE_MIGRATION_KEY, true);
  return { ...DEFAULT_GAME_PREFERENCES, ...prefs };
}

export function saveGamePreferences(prefs: GamePreferences): void {
  void setItem(STORAGE_KEY, prefs);
}
