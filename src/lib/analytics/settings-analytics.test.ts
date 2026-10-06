import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { patchGamePreferences } from '@/lib/game-preferences/use-game-preferences';

import {
  bindSettingsAnalytics,
  resetSettingsAnalyticsForTests,
  setAnalyticsScreen,
  settingProperties,
  trackSettingsChange,
} from './settings-analytics';

const capture = jest.fn();
const register = jest.fn(() => undefined);

beforeEach(() => {
  capture.mockClear();
  register.mockClear();
  patchGamePreferences({ ...DEFAULT_GAME_PREFERENCES });
  bindSettingsAnalytics({ capture, register }, DEFAULT_GAME_PREFERENCES);
  setAnalyticsScreen('/settings');
  capture.mockClear();
  register.mockClear();
});

afterAll(() => {
  patchGamePreferences({ ...DEFAULT_GAME_PREFERENCES });
  resetSettingsAnalyticsForTests();
});

describe('setting_changed', () => {
  it('fires from the central preferences update with key, old value, and new value', () => {
    patchGamePreferences({ tutorMode: true, autoMoveWhenForced: false });

    expect(capture).toHaveBeenCalledWith('setting_changed', {
      key: 'tutor_mode',
      old_value: false,
      new_value: true,
      source_screen: '/settings',
    });
    expect(capture).toHaveBeenCalledWith('setting_changed', {
      key: 'auto_move_when_forced',
      old_value: true,
      new_value: false,
      source_screen: '/settings',
    });
    expect(register).toHaveBeenCalledWith(expect.objectContaining({
      pref_tutor_mode: true,
      pref_auto_move_when_forced: false,
    }));
  });

  it('does not fire when the value is unchanged', () => {
    patchGamePreferences({ tutorMode: false });
    expect(capture).not.toHaveBeenCalled();
  });

  it('covers a future setting such as confirmMove without a new capture call', () => {
    trackSettingsChange(
      { confirmMove: true },
      { confirmMove: false },
    );
    expect(capture).toHaveBeenCalledWith('setting_changed', {
      key: 'confirm_move',
      old_value: true,
      new_value: false,
      source_screen: '/settings',
    });
  });

  it('drops values that are not booleans, numbers, or short enums', () => {
    trackSettingsChange({}, { note: 'x'.repeat(40), nested: { a: 1 } });
    expect(capture).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });
});

describe('gameplay setting properties', () => {
  it('maps every current preference, including ones not on the type yet', () => {
    expect(settingProperties({
      ...DEFAULT_GAME_PREFERENCES,
      confirmMove: true,
      tutorStrictness: 'big',
    })).toEqual({
      pref_show_move_hints: false,
      pref_show_direction_overlay: false,
      pref_show_point_numbers: true,
      pref_dice_display_style: 'dots',
      pref_auto_roll: true,
      pref_auto_move_when_forced: true,
      pref_sound_enabled: true,
      pref_fast_computer: true,
      pref_tutor_mode: false,
      pref_confirm_move: true,
      pref_tutor_strictness: 'big',
    });
  });

  it('is spread onto game_started', () => {
    const home = readFileSync(join(__dirname, '../../features/game/home-screen.tsx'), 'utf8');
    expect(home).toMatch(/capture\('game_started', \{[\s\S]*\.\.\.settingProperties\(preferences\)/);
  });
});
