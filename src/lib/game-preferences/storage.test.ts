import { migrateDiceDisplayToDots } from './dice-display-migration';
import { DEFAULT_GAME_PREFERENCES, migrateImplicitPlayDefaults, omitRetiredPreferences } from './types';

describe('dice display migration', () => {
  it('switches leftover numbers default to dots once', () => {
    const { prefs, didMigrate } = migrateDiceDisplayToDots(
      { diceDisplayStyle: 'numbers', soundEnabled: true },
      false,
    );
    expect(didMigrate).toBe(true);
    expect(prefs.diceDisplayStyle).toBe('dots');
    expect(prefs.soundEnabled).toBe(true);
  });

  it('leaves numbers alone after the tester opts back in', () => {
    const { prefs, didMigrate } = migrateDiceDisplayToDots(
      { diceDisplayStyle: 'numbers' },
      true,
    );
    expect(didMigrate).toBe(false);
    expect(prefs.diceDisplayStyle).toBe('numbers');
  });

  it('does not rewrite an existing dots preference', () => {
    const { didMigrate } = migrateDiceDisplayToDots(
      { diceDisplayStyle: 'dots' },
      false,
    );
    expect(didMigrate).toBe(false);
  });
});

describe('play defaults', () => {
  it('ships point numbers, auto roll, and auto move on', () => {
    expect(DEFAULT_GAME_PREFERENCES).toMatchObject({
      showMoveHints: false,
      showDirectionOverlay: false,
      showPointNumbers: true,
      diceDisplayStyle: 'dots',
      autoRoll: true,
      autoMoveWhenForced: true,
      soundEnabled: true,
      tutorMode: false,
    });
    expect(DEFAULT_GAME_PREFERENCES).not.toHaveProperty('fastComputer');
  });

  it('flips a save that still has the old off defaults', () => {
    const { prefs, didMigrate } = migrateImplicitPlayDefaults({
      showPointNumbers: false,
      autoRoll: false,
      autoMoveWhenForced: false,
      soundEnabled: false,
    }, false);
    expect(didMigrate).toBe(true);
    expect(prefs).toMatchObject({
      showPointNumbers: true,
      autoRoll: true,
      autoMoveWhenForced: true,
      soundEnabled: false,
    });
  });

  it('leaves a later manual off alone', () => {
    const { prefs, didMigrate } = migrateImplicitPlayDefaults({
      autoRoll: false,
    }, true);
    expect(didMigrate).toBe(false);
    expect(prefs.autoRoll).toBe(false);
  });
});

describe('retired fast computer preference', () => {
  it('ignores a stored fast-mode on or off', () => {
    for (const fastComputer of [true, false]) {
      const { prefs, didStrip } = omitRetiredPreferences({
        fastComputer,
        soundEnabled: false,
        autoMoveWhenForced: true,
      });
      expect(didStrip).toBe(true);
      expect(prefs).not.toHaveProperty('fastComputer');
      expect(prefs.soundEnabled).toBe(false);
      expect(prefs.autoMoveWhenForced).toBe(true);
    }
  });

  it('leaves a save that never had the toggle', () => {
    const { prefs, didStrip } = omitRetiredPreferences({ autoRoll: false });
    expect(didStrip).toBe(false);
    expect(prefs).toEqual({ autoRoll: false });
  });
});
