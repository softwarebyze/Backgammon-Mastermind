import type { GameState } from './types';
import { createInitialState } from './constants';
import { createPositionState } from './create-position';
import { createMatch } from './match';
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

describe('saved pending cube eligibility', () => {
  function pending(): GameState {
    return createPositionState({ useStandardSetup: true, mode: 'vs-human', match: { ...createMatch(5), pendingOffer: 'white' } });
  }
  function parses(state: GameState) {
    return parsePersistedSessionValue(makePersistedSession({ state, moveLog: [], replayBaseline: null })).ok;
  }
  it.each(['non-owner', 'dead cube', 'Crawford', 'opening', 'after roll', 'wrong player', 'max cube'] as const)('rejects %s pending offers', (reason) => {
    const state = pending();
    const m = state.match!;
    if (reason === 'non-owner')
      m.cube = { value: 2, owner: 'black' };
    if (reason === 'dead cube')
      m.score.white = 4;
    if (reason === 'Crawford')
      m.crawford = true;
    if (reason === 'opening')
      state.phase = 'opening-roll';
    if (reason === 'after roll') {
      state.phase = 'moving';
      state.dice = [1, 2];
      state.remainingDice = [1, 2];
    }
    if (reason === 'wrong player')
      m.pendingOffer = 'black';
    if (reason === 'max cube')
      m.cube = { value: 2 ** 52, owner: 'white' };
    expect(parses(state)).toBe(false);
  });
  it.each(['center', 'white'] as const)('accepts legal offers owned by %s', (owner) => {
    const state = pending();
    state.match!.cube = { value: owner === 'center' ? 1 : 2, owner };
    expect(parses(state)).toBe(true);
  });
  it('keeps accepted dead cubes and legacy sessions without match metadata', () => {
    const state = pending();
    state.match = { ...state.match!, cube: { value: 8, owner: 'black' }, pendingOffer: null };
    expect(parses(state)).toBe(true);
    delete state.match;
    expect(parses(state)).toBe(true);
  });
});
