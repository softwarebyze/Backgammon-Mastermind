import { createPositionState } from './create-position';
import { appendCubeHistoryEvent, chronologicalHistory } from './cube-history';
import { acceptDouble, createMatch, dropDouble, offerDouble } from './match';
import { groupMoveLogByTurn } from './move-log';
import { makePersistedSession, parsePersistedSessionValue } from './persisted-session';

function fixture() {
  const before = createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(5) });
  const offered = offerDouble(before, 0);
  const taken = acceptDouble(offered);
  const events = appendCubeHistoryEvent(appendCubeHistoryEvent([], 'offer', before, offered, 0), 'accept', offered, taken, 0);
  return { before, offered, taken, events };
}

it('orders cube decisions before the next roll, with unique event identities at the same ply', () => {
  const { events } = fixture();
  const turns = groupMoveLogByTurn([{ ply: 1, player: 'white', dice: [3, 1], from: 6, to: 3 }]);
  expect(chronologicalHistory(turns, events).map(item => item.kind)).toEqual(['cube', 'cube', 'turn']);
  expect(events.map(e => [e.id, e.afterPly, e.player])).toEqual([[1, 0, 'white'], [2, 0, 'black']]);
});

it('does not log rejected cube actions', () => {
  const { before, events } = fixture();
  expect(appendCubeHistoryEvent(events, 'accept', before, acceptDouble(before), 0)).toBe(events);
});

it('parses old V1 sessions without events and roundtrips pending/taken/dropped snapshots', () => {
  const { before, offered, taken, events } = fixture();
  expect(parsePersistedSessionValue(makePersistedSession({ state: before, moveLog: [], replayBaseline: before })).ok).toBe(true);
  for (const state of [offered, taken, dropDouble(offered)]) {
    const cubeEvents = state === offered ? events.slice(0, 1) : state === taken ? events : appendCubeHistoryEvent(events.slice(0, 1), 'drop', offered, state, 0);
    const parsed = parsePersistedSessionValue(JSON.parse(JSON.stringify(makePersistedSession({ state, moveLog: [], replayBaseline: before, cubeEvents }))));
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      expect(parsed.session.cubeEvents).toEqual(cubeEvents);
  }
});

it.each(['actor', 'cube', 'score', 'ply', 'duplicate'] as const)('rejects corrupted history: %s', (bug) => {
  const { before, taken, events } = fixture();
  const cubeEvents = JSON.parse(JSON.stringify(events)) as typeof events;
  if (bug === 'actor')
    cubeEvents[1]!.player = 'white';
  if (bug === 'cube')
    cubeEvents[1]!.after.match!.cube.owner = 'white';
  if (bug === 'score')
    cubeEvents[1]!.after.match!.score.white = 1;
  if (bug === 'ply')
    cubeEvents[1]!.afterPly = 1;
  if (bug === 'duplicate')
    cubeEvents[1]!.id = 1;
  expect(parsePersistedSessionValue(makePersistedSession({ state: taken, moveLog: [], replayBaseline: before, cubeEvents })).ok).toBe(false);
});
