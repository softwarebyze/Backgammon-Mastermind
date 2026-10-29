import type { GameState, Player } from './types';
import { createPositionState } from './create-position';
import { createTimeline, currentTimelineState, pushTimelineSnapshot, rebuildTimelineFromLog, redoTimeline, undoTimeline } from './game-timeline';
import { acceptDouble, canOfferDouble, createMatch, createMatchGame, dropDouble, nextMatchGame, offerDouble, scoreMatchGame } from './match';
import { appendMoveLogEntry } from './move-log';
import { applyDiceRoll, applyMove } from './moves';
import { makePersistedSession, parsePersistedSessionValue } from './persisted-session';

function preRoll(length: 3 | 5 = 5): GameState {
  return { ...createMatchGame(length), phase: 'rolling' };
}
function finishing(winner: Player = 'white', loserOff = 1, backgammon = false): GameState {
  const loser = winner === 'white' ? 'black' : 'white';
  return createPositionState({ mode: 'vs-human', currentPlayer: winner, match: createMatch(5), placements: [{ point: winner === 'white' ? 1 : 24, player: winner, count: 1 }, { point: backgammon ? (winner === 'white' ? 2 : 23) : (winner === 'white' ? 24 : 1), player: loser, count: 15 - loserOff }], borneOff: { [winner]: 14, [loser]: loserOff }, dice: [1, 1] });
}
function win(state: GameState): GameState {
  return applyMove(state, { from: state.currentPlayer === 'white' ? 1 : 24, to: 25, dieIndex: 0 });
}

describe('match cube rules', () => {
  it('acceptor owns cube, offerer still rolls; only owner may redouble', () => {
    const offered = offerDouble(preRoll(), 7);
    expect(offered.match?.cube.value).toBe(1);
    expect(applyDiceRoll(offered, [6, 6])).toBe(offered);
    expect(canOfferDouble(offered)).toBe(false);
    const accepted = acceptDouble(offered);
    expect(accepted.currentPlayer).toBe('white');
    expect(accepted.match?.cube).toEqual({ value: 2, owner: 'black' });
    expect(accepted.match?.undoFloor).toBe(7);
    expect(canOfferDouble(accepted)).toBe(false);
    expect(canOfferDouble({ ...accepted, currentPlayer: 'black' })).toBe(true);
    const redouble = acceptDouble(offerDouble({ ...accepted, currentPlayer: 'black' }, 9));
    expect(redouble.match?.cube).toEqual({ value: 4, owner: 'white' });
  });
  it('forbids opening, post-roll, Crawford, completed and dead-cube offers', () => {
    const state = preRoll();
    expect(canOfferDouble(state)).toBe(true);
    expect(canOfferDouble(createMatchGame(5))).toBe(false);
    expect(canOfferDouble(applyDiceRoll(state, [3, 1]))).toBe(false);
    expect(canOfferDouble({ ...state, mode: 'vs-computer' })).toBe(true);
    expect(canOfferDouble({ ...state, match: { ...state.match!, crawford: true } })).toBe(false);
    const dead = { ...state, match: { ...state.match!, score: { white: 4, black: 0 } } };
    expect(canOfferDouble(dead)).toBe(false);
    expect(canOfferDouble({ ...dead, currentPlayer: 'black' })).toBe(true);
    expect(canOfferDouble(dropDouble(offerDouble(state, 0)))).toBe(false);
  });
  it('drop awards the previous stake exactly once, without a gammon multiplier', () => {
    const state = acceptDouble(offerDouble(preRoll(), 0));
    const dropped = dropDouble(offerDouble({ ...state, currentPlayer: 'black' }, 0));
    expect(dropped.match?.score).toEqual({ white: 0, black: 2 });
    expect(dropped.match?.result).toEqual({ winner: 'black', points: 2, kind: 'drop' });
    expect(dropDouble(dropped)).toBe(dropped);
    expect(scoreMatchGame(dropped)).toBe(dropped);
  });
  it.each(['white', 'black'] as const)('scores single, gammon and backgammon for %s with uncapped scores', (player) => {
    for (const [off, back, points, kind] of [[1, false, 2, 'single'], [0, false, 4, 'gammon'], [0, true, 6, 'backgammon']] as const) {
      const state = finishing(player, off, back);
      state.match = { ...state.match!, cube: { value: 2, owner: player } };
      const result = win(state);
      expect(result.match?.score[player]).toBe(points);
      expect(result.match?.result?.kind).toBe(kind);
      expect(result.match?.winner).toBe(points >= 5 ? player : null);
      expect(scoreMatchGame(result)).toBe(result);
    }
  });
  it('a loser on the bar loses a backgammon; a checker off makes it a single', () => {
    for (const off of [0, 1]) {
      const s = finishing('white', off);
      s.points[24]!.count--;
      s.bar.black = 1;
      expect(win(s).match?.result?.kind).toBe(off ? 'single' : 'backgammon');
    }
  });
  it('plays Crawford once, then restores cube access for the trailer; ends at target', () => {
    const s = finishing();
    s.match = { ...s.match!, length: 3, cube: { value: 2, owner: 'black' } };
    const scored = win(s);
    const crawford = nextMatchGame(scored);
    expect(crawford.phase).toBe('opening-roll');
    expect(crawford.match).toMatchObject({ crawford: true, crawfordPlayed: true, score: { white: 2, black: 0 }, cube: { value: 1, owner: 'center' } });
    const blackWin = { ...finishing('black'), match: crawford.match };
    const post = nextMatchGame(win(blackWin));
    expect(post.match?.crawford).toBe(false);
    expect(canOfferDouble({ ...post, phase: 'rolling', currentPlayer: 'black' })).toBe(true);
    const matchEnd = win({ ...finishing(), match: post.match });
    expect(matchEnd.match?.winner).toBe('white');
    expect(nextMatchGame(matchEnd)).toBe(matchEnd);
  });
});

describe('match recovery and history', () => {
  it('cold undo preserves a double accepted after the previous turn', () => {
    const baseline = preRoll();
    const rolled = applyDiceRoll(baseline, [3, 1]);
    const move = { from: 6, to: 3, dieIndex: 0 };
    const first = applyMove(rolled, move);
    const firstLog = appendMoveLogEntry([], { before: rolled, after: first, player: 'white', dice: rolled.dice, move });
    const secondMove = { from: 6, to: 5, dieIndex: 0 };
    const second = applyMove(first, secondMove);
    const secondLog = appendMoveLogEntry(firstLog, { before: first, after: second, player: 'white', dice: first.dice, move: secondMove });
    expect(second.currentPlayer).toBe('black');
    expect(second.phase).toBe('rolling');
    const accepted = acceptDouble(offerDouble(second, 2));
    const blackRoll = applyDiceRoll(accepted, [3, 1]);
    const blackMove = { from: 19, to: 22, dieIndex: 0 };
    const after = applyMove(blackRoll, blackMove);
    const log = appendMoveLogEntry(secondLog, { before: blackRoll, after, player: 'black', dice: blackRoll.dice, move: blackMove });
    const restored = rebuildTimelineFromLog(baseline, log, after);
    const undone = currentTimelineState(undoTimeline(restored, log[2]!));
    expect(undone.match?.cube).toEqual({ value: 2, owner: 'white' });
    expect(undone.match?.undoFloor).toBe(2);
    expect(undone.dice).toEqual([3, 1]);
  });
  it.each(['pending', 'accepted', 'dropped'] as const)('roundtrips %s cube state without stripping match data', (kind) => {
    const pending = offerDouble(preRoll(), 0);
    const state = kind === 'accepted' ? acceptDouble(pending) : kind === 'dropped' ? dropDouble(pending) : pending;
    const parsed = parsePersistedSessionValue(JSON.parse(JSON.stringify(makePersistedSession({ state, moveLog: [], replayBaseline: null }))));
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      expect(parsed.session.state).toEqual(state);
  });
  it('old single-game saves remain compatible and malformed pending offers are rejected', () => {
    const legacy = createMatchGame(3);
    delete legacy.match;
    expect(parsePersistedSessionValue(makePersistedSession({ state: legacy, moveLog: [], replayBaseline: null })).ok).toBe(true);
    const state = offerDouble(preRoll(), 0);
    state.phase = 'moving';
    expect(parsePersistedSessionValue(makePersistedSession({ state, moveLog: [], replayBaseline: null })).ok).toBe(false);
  });
  it('winning move undo/redo and cold rebuild restore score, cube and same dice', () => {
    const before = finishing();
    before.match = { ...before.match!, cube: { value: 2, owner: 'black' } };
    const next = win(before);
    const move = { from: 1, to: 25, dieIndex: 0 };
    const log = appendMoveLogEntry([], { before, after: next, player: 'white', dice: before.dice, move });
    const timeline = pushTimelineSnapshot(createTimeline(before), before, next);
    const undone = undoTimeline(timeline, log[0]!, next);
    expect(currentTimelineState(undone).match?.score.white).toBe(0);
    expect(currentTimelineState(undone).dice).toEqual([1, 1]);
    expect(currentTimelineState(redoTimeline(undone)).match?.score.white).toBe(2);
    const session = parsePersistedSessionValue(makePersistedSession({ state: next, moveLog: log, replayBaseline: before }));
    expect(session.ok).toBe(true);
    if (!session.ok)
      return;
    const restored = rebuildTimelineFromLog(session.session.replayBaseline!, session.session.moveLog, session.session.state);
    expect(currentTimelineState(restored).match).toEqual(next.match);
    expect(currentTimelineState(undoTimeline(restored, log[0]!)).match).toEqual(before.match);
  });
});

it('preserves computer mode through Crawford, post-Crawford and a match win', () => {
  let state = { ...finishing('black'), mode: 'vs-computer' as const };
  state.match = { ...state.match!, length: 3, cube: { value: 2, owner: 'white' } };
  const crawford = nextMatchGame(win(state));
  expect(crawford.mode).toBe('vs-computer');
  expect(crawford.match?.crawford).toBe(true);
  const post = nextMatchGame(win({ ...finishing('white'), mode: 'vs-computer', match: crawford.match }));
  expect(post.mode).toBe('vs-computer');
  expect(post.match?.crawford).toBe(false);
  expect(post.match?.crawfordPlayed).toBe(true);
  expect(canOfferDouble({ ...post, phase: 'rolling', currentPlayer: 'white' })).toBe(true);
  expect(canOfferDouble({ ...post, phase: 'rolling', currentPlayer: 'black' })).toBe(false);
  state = { ...finishing('black'), mode: 'vs-computer', match: post.match };
  const won = win(state);
  expect(won.match?.winner).toBe('black');
  expect(nextMatchGame(won)).toBe(won);
});

it.each(['white', 'black'] as const)('recovers computer %s offers, takes, drops, results and Crawford without losing mode', (offerer) => {
  const rolling = { ...preRoll(), mode: 'vs-computer' as const, currentPlayer: offerer };
  const offered = offerDouble(rolling, 0);
  const dropped = dropDouble(offered);
  const crawford = nextMatchGame({ ...dropped, match: { ...dropped.match!, length: 3, score: { white: 2, black: 0 } } });
  for (const state of [offered, acceptDouble(offered), dropped, crawford]) {
    const parsed = parsePersistedSessionValue(JSON.parse(JSON.stringify(makePersistedSession({ state, moveLog: [], replayBaseline: rolling }))));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.session.state).toEqual(state);
      expect(parsed.session.state.mode).toBe('vs-computer');
      expect(parsed.session.replayBaseline?.mode).toBe('vs-computer');
    }
  }
});
