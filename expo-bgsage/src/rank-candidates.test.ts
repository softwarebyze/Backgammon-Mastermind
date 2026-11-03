import { rankCandidates } from './rank-candidates';

it('ranks by the cubeless score used for tutor loss, not the engine JSON order', () => {
  const board = Array.from({ length: 26 }, () => 0);
  const cubefulFirst = { board, equity: 0.1 };
  const cubelessFirst = { board: [...board], equity: 0.3 };
  expect(rankCandidates([cubefulFirst, cubelessFirst])).toEqual([
    cubelessFirst,
    cubefulFirst,
  ]);
});

it('rejects a corrupt candidate before it can be used as a move', () => {
  expect(() => rankCandidates([{ board: [], equity: 0.2 }])).toThrow(/invalid candidate/);
  expect(() => rankCandidates([{ board: Array.from({ length: 26 }, () => Number.NaN), equity: 0.2 }]))
    .toThrow(/invalid candidate/);
  expect(() => rankCandidates([{ board: Array.from({ length: 26 }, () => 0), equity: Number.NaN }]))
    .toThrow(/invalid candidate/);
});
