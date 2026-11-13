import { StyleSheet } from 'react-native';
import { cleanup, render, screen } from '@/lib/test-utils';
import { BearOffArea, BearOffSlab } from './bear-off-area';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));

afterEach(cleanup);

function tray(cubeClearance = 0, counts: { white?: number; black?: number } = {}) {
  const view = render(
    <BearOffArea
      cubeClearance={cubeClearance}
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
  }));
  view.unmount();
  return tokens;
}

it('has no "off" labels: the player strips show how many are off', () => {
  render(<BearOffArea whiteBorneOff={0} blackBorneOff={0} isLegalTarget={false} currentPlayer="white" onPress={jest.fn()} width={32} boardHeight={300} middleHeight={12} checkerSize={28} />);
  expect(screen.queryByText(/off_short/)).toBeNull();
});

it('starts each borne-off stack past the corner the cube uses', () => {
  const plain = tray();
  const withCube = tray(30);
  const firstBlack = (list: typeof plain) => Math.min(...list.filter(t => t.player === 'black').map(t => t.top));
  const lastWhite = (list: typeof plain) => Math.max(...list.filter(t => t.player === 'white').map(t => t.top));
  expect(firstBlack(withCube)).toBe(firstBlack(plain) + 30);
  expect(lastWhite(withCube)).toBe(lastWhite(plain) - 30);
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
