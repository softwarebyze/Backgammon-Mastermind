/**
 * App RTL mirrors flex rows and absolute `left`. The board's geometry is part
 * of the rules, so the board root opts out and stays left-to-right.
 */
import { I18nManager, StyleSheet } from 'react-native';

import { resolveBoardViewport } from '@/features/game/hooks/use-board-dimensions';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, fireEvent, render, screen } from '@/lib/test-utils';

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

describe('exact taps for Learn questions (#299)', () => {
  function renderBoard(exactTaps: boolean, onPointPress: (index: number) => void) {
    const dimensions = resolveBoardViewport({
      screenWidth: 402,
      screenHeight: 874,
      platform: 'native',
      slotWidth: 402,
      slotHeight: 340,
      showPointNumbers: false,
    });
    const state = { ...createInitialState('vs-human'), phase: 'moving' as const, dice: [3, 1] as [number, number], remainingDice: [3, 1] };
    render(
      <BoardView
        state={state}
        dimensions={dimensions}
        previewTarget={null}
        moveAnimation={null}
        onPointPress={onPointPress}
        onPointPressIn={() => {}}
        onPointPressOut={() => {}}
        onBarPress={() => {}}
        onBearOffPress={() => {}}
        emphasisPoints={new Set([6])}
        exactTaps={exactTaps}
      />,
    );
  }

  // Black's 19-point sits right above white's 6-point. Snapping turns a tap
  // on 19 into the emphasized 6 — fine for moving, wrong for a quiz.
  it('reports the point actually touched, not the emphasized answer next to it', () => {
    const onPointPress = jest.fn();
    renderBoard(true, onPointPress);
    fireEvent.press(screen.getByTestId('point-19'));
    expect(onPointPress).toHaveBeenCalledWith(19);
  });

  it('still snaps near-misses during play', () => {
    const onPointPress = jest.fn();
    renderBoard(false, onPointPress);
    fireEvent.press(screen.getByTestId('point-19'));
    expect(onPointPress).toHaveBeenCalledWith(6);
  });
});
