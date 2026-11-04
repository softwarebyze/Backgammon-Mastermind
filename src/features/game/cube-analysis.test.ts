import type { GameEngine } from './engine';
import { createPositionState } from '@/lib/game/create-position';
import { beaverDouble, createMatch, offerDouble } from '@/lib/game/match';
import { analyzeCubeDecision, getCubeHint } from './cube-analysis';

function position(length = 0) {
  return createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(length) });
}
const analyzeCube = jest.fn();
const engine: GameEngine = { id: 'test', planTurn: jest.fn(), boardAfterTurn: jest.fn(), analyzeCube };
const verdict = { shouldDouble: true, shouldTake: true, shouldBeaver: false, equityNoDouble: 0.5, equityDoubleTake: 0.7, equityDoublePass: 1 };
beforeEach(() => analyzeCube.mockReset().mockResolvedValue(verdict));

it.each([0, 5])('advises doubling in a %s-point game using the complete position', async (length) => {
  const state = position(length);
  await expect(getCubeHint(state, engine)).resolves.toBe('double');
  expect(analyzeCube).toHaveBeenCalledWith(state);
});
it('uses actor-relative values for a take/pass decision', async () => {
  const state = offerDouble(position(), 0);
  await expect(analyzeCubeDecision(state, engine)).resolves.toEqual({ actor: 'black', best: 'accept', values: { accept: -0.7, drop: -1 } });
  analyzeCube.mockResolvedValue({ ...verdict, shouldTake: false, equityDoubleTake: 1.4 });
  await expect(getCubeHint(state, engine)).resolves.toBe('drop');
});
it('supports Jacoby off and beavers without substituting a heuristic', async () => {
  const state = position();
  state.match!.jacoby = false;
  state.match!.beavers = true;
  analyzeCube.mockResolvedValue({ ...verdict, shouldDouble: false, shouldBeaver: true, equityDoubleTake: -0.8 });
  await expect(analyzeCubeDecision(offerDouble(state, 0), engine)).resolves.toEqual({ actor: 'black', best: 'beaver', values: { accept: 0.4, beaver: 0.8, drop: -1 } });
});
it('evaluates answering a beaver at the accepted stake and retained ownership', async () => {
  const state = position();
  state.match!.beavers = true;
  const beavered = beaverDouble(offerDouble(state, 0));
  analyzeCube.mockResolvedValue({ ...verdict, equityNoDouble: -0.7 });
  await expect(analyzeCubeDecision(beavered, engine)).resolves.toEqual({ actor: 'white', best: 'drop', values: { accept: -1.4, drop: -1 } });
  expect(analyzeCube.mock.calls[0][0].match).toMatchObject({ cube: { value: 4, owner: 'black' }, pendingOffer: null, pendingBeaver: false });
});
it.each(['rolled', 'opponent cube', 'finished', 'Crawford', 'cube limit'] as const)('rejects a position without a legal decision: %s', async (reason) => {
  const state = position();
  if (reason === 'rolled')
    state.phase = 'moving';
  if (reason === 'opponent cube')
    state.match!.cube.owner = 'black';
  if (reason === 'finished')
    state.phase = 'game-over';
  if (reason === 'Crawford')
    state.match!.crawford = true;
  if (reason === 'cube limit')
    state.match!.cubeLimit = 1;
  await expect(getCubeHint(state, engine)).rejects.toThrow('No cube decision');
  expect(analyzeCube).not.toHaveBeenCalled();
});
it('propagates engine errors so callers can retry', async () => {
  analyzeCube.mockRejectedValue(new Error('unavailable'));
  await expect(getCubeHint(position(), engine)).rejects.toThrow('unavailable');
});
