import type { ConfirmOptions } from '@/lib/confirm';
import type { GamePreferences } from '@/lib/game-preferences/types';

import { AccessibilityInfo } from 'react-native';

import { registerConfirmHandler } from '@/lib/confirm';
import {
  DEFAULT_GAME_PREFERENCES,
} from '@/lib/game-preferences/types';
import {
  patchGamePreferences,
  resetGamePreferences,
} from '@/lib/game-preferences/use-game-preferences';
import { getItem } from '@/lib/storage';
import { act, cleanup, screen, setup } from '@/lib/test-utils';

import { RestoreDefaultsItem } from './restore-defaults-item';

jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
}));

let pending: ConfirmOptions | null = null;

beforeEach(() => {
  pending = null;
  registerConfirmHandler((options) => {
    pending = options;
  });
  patchGamePreferences({ ...DEFAULT_GAME_PREFERENCES });
});

afterEach(() => {
  registerConfirmHandler(null);
  cleanup();
  resetGamePreferences();
  jest.restoreAllMocks();
});

describe('restore default settings', () => {
  it('asks before resetting, then restores the game preferences', async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    patchGamePreferences({
      showMoveHints: true,
      autoRoll: false,
      diceDisplayStyle: 'numbers',
    });

    const { user } = setup(<RestoreDefaultsItem />);
    await user.press(screen.getByTestId('settings-restore-defaults'));

    expect(pending).toEqual(expect.objectContaining({
      title: 'Restore default settings?',
      confirmLabel: 'Restore defaults',
      cancelLabel: 'Cancel',
      destructive: true,
    }));
    expect(getItem<GamePreferences>('GAME_PREFERENCES')).toEqual(
      expect.objectContaining({ showMoveHints: true, autoRoll: false }),
    );

    const options = pending!;
    act(() => options.onConfirm());

    expect(getItem<GamePreferences>('GAME_PREFERENCES')).toEqual(DEFAULT_GAME_PREFERENCES);
    expect(announce).toHaveBeenCalledWith('Default settings restored.');
    expect(screen.getByText('Default settings restored.')).toBeTruthy();
  });
});
