import type { GameState } from '@/lib/game';
import { Platform } from 'react-native';

import { renderHook } from '@/lib/test-utils';

import { useGameScreenHeader } from './use-game-screen-header';

jest.mock('@/components/navigation/game-header-actions', () => ({
  GameHeaderActions: () => null,
}));

jest.mock('@/components/navigation/game-home-button', () => ({
  GameHomeButton: () => null,
}));

const state = { phase: 'playing' } as unknown as GameState;

describe('useGameScreenHeader', () => {
  it('omits the leave-home header glyph on Android', () => {
    const setOptions = jest.fn();
    const originalOs = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    renderHook(() =>
      useGameScreenHeader({
        navigation: { setOptions },
        state,
        canUndo: false,
        canRedo: false,
        doUndo: jest.fn(),
        doRedo: jest.fn(),
        openOptions: jest.fn(),
        handleReset: jest.fn(),
        confirmLeaveGame: jest.fn(),
      }),
    );

    const headerLeft = setOptions.mock.calls.at(-1)?.[0].headerLeft as () => unknown;
    expect(headerLeft()).toBeNull();

    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
  });
});
