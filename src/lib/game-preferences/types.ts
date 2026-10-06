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
  /** Tutor mode: the Sage engine checks your turn and flags big blunders. */
  tutorMode: boolean;
  /** Ask before ending a human turn so the player can review or undo. Default on. */
  confirmMove: boolean;
};

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  showMoveHints: false,
  showDirectionOverlay: false,
  showPointNumbers: true,
  diceDisplayStyle: 'dots',
  autoRoll: true,
  autoMoveWhenForced: true,
  soundEnabled: true,
  tutorMode: false,
  confirmMove: true,
};

const IMPLICIT_OFF_KEYS = [
  'showPointNumbers',
  'autoRoll',
  'autoMoveWhenForced',
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

/**
 * Older installs have no confirmMove key. Turn it on once for them; an explicit
 * off (after the player toggles) is left alone.
 */
export function migrateConfirmMoveDefault(
  stored: Partial<GamePreferences> | null,
  alreadyMigrated: boolean,
): { prefs: Partial<GamePreferences>; didMigrate: boolean } {
  if (alreadyMigrated || !stored) {
    return { prefs: stored ?? {}, didMigrate: false };
  }
  if (!Object.prototype.hasOwnProperty.call(stored, 'confirmMove')) {
    return { prefs: { ...stored, confirmMove: true }, didMigrate: true };
  }
  return { prefs: stored, didMigrate: false };
}

/**
 * `fastComputer` used to pick between two paces. The pace is now fixed, so a
 * stored true or false is dropped and never applied.
 */
export function omitRetiredPreferences(
  stored: (Partial<GamePreferences> & { fastComputer?: boolean }) | null,
): { prefs: Partial<GamePreferences>; didStrip: boolean } {
  if (!stored || !('fastComputer' in stored)) {
    return { prefs: stored ?? {}, didStrip: false };
  }
  const { fastComputer: _retired, ...prefs } = stored;
  return { prefs, didStrip: true };
}
