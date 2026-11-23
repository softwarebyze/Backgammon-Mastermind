import { StyleSheet } from 'react-native';
import { cleanup, render, screen } from '@/lib/test-utils';
import { BearOffArea, BearOffSlab } from './bear-off-area';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));

afterEach(cleanup);

function tray(cubeFootprint = 0, counts: { white?: number; black?: number } = {}) {
  const view = render(
    <BearOffArea
      cubeFootprint={cubeFootprint}
      whiteBorneOff={counts.white ?? 2}
      blackBorneOff={counts.black ?? 2}
      isLegalTarget={false}
      currentPlayer="white"
      onPress={jest.fn()}
      width={32}
      boardHeight={300}
      middleHeight={12}
      checkerSize={28}
    />,
  );
  const tokens = view.UNSAFE_getAllByType(BearOffSlab).map(t => ({
    player: t.props.player,
    top: StyleSheet.flatten(t.props.style).top as number,
    bottom: (StyleSheet.flatten(t.props.style).top as number) + t.props.thickness,
  }));
  view.unmount();
  return tokens;
}

it('shows each side\'s count after its newest checker and reads both counts in the tray label', () => {
  render(<BearOffArea whiteBorneOff={7} blackBorneOff={1} isLegalTarget={false} currentPlayer="white" onPress={jest.fn()} width={32} boardHeight={300} middleHeight={12} checkerSize={28} />);
  expect(screen.getByTestId('bear-off-count-white', { includeHiddenElements: true })).toHaveTextContent('7');
  expect(screen.getByTestId('bear-off-count-black', { includeHiddenElements: true })).toHaveTextContent('1');
  expect(screen.getByRole('button').props.accessibilityLabel).toBe('game.controls.bear_off_a11y. positions.white: 7 game.status.off_short. positions.black: 1 game.status.off_short');
});

it('starts each borne-off stack flush at the outer edge, whether or not the board has a cube', () => {
  const plain = tray();
  const withCube = tray(28);
  const firstBlack = (list: typeof plain) => Math.min(...list.filter(t => t.player === 'black').map(t => t.top));
  const firstWhiteBottom = (list: typeof plain) => Math.max(...list.filter(t => t.player === 'white').map(t => t.bottom));
  expect(firstBlack(withCube)).toBe(firstBlack(plain));
  expect(firstWhiteBottom(withCube)).toBe(firstWhiteBottom(plain));
  expect(firstBlack(withCube)).toBe(4);
});

it('draws all 15 checkers and never shows a +N overflow badge', () => {
  const view = render(
    <BearOffArea
      whiteBorneOff={15}
      blackBorneOff={15}
      isLegalTarget={false}
      currentPlayer="white"
      onPress={jest.fn()}
      width={32}
      boardHeight={240}
      middleHeight={12}
      checkerSize={28}
    />,
  );
  expect(view.UNSAFE_getAllByType(BearOffSlab)).toHaveLength(30);
  expect(screen.queryByText(/\+\d+/)).toBeNull();
  view.unmount();
});

it('places the empty-tray placeholder at the outer edge, not mid-tray', () => {
  const view = render(
    <BearOffArea
      whiteBorneOff={0}
      blackBorneOff={0}
      isLegalTarget={false}
      currentPlayer="white"
      onPress={jest.fn()}
      width={32}
      boardHeight={300}
      middleHeight={12}
      checkerSize={28}
    />,
  );
  const slots = screen.getAllByTestId('bear-off-empty-slot');
  expect(slots).toHaveLength(2);
  const tops = slots.map(slot => StyleSheet.flatten(slot.props.style).top as number);
  const halfHeight = (300 - 12) / 2;
  // Black's empty slot is near the top; White's is near the bottom of its half.
  expect(Math.min(...tops)).toBeLessThan(20);
  expect(Math.max(...tops)).toBeGreaterThan(halfHeight - 40);
  view.unmount();
});
