import { StyleSheet } from 'react-native';
import { BoardView } from '@/features/game/components/board/board-view';
import { GamePipStatusBar } from '@/features/game/components/game-pip-status-bar';
import { MatchStatusBar } from '@/features/game/components/match-status-bar';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { resolveBoardViewport } from '@/features/game/hooks/use-board-dimensions';
import { createMatchGame } from '@/lib/game/match';
import { cleanup, fireEvent, screen, setup } from '@/lib/test-utils';

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- public hook mock
  useGamePreferences: () => ({ preferences: { showPointNumbers: false, showMoveHints: false, showDirectionOverlay: false } }),
}));
jest.mock('@/features/game/use-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- public hook mock
  useGame: () => ({ matchAction: jest.fn() }),
}));
afterEach(cleanup);

it.each([[390, 700], [844, 280], [1000, 650]])('keeps board bounds and board-side pips through phases at %s × %s', (width, height) => {
  const dimensions = resolveBoardViewport({ screenWidth: width, screenHeight: height, slotWidth: width, slotHeight: height, platform: 'native' });
  const state = createMatchGame(3);
  const board = () => <BoardView boardPresentation state={state} dimensions={dimensions} previewTarget={null} moveAnimation={null} onPointPress={jest.fn()} onPointPressIn={jest.fn()} onPointPressOut={jest.fn()} onBarPress={jest.fn()} onBearOffPress={jest.fn()} />;
  const view = setup(board());
  const bounds = StyleSheet.flatten(screen.getByTestId('board-view').props.style);
  const surface = StyleSheet.flatten(screen.getByTestId('board-playing-surface').props.style);
  const center = StyleSheet.flatten(screen.getByTestId('board-cube-slot').props.style).top;
  expect(screen.getByTestId('pip-count-black')).toHaveTextContent('167');
  expect(screen.getByTestId('pip-count-white')).toHaveTextContent('167');
  for (const phase of ['rolling', 'moving', 'no-move', 'game-over'] as const) {
    state.phase = phase;
    view.rerender(board());
    expect(StyleSheet.flatten(screen.getByTestId('board-view').props.style)).toEqual(bounds);
    expect(StyleSheet.flatten(screen.getByTestId('board-playing-surface').props.style)).toEqual(surface);
  }
  state.match!.cube = { value: 2, owner: 'black' };
  view.rerender(board());
  expect(StyleSheet.flatten(screen.getByTestId('board-cube-slot').props.style).top).toBeLessThan(center);
  expect(screen.queryByText('Black')).toBeNull();
  state.match!.cube.owner = 'white';
  view.rerender(board());
  expect(StyleSheet.flatten(screen.getByTestId('board-cube-slot').props.style).top).toBeGreaterThan(center);
  state.match!.pendingOffer = 'black';
  view.rerender(board());
  expect(screen.getByTestId('match-cube-pending-black')).toBeOnTheScreen();
  expect(screen.getByText('4')).toBeOnTheScreen();
});

it('keeps live opening and AI headlines out of historical match views', () => {
  const state = createMatchGame(3, 'vs-computer');
  state.currentPlayer = 'black';
  state.phase = 'rolling';
  setup(<MatchStatusBar state={state} headline="Black is rolling" isReviewing />);
  expect(screen.queryByText('Black is rolling')).toBeNull();
  expect(screen.getByTestId('match-turn')).toHaveTextContent(/Reviewing/);
});

it('ignores live opening and offer captions while reviewing', () => {
  const state = createMatchGame(3, 'vs-computer');
  state.match!.pendingOffer = 'black';
  setup(<GameScreenControls state={state} liveDiceState={state} isHumanTurn={false} isComputerTurn isReviewing moveLogLength={1} captionOverride="Black is rolling" onRoll={jest.fn()} onReset={jest.fn()} />);
  expect(screen.getByTestId('game-action-caption')).toHaveTextContent(/Reviewing/);
  expect(screen.queryByText(/offers a double/)).toBeNull();
});

it('keeps match strategy visible and opens its explanation without duplicate header pips', () => {
  setup(<GamePipStatusBar state={createMatchGame(3)} showPips={false} />);
  expect(screen.queryByText('167')).toBeNull();
  fireEvent.press(screen.getByTestId('strategy-line'));
  expect(screen.getByTestId('strategy-explanation')).toBeOnTheScreen();
});
