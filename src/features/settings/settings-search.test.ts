import i18n, { changeLanguage } from '@/lib/i18n';

import {
  GAME_SETTING_SEARCH_IDS,
  getVisibleSettings,
  normalizeSettingsSearchText,
  SETTINGS_SEARCH_ENTRIES,
} from './settings-search';

describe('normalizeSettingsSearchText', () => {
  it('lowercases, strips accents, and collapses punctuation', () => {
    expect(normalizeSettingsSearchText('  Zurücksetzen Straße  ')).toBe('zurucksetzen strasse');
    expect(normalizeSettingsSearchText('Auto-roll_dice')).toBe('auto roll dice');
    expect(normalizeSettingsSearchText('Café')).toBe('cafe');
  });
});

describe('getVisibleSettings', () => {
  afterEach(() => changeLanguage('en'));

  it('searches the active locale rather than English labels', async () => {
    await i18n.changeLanguage('de');
    changeLanguage('de');
    expect(getVisibleSettings('Sprache')).toEqual(new Set(['language', 'restoreDefaults']));
    expect(getVisibleSettings('Language')).toEqual(new Set());
  });

  it('returns every available setting for an empty or whitespace query', () => {
    expect([...getVisibleSettings('')].sort()).toEqual(
      SETTINGS_SEARCH_ENTRIES
        .filter(entry => entry.id !== 'developerOpen')
        .map(entry => entry.id)
        .sort(),
    );
    expect([...getVisibleSettings('   ')].sort()).toEqual(
      [...getVisibleSettings('')].sort(),
    );
  });

  it('includes developer tools only when they are available', () => {
    expect(getVisibleSettings('developer').size).toBe(0);
    expect(getVisibleSettings('developer', { includeDeveloper: true })).toEqual(
      new Set(['developerOpen']),
    );
  });

  it('matches a localized title', () => {
    expect(getVisibleSettings('move hints')).toEqual(new Set(['showMoveHints']));
    expect(getVisibleSettings('MOVE HINTS')).toEqual(new Set(['showMoveHints']));
  });

  it('matches a localized description', () => {
    expect(getVisibleSettings('silent mode')).toEqual(new Set(['soundEnabled']));
    expect(getVisibleSettings('big blunders')).toEqual(new Set(['tutorMode']));
  });

  it('matches a localized section', () => {
    expect(getVisibleSettings('links')).toEqual(
      new Set(['privacy', 'terms', 'github', 'website']),
    );
    expect(getVisibleSettings('game')).toEqual(new Set([...GAME_SETTING_SEARCH_IDS, 'restoreDefaults']));
    expect(getVisibleSettings('reset')).toEqual(new Set(['restoreDefaults']));
  });

  it('normalizes hyphenated titles and requires every query token', () => {
    expect(getVisibleSettings('auto-roll')).toEqual(new Set(['autoRoll']));
    expect(getVisibleSettings('auto roll')).toEqual(new Set(['autoRoll']));
    expect(getVisibleSettings('game sound')).toEqual(new Set(['soundEnabled']));
  });

  it('returns no results when nothing matches', () => {
    expect(getVisibleSettings('zzzz')).toEqual(new Set());
  });
});
