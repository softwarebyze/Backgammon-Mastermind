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

describe('exact taps for Learn questions (#299)', () => {
  function renderBoard(exactTaps: boolean | undefined, onPointPress: (index: number) => void) {
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

  // Black's 19-point sits right above white's 6-point. Snapping a tap on 19
  // into 6 is fine for a quiz's emphasized answer but wrong during play: the
  // tap used to remap to the same-column mate and could auto-play it, so
  // opponent wood now stays exact (empty-wood near-miss snapping still lives
  // in hit-test-board.test.ts).
  it('reports the point actually touched, not the emphasized answer next to it', () => {
    const onPointPress = jest.fn();
    renderBoard(true, onPointPress);
    fireEvent.press(screen.getByTestId('point-19'));
    expect(onPointPress).toHaveBeenCalledWith(19);
  });

  it('still reports the opponent point itself during play', () => {
    const onPointPress = jest.fn();
    renderBoard(false, onPointPress);
    fireEvent.press(screen.getByTestId('point-19'));
    expect(onPointPress).toHaveBeenCalledWith(19);
  });

  it('reports the opponent point by default, when exactTaps is omitted', () => {
    const onPointPress = jest.fn();
    renderBoard(undefined, onPointPress);
    fireEvent.press(screen.getByTestId('point-19'));
    expect(onPointPress).toHaveBeenCalledWith(19);
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
