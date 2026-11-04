import type { SageCubeContext } from './cube-context';
import { encodeCubeContext } from './cube-context';
import { gameStateToSageBoard, planSageTurnFull } from './index';

const mockAnalyze = jest.fn();
// Only the Bgsage module is faked; Expo's own native modules (fetch) stay real.
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  return {
    ...actual,
    requireNativeModule: (name: string) => name === 'Bgsage'
      ? { analyzePosition: mockAnalyze, analyzeCheckers: mockAnalyze }
      : actual.requireNativeModule(name),
  };
});
const context: SageCubeContext = { cubeValue: 4, cubeOwner: 2, awayPlayer: 2, awayOpponent: 5, crawford: false, jacoby: false, beavers: false, maxCube: 64, crawfordRule: false };
it('serializes every rule, including the whole-match Crawford setting', () => {
  expect(encodeCubeContext(context)).toEqual([4, 2, 2, 5, 0, 0, 0, 64, 0]);
});
it.each([{ ...context, maxCube: 3 }, { ...context, cubeValue: 128 }, { ...context, awayPlayer: 0 }])('rejects invalid context before crossing the native boundary', (invalid) => {
  expect(() => encodeCubeContext(invalid)).toThrow('unsupported cube context');
});
it('uses cubeful ranking for games and cubeless ranking for lessons', async () => {
  const points = Array.from({ length: 25 }, () => ({ player: null as 'white' | 'black' | null, count: 0 }));
  points[6] = { player: 'white', count: 1 };
  points[8] = { player: 'white', count: 1 };
  points[19] = { player: 'black', count: 15 };
  const state = { points, bar: { white: 0, black: 0 }, currentPlayer: 'white' as const, dice: [3, 1] as [number, number], remainingDice: [3, 1] };
  const a = gameStateToSageBoard(state);
  a[6] = 0;
  a[8] = 0;
  a[3] = 1;
  a[7] = 1;
  const b = gameStateToSageBoard(state);
  b[6] = 0;
  b[8] = 0;
  b[5] = 2;
  mockAnalyze.mockResolvedValue(JSON.stringify({ moves: [{ board: a, equity: 0.7, cubeless_equity: -0.2 }, { board: b, equity: 0.1, cubeless_equity: 0.4 }] }));
  const game = await planSageTurnFull(state, 2, context);
  expect(game.candidates[0].board).toEqual(a);
  expect(game.equity).toBe(0.7);
  expect(mockAnalyze).toHaveBeenCalledWith(gameStateToSageBoard(state), [3, 1], 2, encodeCubeContext(context), 0);
  const lesson = await planSageTurnFull(state, 2);
  expect(lesson.candidates[0].board).toEqual(b);
  expect(lesson.equity).toBe(0.4);
});
