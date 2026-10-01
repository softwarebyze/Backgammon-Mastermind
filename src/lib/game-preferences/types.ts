export type DiceDisplayStyle = 'numbers' | 'dots';

export type GamePreferences = {
  showMoveHints: boolean;
  showDirectionOverlay: boolean;
  showPointNumbers: boolean;
  diceDisplayStyle: DiceDisplayStyle;
  autoRoll: boolean;
  autoMoveWhenForced: boolean;
  /** Soft game one-shots (dice, hits, win). Default on; respects silent switch. */
  soundEnabled: boolean;
  /** Shorter computer think/move delays for power users. */
  fastComputer: boolean;
  /** Tutor mode: the Sage engine checks your turn and flags big blunders. */
  tutorMode: boolean;
};

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  showMoveHints: false,
  showDirectionOverlay: false,
  showPointNumbers: true,
  diceDisplayStyle: 'dots',
  autoRoll: true,
  autoMoveWhenForced: true,
  soundEnabled: true,
  fastComputer: true,
  tutorMode: false,
};

const IMPLICIT_OFF_KEYS = [
  'showPointNumbers',
  'autoRoll',
  'autoMoveWhenForced',
  'fastComputer',
] as const;

/**
 * Previous builds saved these four off. Flip that implicit default once so
 * existing installs pick up the new ones. A later manual off is left alone.
 */
export function migrateImplicitPlayDefaults(
  stored: Partial<GamePreferences> | null,
  alreadyMigrated: boolean,
): { prefs: Partial<GamePreferences>; didMigrate: boolean } {
  if (alreadyMigrated || !stored) {
    return { prefs: stored ?? {}, didMigrate: false };
  }
  const prefs = { ...stored };
  let didMigrate = false;
  for (const key of IMPLICIT_OFF_KEYS) {
    if (prefs[key] === false) {
      prefs[key] = true;
      didMigrate = true;
    }
  }
  return { prefs, didMigrate };
}
