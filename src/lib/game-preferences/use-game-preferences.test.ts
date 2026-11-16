import type { GamePreferences } from './types';

import { getItem, setItem, storage } from '@/lib/storage';

import { DEFAULT_GAME_PREFERENCES } from './types';
import {
  patchGamePreferences,
  resetGamePreferences,
} from './use-game-preferences';

const MIGRATION_KEYS = {
  confirmMove: 'GAME_PREFERENCES_CONFIRM_MOVE_V1',
  diceDots: 'GAME_PREFERENCES_DICE_DOTS_V1',
  playDefaults: 'GAME_PREFERENCES_PLAY_DEFAULTS_V1',
};

const SAVED_GAME = { id: 'active-game', turn: 7 };
const LEARN_PROGRESS = { completedLessons: ['basics'] };

beforeEach(async () => {
  storage.clearAll();
  storage.set('local', 'he');
  await setItem('LEARN_PROGRESS', LEARN_PROGRESS);
  await setItem('ACTIVE_GAME_SESSION', SAVED_GAME);
  await setItem('UNRELATED_SETTING', 'keep me');
  for (const key of Object.values(MIGRATION_KEYS)) {
    await setItem(key, true);
  }
  patchGamePreferences({
    ...DEFAULT_GAME_PREFERENCES,
    showMoveHints: true,
    autoRoll: false,
    soundEnabled: false,
    diceDisplayStyle: 'numbers',
  });
});

afterAll(() => {
  resetGamePreferences();
  storage.clearAll();
});

describe('resetGamePreferences', () => {
  it('writes the defaults to the game preference key', () => {
    resetGamePreferences();

    expect(getItem<GamePreferences>('GAME_PREFERENCES')).toEqual(DEFAULT_GAME_PREFERENCES);
  });

  it('keeps language, saved games, progress, migration markers, and unrelated keys', () => {
    resetGamePreferences();

    expect(storage.getString('local')).toBe('he');
    expect(getItem('ACTIVE_GAME_SESSION')).toEqual(SAVED_GAME);
    expect(getItem('LEARN_PROGRESS')).toEqual(LEARN_PROGRESS);
    expect(getItem('UNRELATED_SETTING')).toBe('keep me');
    for (const key of Object.values(MIGRATION_KEYS)) {
      expect(getItem(key)).toBe(true);
    }
  });
});
