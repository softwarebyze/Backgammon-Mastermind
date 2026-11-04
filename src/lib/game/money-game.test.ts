import { newPosition, positionFromGame, positionGame } from '@/lib/positions/position';
import { createPositionState } from './create-position';
import { appendCubeHistoryEvent } from './cube-history';
import { acceptDouble, beaverDouble, canBeaver, canOfferDouble, createMatch, dropDouble, nextMatchGame, offerDouble, scoreMatchGame } from './match';
import { makePersistedSession, parsePersistedSessionValue } from './persisted-session';

function money() {
  return createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(0) });
}

it('offers, takes and redoubles a money cube without a match target', () => {
  const state = money();
  expect(canOfferDouble(state)).toBe(true);
  const taken = acceptDouble(offerDouble(state, 4));
  expect(taken.match).toMatchObject({ cube: { value: 2, owner: 'black' }, undoFloor: 4 });
  expect(canOfferDouble(taken)).toBe(false);
  expect(canOfferDouble({ ...taken, currentPlayer: 'black' })).toBe(true);
  expect(acceptDouble(offerDouble({ ...taken, currentPlayer: 'black' }, 4)).match?.cube).toEqual({ value: 4, owner: 'white' });
});

it('scores a pass at the old stake, then starts another game without Crawford', () => {
  const done = dropDouble(offerDouble(money(), 0));
  expect(done.match).toMatchObject({ score: { white: 1, black: 0 }, winner: null, result: { points: 1, kind: 'drop' } });
  expect(nextMatchGame(done).match).toMatchObject({ cube: { value: 1, owner: 'center' }, score: { white: 1, black: 0 }, gameNumber: 2, crawford: false, winner: null });
});

it.each([[1, true, 1], [1, false, 2], [2, true, 4], [4, true, 8]] as const)('scores a gammon at cube %s with Jacoby %s as %s', (cube, jacoby, points) => {
  const state = createPositionState({ placements: [{ point: 24, player: 'black', count: 15 }], borneOff: { white: 15 }, match: { ...createMatch(0), jacoby, cube: { value: cube, owner: cube === 1 ? 'center' : 'black' } } });
  const done = scoreMatchGame({ ...state, phase: 'game-over', winner: 'white' });
  expect(done.match?.result).toMatchObject({ points, kind: jacoby && cube === 1 ? 'single' : 'gammon' });
  expect(done.match?.winner).toBeNull();
});

it.each(['pending', 'taken', 'finished'] as const)('restores a money game %s cube state', (phase) => {
  const offered = offerDouble(money(), 0);
  const state = phase === 'pending' ? offered : phase === 'taken' ? acceptDouble(offered) : dropDouble(offered);
  const parsed = parsePersistedSessionValue(makePersistedSession({ state, moveLog: [], replayBaseline: null }));
  expect(parsed.ok).toBe(true);
  if (parsed.ok)
    expect(parsed.session.state.match).toEqual(state.match);
});

it.each([[1, 1], [2, 6]] as const)('scores a backgammon at cube %s as %s with Jacoby', (cube, points) => {
  const state = createPositionState({ placements: [{ point: 3, player: 'black', count: 15 }], borneOff: { white: 15 }, match: { ...createMatch(0), cube: { value: cube, owner: cube === 1 ? 'center' : 'black' } } });
  expect(scoreMatchGame({ ...state, phase: 'game-over', winner: 'white' }).match?.result?.points).toBe(points);
});

it('preserves the money cube and Jacoby through editor save and play', () => {
  const state = acceptDouble(offerDouble(money(), 0));
  state.match!.jacoby = false;
  const captured = positionFromGame(state);
  expect(positionGame(captured).match).toMatchObject({ length: 0, jacoby: false, cube: { value: 2, owner: 'black' } });
});

it('saves a finished money position with its scored result', () => {
  const p = newPosition(true);
  p.points[20] = { player: 'black', count: 15 };
  p.borneOff = { white: 15, black: 0 };
  const state = positionGame(p);
  expect(state.match?.result).toMatchObject({ winner: 'white', kind: 'gammon', points: 2 });
  expect(parsePersistedSessionValue(makePersistedSession({ state, moveLog: [], replayBaseline: null })).ok).toBe(true);
});

it('does not silently ignore Beavers on an imported money position', () => {
  const p = newPosition();
  p.context.beavers = true;
  expect(positionGame(p).match?.beavers).toBe(true);
});

it('beavers accept the first double and retain the responder’s ownership on acceptance', () => {
  const state = money();
  state.match!.beavers = true;
  const offered = offerDouble(state, 0);
  expect(canBeaver(offered)).toBe(true);
  const beavered = beaverDouble(offered);
  expect(beavered.match).toMatchObject({ cube: { value: 2, owner: 'black' }, pendingOffer: 'black', pendingBeaver: true });
  expect(beavered.currentPlayer).toBe('white');
  expect(canBeaver(beavered)).toBe(false);
  expect(acceptDouble(beavered).match).toMatchObject({ cube: { value: 4, owner: 'black' }, pendingOffer: null, pendingBeaver: false });
  expect(dropDouble(beavered).match?.result).toEqual({ winner: 'black', points: 2, kind: 'drop' });
});
it('enforces beaver rules and the imported cube limit', () => {
  const state = money();
  expect(canBeaver(offerDouble(state, 0))).toBe(false);
  Object.assign(state.match!, { beavers: true, cubeLimit: 2 });
  expect(canBeaver(offerDouble(state, 0))).toBe(false);
  expect(canOfferDouble(acceptDouble(offerDouble(state, 0)))).toBe(false);
  state.match = { ...createMatch(5), beavers: true };
  expect(canBeaver(offerDouble(state, 0))).toBe(false);
});
it.each(['pending', 'accepted', 'dropped'] as const)('restores a %s beaver without changing ownership or scores', (phase) => {
  const state = money();
  state.match!.beavers = true;
  const beavered = beaverDouble(offerDouble(state, 0));
  const saved = phase === 'pending' ? beavered : phase === 'accepted' ? acceptDouble(beavered) : dropDouble(beavered);
  const parsed = parsePersistedSessionValue(makePersistedSession({ state: saved, moveLog: [], replayBaseline: null }));
  expect(parsed.ok).toBe(true);
  if (parsed.ok)
    expect(parsed.session.state.match).toEqual(saved.match);
});

it.each(['pending', 'accepted', 'dropped'] as const)('cold-restores the complete %s beaver history', (phase) => {
  const start = money();
  start.match!.beavers = true;
  const offered = offerDouble(start, 0);
  const beavered = beaverDouble(offered);
  const end = phase === 'pending' ? beavered : phase === 'accepted' ? acceptDouble(beavered) : dropDouble(beavered);
  let events = appendCubeHistoryEvent([], 'offer', start, offered, 0);
  events = appendCubeHistoryEvent(events, 'beaver', offered, beavered, 0);
  if (end !== beavered)
    events = appendCubeHistoryEvent(events, phase === 'accepted' ? 'accept' : 'drop', beavered, end, 0);
  const parsed = parsePersistedSessionValue(makePersistedSession({ state: end, moveLog: [], replayBaseline: start, cubeEvents: events }));
  expect(parsed).toMatchObject({ ok: true });
  if (parsed.ok)
    expect(parsed.session.cubeEvents).toEqual(events);
});
