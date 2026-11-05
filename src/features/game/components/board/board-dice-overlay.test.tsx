import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { StyleSheet } from 'react-native';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { cleanup, fireEvent, render, screen, within } from '@/lib/test-utils';
import { boardDiceSide, boardDieGap, boardDieSize, boardHalfFrame, hasBoardDice } from './board-dice-layout';
import { BoardDiceOverlay } from './board-dice-overlay';

afterEach(cleanup);

const DIMS = {
  boardWidth: 382,
  boardHeight: 400,
  boardFrameWidth: 4,
  boardOuterWidth: 390,
  boardOuterHeight: 408,
  colWidth: 26.8,
  checkerSize: 24.8,
  pointHeight: 194,
  barWidth: 28,
  bearOffWidth: 32,
  middleHeight: 12,
} satisfies BoardDimensions;

const base = { remainingDice: [], displayStyle: 'dots' as const, animateRoll: false, opening: null };

describe('board dice layout', () => {
  it('rolls into the half on the roller\'s right: white right, black left', () => {
    expect(boardDiceSide('white')).toBe('right');
    expect(boardDiceSide('black')).toBe('left');
  });

  it('frames each half of the playing surface around the bar', () => {
    expect(boardHalfFrame(DIMS, 'left')).toEqual({ left: 0, width: 6 * DIMS.colWidth });
    expect(boardHalfFrame(DIMS, 'right')).toEqual({ left: 6 * DIMS.colWidth + DIMS.barWidth, width: 6 * DIMS.colWidth });
  });

  it.each([
    ['phone', DIMS],
    ['narrow, height-bound', fitBoardToViewport(260, 230)],
    ['smallest', fitBoardToViewport(200, 200)],
  ])('fits four dice of a double inside one half (%s board)', (_name, dims) => {
    const half = 6 * dims.colWidth;
    const size = boardDieSize(dims.checkerSize, half);
    expect(4 * size + 3 * boardDieGap(size)).toBeLessThanOrEqual(half);
  });

  it('keeps the readable 26px floor whenever there is room', () => {
    expect(boardDieSize(10)).toBe(26);
    expect(boardDieSize(10, 6 * DIMS.colWidth)).toBe(26);
  });

  it('shows nothing before a roll', () => {
    expect(hasBoardDice({ ...base, dice: [0, 0], player: 'white' })).toBe(false);
    expect(hasBoardDice({ ...base, dice: [3, 1], player: 'white' })).toBe(true);
  });
});

describe('board dice overlay', () => {
  it('draws the roller\'s dice in their half', () => {
    render(<BoardDiceOverlay value={{ ...base, dice: [5, 2], remainingDice: [5, 2], player: 'black' }} dimensions={DIMS} surface={{ left: 4, top: 22 }} />);
    expect(screen.getByTestId('board-dice-left')).toBeTruthy();
    expect(screen.queryByTestId('board-dice-right')).toBeNull();
  });

  it('splits the opening roll: each side\'s die in its own half', () => {
    render(
      <BoardDiceOverlay
        value={{ ...base, dice: [0, 0], player: 'white', opening: { dice: [6, 0], emphasis: null } }}
        dimensions={DIMS}
        surface={{ left: 4, top: 22 }}
      />,
    );
    const white = screen.getByTestId('board-dice-white');
    const black = screen.getByTestId('board-dice-black');
    const leftOf = (node: ReturnType<typeof screen.getByTestId>) => (StyleSheet.flatten(node.props.style) as { left: number }).left;
    // White's die (6) sits in the right half, black's (still rolling) in the left.
    expect(leftOf(white)).toBe(4 + boardHalfFrame(DIMS, 'right').left);
    expect(leftOf(black)).toBe(4 + boardHalfFrame(DIMS, 'left').left);
    expect(within(white).getByTestId('single-die-white')).toBeTruthy();
    expect(within(black).getByTestId('single-die-black')).toBeTruthy();
  });
});

describe('board dice in dice order', () => {
  const surface = { left: 0, top: 0 };
  const rolled = { ...base, dice: [1, 3] as [number, number], remainingDice: [3, 1], player: 'white' as const };

  it('makes the dice and the Swap label one button that swaps the order', () => {
    const onSwap = jest.fn();
    render(<BoardDiceOverlay value={{ ...rolled, diceOrder: { leadingRTL: false, canSwap: true, onSwap } }} dimensions={DIMS} surface={surface} />);
    const target = screen.getByTestId('dice-swap-target');
    expect(target).toHaveProp('accessibilityRole', 'button');
    expect(target).toHaveProp('accessibilityLabel', 'Dice: 1, then 3');
    expect(within(target).getByText('Swap dice')).toBeOnTheScreen();
    fireEvent.press(target);
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it('keeps the same element but hides Swap when there is nothing to swap', () => {
    const onSwap = jest.fn();
    render(<BoardDiceOverlay value={{ ...rolled, diceOrder: { leadingRTL: false, canSwap: false, onSwap } }} dimensions={DIMS} surface={surface} />);
    const target = screen.getByTestId('dice-swap-target');
    expect(target).not.toHaveProp('accessibilityRole', 'button');
    expect(screen.queryByTestId('swap-dice-button')).toBeNull();
    fireEvent.press(target);
    expect(onSwap).not.toHaveBeenCalled();
  });

  it('shows the leading die at the reading edge and marks it spent first', () => {
    render(<BoardDiceOverlay value={{ ...rolled, remainingDice: [3], diceOrder: { leadingRTL: true, canSwap: false, onSwap: jest.fn() } }} dimensions={DIMS} surface={surface} />);
    expect(screen.getByTestId('dice-display')).toHaveStyle({ flexDirection: 'row-reverse' });
  });

  it('leaves the half untouchable without the setting, so checkers underneath still take taps', () => {
    render(<BoardDiceOverlay value={rolled} dimensions={DIMS} surface={surface} />);
    expect(screen.queryByTestId('dice-swap-target')).toBeNull();
  });
});
