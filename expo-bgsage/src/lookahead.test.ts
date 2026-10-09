import { flipSageBoard, rescoreWithLookahead } from './lookahead';

const OPENING = [0, -2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0, 2, 0];

describe('flipSageBoard', () => {
  it('mirrors the opening onto itself', () => {
    expect(flipSageBoard(OPENING)).toEqual(OPENING);
  });

  it('swaps bars and is its own inverse', () => {
    const b = OPENING.slice();
    b[25] = 1;
    b[24] = 1;
    b[0] = 2;
    b[1] = 0;
    const f = flipSageBoard(b);
    expect(f[0]).toBe(1);
    expect(f[25]).toBe(2);
    expect(flipSageBoard(f)).toEqual(b);
  });
});

describe('rescoreWithLookahead', () => {
  const a = { board: [...OPENING.slice(0, 25), 0], equity: 0.2 };
  const b = { board: [...OPENING.slice(0, 24), 1, 0], equity: 0.18 };
  const far = { board: [...OPENING.slice(0, 23), 1, 1, 0], equity: -0.5 };

  it('re-ranks close candidates by the opponent\'s best reply and leaves far ones alone', async () => {
    const replyToA = JSON.stringify(flipSageBoard(a.board));
    const analyze = jest.fn(async (board: number[]) => [
      { board, equity: JSON.stringify(board) === replyToA ? 0.3 : 0.1 },
    ]);
    const out = await rescoreWithLookahead([a, b, far], analyze);
    // 21 opponent rolls for each of the two candidates within 0.08.
    expect(analyze).toHaveBeenCalledTimes(42);
    expect(out.map(c => c.board)).toEqual([b.board, a.board, far.board]);
    expect(out[0].equity).toBeCloseTo(-0.1);
    expect(out[2]).toBe(far);
  });

  it('skips lookahead when the move bears off the last checker', async () => {
    const won = { board: [0, -2, ...Array.from({ length: 24 }, () => 0)], equity: 2 };
    const analyze = jest.fn(async () => []);
    expect((await rescoreWithLookahead([won, a], analyze, { maxCandidates: 5, maxLoss: 5 }))[0]).toBe(won);
    expect(analyze).toHaveBeenCalledTimes(21);
  });
});
