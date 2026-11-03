import type { GameEngine } from './engine';
import { createPositionState } from '@/lib/game/create-position';
import { createMatch, offerDouble } from '@/lib/game/match';
import { getMoneyCubeHint } from './money-cube-hint';

function position() {
  return createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(0) });
}
const analyzeMoneyCube = jest.fn();
const engine: GameEngine = { id: 'test', planTurn: jest.fn(), boardAfterTurn: jest.fn(), analyzeMoneyCube };
beforeEach(() => analyzeMoneyCube.mockReset());

it.each([true, false])('recommends whether to double: %s', async (shouldDouble) => {
  analyzeMoneyCube.mockResolvedValue({ shouldDouble, shouldTake: true });
  await expect(getMoneyCubeHint(position(), engine)).resolves.toBe(shouldDouble ? 'double' : 'no_double');
});

it.each(['white', 'black'] as const)('keeps %s offerer on roll when advising the responder', async (player) => {
  const state = position();
  state.currentPlayer = player;
  state.match!.cube = { value: 4, owner: player };
  const offered = offerDouble(state, 0);
  analyzeMoneyCube.mockResolvedValue({ shouldDouble: false, shouldTake: false });
  await expect(getMoneyCubeHint(offered, engine)).resolves.toBe('drop');
  expect(analyzeMoneyCube).toHaveBeenCalledWith(offered, { value: 4, owner: 1 });
  analyzeMoneyCube.mockResolvedValue({ shouldDouble: false, shouldTake: true });
  await expect(getMoneyCubeHint(offered, engine)).resolves.toBe('accept');
});

it.each(['match', 'rolled', 'opponent cube', 'finished', 'Jacoby off'] as const)('does not analyze unsupported state: %s', async (reason) => {
  const state = position();
  if (reason === 'match')
    state.match = createMatch(5);
  if (reason === 'rolled')
    state.phase = 'moving';
  if (reason === 'opponent cube')
    state.match!.cube.owner = 'black';
  if (reason === 'finished')
    state.phase = 'game-over';
  if (reason === 'Jacoby off')
    state.match!.jacoby = false;
  await expect(getMoneyCubeHint(state, engine)).rejects.toThrow();
  expect(analyzeMoneyCube).not.toHaveBeenCalled();
});

it('can advise Jacoby-off play after the cube has been turned', async () => {
  const state = position();
  state.match!.jacoby = false;
  state.match!.cube = { value: 2, owner: 'white' };
  analyzeMoneyCube.mockResolvedValue({ shouldDouble: false, shouldTake: true });
  await expect(getMoneyCubeHint(state, engine)).resolves.toBe('no_double');
});
