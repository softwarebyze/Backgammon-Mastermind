/**
 * App RTL mirrors flex rows and absolute `left`. The board's geometry is part
 * of the rules, so the board root opts out and stays left-to-right.
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

afterEach(() => {
  I18nManager.forceRTL(false);
  cleanup();
});

describe('board view layout direction', () => {
  it('stays LTR when the app locale is RTL', () => {
    I18nManager.forceRTL(true);
    const dimensions = resolveBoardViewport({
      screenWidth: 402,
      screenHeight: 874,
      platform: 'native',
      slotWidth: 402,
      slotHeight: 340,
      showPointNumbers: false,
    });

    render(
      <BoardView
        state={createInitialState('vs-human')}
        dimensions={dimensions}
        previewTarget={null}
        moveAnimation={null}
        onPointPress={() => {}}
        onPointPressIn={() => {}}
        onPointPressOut={() => {}}
        onBarPress={() => {}}
        onBearOffPress={() => {}}
      />,
    );

    const style = StyleSheet.flatten(screen.getByTestId('board-view').props.style);
    expect(style.direction).toBe('ltr');
  });
});
