import { StyleSheet } from 'react-native';
import { cleanup, render, screen } from '@/lib/test-utils';
import { BearOffArea } from './bear-off-area';
import { CheckerToken } from './checker-token';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));

afterEach(cleanup);

function tray(cubeClearance = 0) {
  const view = render(
    <BearOffArea
      cubeClearance={cubeClearance}
      whiteBorneOff={2}
      blackBorneOff={2}
      isLegalTarget={false}
      currentPlayer="white"
      onPress={jest.fn()}
      width={32}
      boardHeight={300}
      middleHeight={12}
      checkerSize={28}
    />,
  );
  const tokens = view.UNSAFE_getAllByType(CheckerToken).map(t => ({ player: t.props.player, top: StyleSheet.flatten(t.props.style).top as number }));
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
