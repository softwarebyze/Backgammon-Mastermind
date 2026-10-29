import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { cleanup, render, screen } from '@/lib/test-utils';
import { boardDiceSide, boardDieSize, boardHalfFrame, hasBoardDice } from './board-dice-layout';
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

  it('fits four dice of a double inside one half', () => {
    const size = boardDieSize(DIMS.checkerSize);
    const gap = Math.max(4, Math.round(size * 0.18));
    expect(4 * size + 3 * gap).toBeLessThanOrEqual(6 * DIMS.colWidth);
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
    expect(screen.getByTestId('board-dice-white')).toBeTruthy();
    expect(screen.getByTestId('board-dice-black')).toBeTruthy();
    expect(screen.getByTestId('single-die-white')).toBeTruthy();
  });
});
