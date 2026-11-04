/**
 * App RTL mirrors flex rows and absolute `left`. The board's geometry is part
 * of the rules, so the board root opts out and stays left-to-right.
 */
import { I18nManager, StyleSheet } from 'react-native';

import { resolveBoardViewport } from '@/features/game/hooks/use-board-dimensions';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, fireEvent, render, screen } from '@/lib/test-utils';

import { BarArea } from './bar-area';
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

it('setup selects the exact empty point rather than a nearby playable source', () => {
  const onPointPress = jest.fn();
  render(
    <BoardView
      state={createInitialState('vs-human')}
      dimensions={resolveBoardViewport({ screenWidth: 402, screenHeight: 874, platform: 'native' })}
      previewTarget={null}
      moveAnimation={null}
      editMode
      onPointPress={onPointPress}
      onPointPressIn={() => {}}
      onPointPressOut={() => {}}
      onBarPress={() => {}}
      onBearOffPress={() => {}}
    />,
  );
  fireEvent.press(screen.getByTestId('point-5'));
  expect(onPointPress).toHaveBeenCalledWith(5);
});

it.each(['white', 'black'] as const)('announces the %s bar count that accessibility actions adjust', (player) => {
  const editor = { onStart: jest.fn(), onDelta: jest.fn(), onEnd: jest.fn(), onCancel: jest.fn(), onAdjust: jest.fn() };
  render(<BarArea whiteCount={2} blackCount={7} currentPlayer={player} selectedPoint={0} onPressBar={jest.fn()} barWidth={28} boardHeight={260} middleHeight={12} checkerSize={20} stackEditor={editor} />);
  const bar = screen.getByTestId('position-board-bar');
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 15, now: player === 'white' ? 2 : 7 });
  fireEvent(bar, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(editor.onAdjust).toHaveBeenCalledWith(0, 1);
});
