import { migrateDiceDisplayToDots } from './dice-display-migration';
import { DEFAULT_GAME_PREFERENCES, migrateImplicitPlayDefaults } from './types';

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
  it('ships point numbers, auto roll, auto move, and fast computer on', () => {
    expect(DEFAULT_GAME_PREFERENCES).toMatchObject({
      showMoveHints: false,
      showDirectionOverlay: false,
      showPointNumbers: true,
      diceDisplayStyle: 'dots',
      autoRoll: true,
      autoMoveWhenForced: true,
      soundEnabled: true,
      fastComputer: true,
      tutorMode: false,
    });
  });

  it('flips a save that still has the old off defaults', () => {
    const { prefs, didMigrate } = migrateImplicitPlayDefaults({
      showPointNumbers: false,
      autoRoll: false,
      autoMoveWhenForced: false,
      fastComputer: false,
      soundEnabled: false,
    }, false);
    expect(didMigrate).toBe(true);
    expect(prefs).toMatchObject({
      showPointNumbers: true,
      autoRoll: true,
      autoMoveWhenForced: true,
      fastComputer: true,
      soundEnabled: false,
    });
  });

  it('leaves a later manual off alone', () => {
    const { prefs, didMigrate } = migrateImplicitPlayDefaults({
      fastComputer: false,
      autoRoll: false,
    }, true);
    expect(didMigrate).toBe(false);
    expect(prefs.fastComputer).toBe(false);
    expect(prefs.autoRoll).toBe(false);
  });
});
