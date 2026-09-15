import type { GameState } from './types';
import { getRawString, removeItem, setRawString } from '@/lib/storage';

import { createInitialPoints, createInitialState } from './constants';
import { applyDiceRoll, applyMove, findMoveSequence } from './moves';
import { makePersistedSession } from './persisted-session';
import {
  canContinueSavedGame,
  clearActiveGame,
  discardQuarantinedSession,
  hasQuarantinedSession,
  hasReviewableCompletedGame,
  hasSavedGame,
  isResumableGame,
  loadActiveGame,
  loadMoveLog,
  loadPersistedGame,
  loadPersistedSession,
  loadQuarantinedSession,
  loadRestorableGame,
  saveActiveGame,
  savePersistedSession,
  SESSION_STORAGE_KEYS,
} from './persistence';

jest.mock('@/lib/storage', () => ({
  getRawString: jest.fn(),
  setRawString: jest.fn(),
  removeItem: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedGetRaw = getRawString as jest.MockedFunction<typeof getRawString>;
const mockedSetRaw = setRawString as jest.MockedFunction<typeof setRawString>;
const mockedRemove = removeItem as jest.MockedFunction<typeof removeItem>;

const memory: Record<string, string> = {};

function syncStorageMock() {
  mockedGetRaw.mockImplementation(key => memory[key]);
  mockedSetRaw.mockImplementation((key, value) => {
    memory[key] = value;
  });
  mockedRemove.mockImplementation(async (key) => {
    delete memory[key];
  });
}

function resetMemory() {
  Object.keys(memory).forEach(key => delete memory[key]);
  syncStorageMock();
}

function finishedGame(): GameState {
  return {
    ...createInitialState('vs-computer'),
    phase: 'game-over',
    winner: 'white',
  };
}

function logEntry() {
  return {
    ply: 1,
    player: 'white' as const,
    dice: [3, 5] as [number, number],
    from: 24,
    to: 21,
  };
}

describe('isResumableGame', () => {
  it('returns false for null', () => {
    expect(isResumableGame(null)).toBe(false);
  });

  it('returns true for an in-progress game', () => {
    expect(isResumableGame(createInitialState('vs-computer'))).toBe(true);
  });

  it('returns false for a finished game (TestFlight #1: resume button must hide)', () => {
    expect(isResumableGame(finishedGame())).toBe(false);
  });
});

describe('hasSavedGame', () => {
  beforeEach(resetMemory);

  it('returns false when MMKV only has a finished game (TestFlight #1)', () => {
    savePersistedSession({
      state: finishedGame(),
      moveLog: [],
      replayBaseline: null,
    });
    expect(hasSavedGame()).toBe(false);
  });
});

describe('loadRestorableGame', () => {
  beforeEach(resetMemory);

  it('returns in-progress save for cold launch (TestFlight #5)', () => {
    const saved = createInitialState('vs-computer');
    savePersistedSession({ state: saved, moveLog: [], replayBaseline: null });
    expect(loadRestorableGame()).toEqual(saved);
  });

  it('returns null when only a finished save exists', () => {
    savePersistedSession({
      state: finishedGame(),
      moveLog: [],
      replayBaseline: null,
    });
    expect(loadRestorableGame()).toBeNull();
  });
});

describe('canContinueSavedGame', () => {
  beforeEach(resetMemory);

  it('true when live context holds a rolled game (TestFlight #9: back nav)', () => {
    const rolled = applyDiceRoll(createInitialState('vs-computer'), [3, 5]);
    expect(canContinueSavedGame(rolled)).toBe(true);
  });

  it('true when MMKV has save but context is null', () => {
    const saved = createInitialState('vs-computer');
    savePersistedSession({ state: saved, moveLog: [], replayBaseline: null });
    expect(canContinueSavedGame(null)).toBe(true);
  });
});

describe('saveActiveGame round-trip', () => {
  beforeEach(resetMemory);

  it('restores partial doubles turn after save and load (leave/resume)', () => {
    const points = createInitialPoints().map(() => ({ player: null as 'white' | 'black' | null, count: 0 }));
    points[24] = { player: 'white', count: 1 };
    points[23] = { player: 'white', count: 1 };
    points[22] = { player: 'white', count: 1 };
    points[6] = { player: 'white', count: 12 };
    points[1] = { player: 'black', count: 15 };

    let state: GameState = {
      ...createInitialState('vs-computer'),
      phase: 'moving',
      currentPlayer: 'white',
      dice: [1, 1],
      remainingDice: [1, 1, 1, 1],
      points,
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
    };

    for (let i = 0; i < 3; i++) {
      const move = findMoveSequence(state, 24 - i, 23 - i)!;
      state = applyMove(state, move[0]!);
    }

    saveActiveGame(state);
    const loaded = loadRestorableGame();
    expect(loaded?.remainingDice).toEqual([1]);
    expect(loaded?.currentPlayer).toBe('white');
    expect(loaded?.phase).toBe('moving');
  });
});

describe('persisted session migration', () => {
  beforeEach(resetMemory);

  it('migrates legacy three-key saves into a versioned session', () => {
    const state = createInitialState('vs-human');
    const { openingRolls: _ignored, ...legacyState } = state;
    memory[SESSION_STORAGE_KEYS.legacyState] = JSON.stringify(legacyState);
    memory[SESSION_STORAGE_KEYS.legacyMoveLog] = JSON.stringify([logEntry()]);
    memory[SESSION_STORAGE_KEYS.legacyBaseline] = JSON.stringify(state);

    const session = loadPersistedSession();
    expect(session?.version).toBe(1);
    expect(session?.state.openingRolls).toEqual({ white: null, black: null });
    expect(session?.state.mode).toBe('vs-human');
    expect(session?.moveLog).toHaveLength(1);
    expect(session?.replayBaseline?.mode).toBe('vs-human');
    expect(memory[SESSION_STORAGE_KEYS.legacyState]).toBeUndefined();
    expect(memory[SESSION_STORAGE_KEYS.session]).toBeDefined();
  });
});

describe('interrupted session write', () => {
  beforeEach(resetMemory);

  it('recovers a valid pending commit when the main slot is missing', () => {
    const session = makePersistedSession({
      state: createInitialState('vs-computer'),
      moveLog: [logEntry()],
      replayBaseline: createInitialState('vs-computer'),
    });
    memory[SESSION_STORAGE_KEYS.pending] = JSON.stringify(session);

    const loaded = loadPersistedSession();
    expect(loaded?.moveLog).toHaveLength(1);
    expect(JSON.parse(memory[SESSION_STORAGE_KEYS.session]!)).toMatchObject({ version: 1 });
    expect(memory[SESSION_STORAGE_KEYS.pending]).toBeUndefined();
  });
});

describe('invalid session shape', () => {
  beforeEach(resetMemory);

  it('quarantines structurally invalid JSON and does not resume', () => {
    memory[SESSION_STORAGE_KEYS.session] = JSON.stringify({
      version: 1,
      state: { phase: 'moving', mode: 'vs-computer' },
      moveLog: [],
      replayBaseline: null,
    });

    expect(loadPersistedGame()).toBeNull();
    expect(hasSavedGame()).toBe(false);
    expect(hasQuarantinedSession()).toBe(true);
    expect(loadQuarantinedSession()?.error).toBe('session shape is invalid');
    expect(memory[SESSION_STORAGE_KEYS.session]).toBeUndefined();

    discardQuarantinedSession();
    expect(hasQuarantinedSession()).toBe(false);
  });
});

describe('completed-game review persistence', () => {
  beforeEach(resetMemory);

  it('keeps move log and baseline after game-over until the slot is cleared', () => {
    const baseline = createInitialState('vs-computer');
    savePersistedSession({
      state: finishedGame(),
      moveLog: [logEntry()],
      replayBaseline: baseline,
    });

    expect(loadRestorableGame()).toBeNull();
    expect(loadPersistedGame()?.phase).toBe('game-over');
    expect(hasReviewableCompletedGame(null)).toBe(true);
    expect(loadMoveLog()).toHaveLength(1);
    expect(loadActiveGame()?.winner).toBe('white');

    clearActiveGame();
    expect(loadPersistedGame()).toBeNull();
    expect(loadMoveLog()).toEqual([]);
    expect(hasReviewableCompletedGame(null)).toBe(false);
  });
});
