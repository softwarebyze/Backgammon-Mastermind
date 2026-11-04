import { sageCubeDecision } from 'expo-bgsage';
import { createPositionState } from '@/lib/game/create-position';
import { createMatch } from '@/lib/game/match';
import { bgsageEngine } from './bgsage-engine';
import { engineCubeContext } from './cube-context';

jest.mock('expo-bgsage', () => ({ sageCubeDecision: jest.fn() }));
const verdict = { action: 'Double/Take', shouldDouble: true, shouldTake: true, shouldBeaver: false, equityNoDouble: 0.5, equityDoubleTake: 0.6, equityDoublePass: 1 };
function position() {
  return createPositionState({ useStandardSetup: true, match: createMatch(0) });
}
beforeEach(() => jest.mocked(sageCubeDecision).mockReset().mockResolvedValue(verdict));
it.each(['center', 'white', 'black'] as const)('passes the cube and relative owner %s', async (owner) => {
  const state = position();
  state.match!.cube = { value: 4, owner };
  await expect(bgsageEngine.analyzeCube!(state)).resolves.toEqual(verdict);
  expect(sageCubeDecision).toHaveBeenCalledWith(state, 4, owner === 'center' ? 0 : owner === 'white' ? 1 : 2, 2, engineCubeContext(state));
});
it('passes match score relative to the roller and the Crawford flag', () => {
  const state = position();
  state.currentPlayer = 'black';
  state.match = { ...createMatch(7), score: { white: 3, black: 6 }, crawford: true };
  expect(engineCubeContext(state)).toMatchObject({ awayPlayer: 1, awayOpponent: 4, crawford: true, jacoby: false, beavers: false });
});
it('passes money flags and the configured cube limit', () => {
  const state = position();
  Object.assign(state.match!, { jacoby: false, beavers: true, cubeLimit: 64 });
  expect(engineCubeContext(state)).toMatchObject({ awayPlayer: 0, awayOpponent: 0, jacoby: false, beavers: true, maxCube: 64 });
});
it.each(['equityNoDouble', 'equityDoubleTake', 'equityDoublePass'] as const)('rejects unusable %s', async (field) => {
  jest.mocked(sageCubeDecision).mockResolvedValue({ ...verdict, [field]: Number.NaN });
  await expect(bgsageEngine.analyzeCube!(position())).rejects.toThrow('no usable cube analysis');
});
it('propagates engine failure', async () => {
  jest.mocked(sageCubeDecision).mockRejectedValue(new Error('unavailable'));
  await expect(bgsageEngine.analyzeCube!(position())).rejects.toThrow('unavailable');
});
