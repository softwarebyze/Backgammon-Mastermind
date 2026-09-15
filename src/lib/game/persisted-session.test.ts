import { createInitialState } from './constants';
import {
  gameStateInvariantError,
  makePersistedSession,
  parsePersistedSessionJson,
  parsePersistedSessionValue,
} from './persisted-session';

describe('persisted session schema', () => {
  it('accepts a versioned in-progress session', () => {
    const session = makePersistedSession({
      state: createInitialState('vs-computer'),
      moveLog: [],
      replayBaseline: null,
    });
    const parsed = parsePersistedSessionValue(session);
    expect(parsed.ok).toBe(true);
  });

  it('rejects an unsupported version', () => {
    const parsed = parsePersistedSessionValue({
      version: 2,
      state: createInitialState('vs-computer'),
      moveLog: [],
      replayBaseline: null,
    });
    expect(parsed.ok).toBe(false);
  });

  it('rejects invalid JSON text', () => {
    expect(parsePersistedSessionJson('{not-json').ok).toBe(false);
  });
});

describe('game state invariants', () => {
  it('rejects a board that does not have 15 checkers per player', () => {
    const state = createInitialState('vs-human');
    state.points[24] = { player: 'white', count: 1 };
    expect(gameStateInvariantError(state)).toBe('white must have exactly 15 checkers');
  });

  it('rejects game-over without a winner', () => {
    const state = createInitialState('vs-human');
    state.phase = 'game-over';
    expect(gameStateInvariantError(state)).toBe('game-over requires a winner');
  });

  it('hydrates missing openingRolls on otherwise valid state', () => {
    const { openingRolls: _ignored, ...legacy } = createInitialState('vs-computer');
    const parsed = parsePersistedSessionValue({
      version: 1,
      state: legacy,
      moveLog: [],
      replayBaseline: null,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.session.state.openingRolls).toEqual({ white: null, black: null });
    }
  });
});
