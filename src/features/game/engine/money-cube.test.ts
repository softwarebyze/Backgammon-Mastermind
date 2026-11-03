import { sageCubeDecision } from 'expo-bgsage';
import { createPositionState } from '@/lib/game/create-position';
import { bgsageEngine } from './bgsage-engine';

jest.mock('expo-bgsage', () => ({ sageCubeDecision: jest.fn() }));

const verdict = {
  action: 'Double/Take',
  shouldDouble: true,
  shouldTake: true,
  equityNoDouble: 0.5,
  equityDoubleTake: 0.6,
  equityDoublePass: 1,
};

beforeEach(() => jest.mocked(sageCubeDecision).mockReset());

it.each([0, 1, 2] as const)('passes the cube and relative owner %s to the engine', async (owner) => {
  const state = createPositionState({ useStandardSetup: true });
  jest.mocked(sageCubeDecision).mockResolvedValue(verdict);
  await expect(bgsageEngine.analyzeMoneyCube!(state, { value: 4, owner })).resolves.toEqual({ shouldDouble: true, shouldTake: true });
  expect(sageCubeDecision).toHaveBeenCalledWith(state, 4, owner, 2);
});

it.each(['equityNoDouble', 'equityDoubleTake', 'equityDoublePass'] as const)('rejects unusable %s', async (field) => {
  jest.mocked(sageCubeDecision).mockResolvedValue({ ...verdict, [field]: Number.NaN });
  await expect(bgsageEngine.analyzeMoneyCube!(createPositionState(), { value: 1, owner: 0 })).rejects.toThrow('no usable cube analysis');
});

it('propagates engine failure without a heuristic recommendation', async () => {
  jest.mocked(sageCubeDecision).mockRejectedValue(new Error('unavailable'));
  await expect(bgsageEngine.analyzeMoneyCube!(createPositionState(), { value: 1, owner: 0 })).rejects.toThrow('unavailable');
});
