import { migrateDiceDisplayToDots } from './dice-display-migration';
import {
  DEFAULT_GAME_PREFERENCES,
  migrateConfirmMoveDefault,
  migrateImplicitPlayDefaults,
} from './types';

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
  it('ships point numbers, auto roll, auto move, fast computer, and confirm move on', () => {
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
      confirmMove: true,
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

describe('confirm move migration', () => {
  it('turns confirmMove on for older saves that lack the key', () => {
    const { prefs, didMigrate } = migrateConfirmMoveDefault(
      { autoRoll: true, soundEnabled: false },
      false,
    );
    expect(didMigrate).toBe(true);
    expect(prefs.confirmMove).toBe(true);
    expect(prefs.soundEnabled).toBe(false);
  });

  it('leaves an explicit off alone', () => {
    const { prefs, didMigrate } = migrateConfirmMoveDefault(
      { confirmMove: false },
      false,
    );
    expect(didMigrate).toBe(false);
    expect(prefs.confirmMove).toBe(false);
  });

  it('no-ops after the migration flag is set', () => {
    const { prefs, didMigrate } = migrateConfirmMoveDefault(
      { autoRoll: true },
      true,
    );
    expect(didMigrate).toBe(false);
    expect(prefs.confirmMove).toBeUndefined();
  });
});
