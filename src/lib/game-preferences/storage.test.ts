import { migrateDiceDisplayToDots } from './dice-display-migration';

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
