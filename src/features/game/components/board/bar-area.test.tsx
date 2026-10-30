import { I18nManager } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@/lib/test-utils';
import { BarArea } from './bar-area';
import { CheckerToken } from './checker-token';

afterEach(() => {
  I18nManager.forceRTL(false);
  cleanup();
});

it.each([false, true])('keeps both player stacks and overflow badges accessible with RTL=%s', (rtl) => {
  I18nManager.forceRTL(rtl);
  const onPressBar = jest.fn();
  render(<BarArea whiteCount={7} blackCount={6} currentPlayer="white" selectedPoint={0} onPressBar={onPressBar} barWidth={28} boardHeight={300} middleHeight={12} checkerSize={24} />);
  const bar = screen.getByRole('button', { name: 'Bar, 7 white checkers, 6 black checkers' });
  fireEvent.press(bar);
  expect(onPressBar).toHaveBeenCalledTimes(1);
  expect(screen.getByText('7')).toBeTruthy();
  expect(screen.getByText('6')).toBeTruthy();
  const tokens = screen.UNSAFE_getAllByType(CheckerToken);
  expect(tokens.filter(token => token.props.player === 'black')).toHaveLength(4);
  expect(tokens.filter(token => token.props.player === 'white')).toHaveLength(4);
  expect(tokens.filter(token => token.props.isSelected)).toHaveLength(1);
});

it('outlines an emphasized bar without putting the selection ring on a checker', () => {
  // A checker entering from (or hit onto) the bar emphasizes it while it flies;
  // the checkers still waiting there are not selected.
  render(<BarArea whiteCount={2} blackCount={0} currentPlayer="white" selectedPoint={null} emphasized onPressBar={jest.fn()} barWidth={28} boardHeight={300} middleHeight={12} checkerSize={24} />);
  const tokens = screen.UNSAFE_getAllByType(CheckerToken);
  expect(tokens).toHaveLength(2);
  expect(tokens.filter(token => token.props.isSelected)).toHaveLength(0);
});
