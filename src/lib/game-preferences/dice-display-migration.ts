import type { GamePreferences } from './types';

/**
 * One-time: early TestFlight builds stored `numbers` as the implicit default.
 * Flip those saves to dots; testers who later pick numbers keep them.
 */
export function migrateDiceDisplayToDots(
  stored: Partial<GamePreferences> | null,
  alreadyMigrated: boolean,
): { prefs: Partial<GamePreferences>; didMigrate: boolean } {
  if (alreadyMigrated || !stored || stored.diceDisplayStyle !== 'numbers') {
    return { prefs: stored ?? {}, didMigrate: false };
  }
  return {
    prefs: { ...stored, diceDisplayStyle: 'dots' },
    didMigrate: true,
  };
}
