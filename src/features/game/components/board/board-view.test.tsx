/**
 * App RTL mirrors flex rows and absolute `left`. The board's geometry is part
 * of the rules, so the board root opts out and stays left-to-right.
 *
 * Point numbers are also a rules aid: they come from the perspective the game
 * screen passes (the player to act, or the reviewed player) and only render
 * when the existing preference is on.
 */
import { I18nManager, StyleSheet } from 'react-native';

import { resolveBoardViewport } from '@/features/game/hooks/use-board-dimensions';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, render, screen } from '@/lib/test-utils';

import { BoardView } from './board-view';

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({
    preferences: { showPointNumbers: false, showMoveHints: false, showDirectionOverlay: false },
  }),
}));

const DIMENSIONS = resolveBoardViewport({
  screenWidth: 402,
  screenHeight: 874,
  platform: 'native',
  slotWidth: 402,
  slotHeight: 340,
  showPointNumbers: true,
});

afterEach(() => {
  I18nManager.forceRTL(false);
  cleanup();
});

function renderBoard(
  numberPerspective: 'white' | 'black' = 'white',
  showPointNumbers = false,
) {
  render(
    <BoardView
      state={createInitialState('vs-human')}
      dimensions={DIMENSIONS}
      previewTarget={null}
      moveAnimation={null}
      onPointPress={() => {}}
      onPointPressIn={() => {}}
      onPointPressOut={() => {}}
      onBarPress={() => {}}
      onBearOffPress={() => {}}
      numberPerspective={numberPerspective}
      aidsOverride={{ showPointNumbers }}
    />,
  );
}

describe('board view layout direction', () => {
  it('stays LTR when the app locale is RTL', () => {
    I18nManager.forceRTL(true);
    renderBoard('white', false);

    const style = StyleSheet.flatten(screen.getByTestId('board-view').props.style);
    expect(style.direction).toBe('ltr');
  });
});

describe('board view point numbers', () => {
  it('hides both rails when the preference is off', () => {
    renderBoard('white', false);

    expect(screen.queryByTestId('point-number-rail-top')).toBeNull();
    expect(screen.queryByTestId('point-number-rail-bottom')).toBeNull();
  });

  it('shows the active player\'s labels when the preference is on', () => {
    renderBoard('black', true);

    expect(screen.getByTestId('point-number-rail-top')).toBeTruthy();
    expect(screen.getByTestId('point-number-rail-bottom')).toBeTruthy();
    // Black's ace-point (physical 24, top right) reads 1.
    expect(screen.getByTestId('point-number-top-24-1')).toBeTruthy();
    expect(screen.getByTestId('point-number-bottom-1-24')).toBeTruthy();
  });

  it('keeps the rail order fixed when the locale is RTL', () => {
    I18nManager.forceRTL(true);
    renderBoard('black', true);

    expect(screen.getByTestId('point-number-top-24-1')).toBeTruthy();
    expect(screen.getByTestId('point-number-bottom-1-24')).toBeTruthy();
    expect(screen.queryByTestId('point-number-top-24-24')).toBeNull();
  });
});
