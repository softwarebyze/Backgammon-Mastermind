import type { GameState, Player } from '@/lib/game/types';

/**
 * Provider-level sweep: drives useGameProviderValue the same way the UI does
 * (auto-move timers + animation watchdogs) across bear-off / bar / forced
 * positions for both colours and auto-move on/off.
 */
import { act, renderHook } from '@testing-library/react-native';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { TOTAL_CHECKERS } from '@/lib/game/constants';
import { createPositionState } from '@/lib/game/create-position';
import { getLegalMoves, hasAnyLegalMove } from '@/lib/game/moves';
import { loadPersistedGame } from '@/lib/game/persistence';

import { getForcedLegalMove, getForcedTurnSequence } from '@/lib/game/single-move';

jest.mock('posthog-react-native', () => ({ usePostHog: () => ({ capture: jest.fn() }) }));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({ useGamePreferences: jest.fn() }));
jest.mock('@/lib/game-sfx/play-game-sfx', () => ({ playGameSfx: jest.fn(), playGameSfxSequence: jest.fn() }));
jest.mock('@/lib/game/persistence', () => ({
  ...jest.requireActual('@/lib/game/persistence'),
  loadPersistedGame: jest.fn(),
  saveActiveGame: jest.fn(),
}));

const ORDERED_ROLLS: Array<[number, number]> = [];
for (let a = 1; a <= 6; a++) {
  for (let b = a; b <= 6; b++) {
    ORDERED_ROLLS.push([a, b]);
    if (a !== b) {
      ORDERED_ROLLS.push([b, a]);
    }
  }
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

function mockPrefs(overrides: Partial<typeof DEFAULT_GAME_PREFERENCES> = {}) {
  jest.mocked(useGamePreferences).mockReturnValue({
    preferences: {
      ...DEFAULT_GAME_PREFERENCES,
      autoMoveWhenForced: true,
      autoRoll: false,
      tutorMode: false,
      ...overrides,
    },
  } as ReturnType<typeof useGamePreferences>);
}

/** Advance past auto-move delay (300) and animation watchdog (360+160) several times. */
function flushAutomation(steps = 24) {
  for (let i = 0; i < steps; i++) {
    act(() => {
      jest.advanceTimersByTime(400);
    });
  }
}

function playOut(state: GameState, prefs?: Partial<typeof DEFAULT_GAME_PREFERENCES>) {
  mockPrefs(prefs);
  jest.mocked(loadPersistedGame).mockReturnValue(state);
  const { result } = renderHook(() => useGameProviderValue(true));
  flushAutomation();
  return result.current;
}

function assertNotStuck(game: ReturnType<typeof playOut>, label: string) {
  const s = game.state;
  expect(s).not.toBeNull();
  if (!s) {
    return;
  }
  if (s.phase === 'moving' && s.remainingDice.length > 0 && !hasAnyLegalMove(s)) {
    throw new Error(`STUCK ${label}: moving, dice=${s.remainingDice}, no legal moves`);
  }
  if (s.borneOff.white === TOTAL_CHECKERS || s.borneOff.black === TOTAL_CHECKERS) {
    expect(s.phase).toBe('game-over');
    expect(s.winner).not.toBeNull();
  }
  // Forced position with auto-move on must not sit idle in moving.
  if (
    s.phase === 'moving'
    && (getForcedLegalMove(s) || getForcedTurnSequence(s))
  ) {
    // Auto-move should have fired; if still forced after flush, something blocked it.
    throw new Error(`STILL FORCED after auto-move flush: ${label} rem=${s.remainingDice}`);
  }
  expect(game.isAnimating).toBe(false);
}

// eslint-disable-next-line max-lines-per-function -- provider sweep matrix
describe('provider bear-off / auto-move sweep', () => {
  const counts = { cases: 0, won: 0, choice: 0, noMove: 0 };

  afterAll(() => {
    console.log(
      `[provider-sweep] cases=${counts.cases} won=${counts.won} choice=${counts.choice} noMove=${counts.noMove}`,
    );
  });

  function tally(s: GameState | null) {
    counts.cases++;
    if (s?.winner) {
      counts.won++;
    }
    else if (s?.phase === 'moving') {
      counts.choice++;
    }
    else if (s?.phase === 'no-move') {
      counts.noMove++;
    }
  }

  describe('lone checker on the 1-point (white) / 24-point (black)', () => {
    it.each(ORDERED_ROLLS)('white auto-move bears off on %i-%i', (a, b) => {
      const game = playOut(createPositionState({
        placements: [
          { point: 1, player: 'white', count: 1 },
          { point: 24, player: 'black', count: 15 },
        ],
        borneOff: { white: 14, black: 0 },
        dice: [a, b],
        mode: 'vs-computer',
      }));
      assertNotStuck(game, `white ${a}-${b}`);
      expect(game.state?.winner).toBe('white');
      tally(game.state);
    });

    it.each(ORDERED_ROLLS)('black (pass-and-play) auto-move bears off on %i-%i', (a, b) => {
      const game = playOut(createPositionState({
        placements: [
          { point: 24, player: 'black', count: 1 },
          { point: 1, player: 'white', count: 15 },
        ],
        borneOff: { white: 0, black: 14 },
        dice: [a, b],
        currentPlayer: 'black',
        mode: 'vs-human',
      }));
      assertNotStuck(game, `black ${a}-${b}`);
      expect(game.state?.winner).toBe('black');
      tally(game.state);
    });
  });

  describe('two-checker forced sequences', () => {
    it.each([[6, 5], [5, 6], [6, 4], [3, 2], [6, 6], [5, 5]] as Array<[number, number]>)(
      'white 1+2 bears off both on %i-%i when forced',
      (a, b) => {
        const game = playOut(createPositionState({
          placements: [
            { point: 1, player: 'white', count: 1 },
            { point: 2, player: 'white', count: 1 },
            { point: 24, player: 'black', count: 15 },
          ],
          borneOff: { white: 13, black: 0 },
          dice: [a, b],
          mode: 'vs-computer',
        }));
        assertNotStuck(game, `1+2 ${a}-${b}`);
        expect(game.state?.winner).toBe('white');
        tally(game.state);
      },
    );

    it('leaves 1+2 with 2-1 as a manual choice (bearing both vs 2→1)', () => {
      const start = createPositionState({
        placements: [
          { point: 1, player: 'white', count: 1 },
          { point: 2, player: 'white', count: 1 },
          { point: 24, player: 'black', count: 15 },
        ],
        borneOff: { white: 13, black: 0 },
        dice: [2, 1],
        mode: 'vs-computer',
      });
      expect(getForcedLegalMove(start)).toBeNull();
      expect(getForcedTurnSequence(start)).toBeNull();
      const game = playOut(start);
      expect(game.state?.phase).toBe('moving');
      expect(game.state?.winner).toBeNull();
      tally(game.state);
    });
  });

  describe('real choice stays manual', () => {
    it('does not auto-play when two distinct outcomes exist', () => {
      const game = playOut(createPositionState({
        placements: [
          { point: 1, player: 'white', count: 1 },
          { point: 6, player: 'white', count: 1 },
          { point: 24, player: 'black', count: 15 },
        ],
        borneOff: { white: 13, black: 0 },
        dice: [6, 5],
        mode: 'vs-computer',
      }));
      expect(game.state?.phase).toBe('moving');
      expect(game.state?.winner).toBeNull();
      expect(getLegalMoves(game.state!).length).toBeGreaterThan(1);
      tally(game.state);
    });
  });

  describe('auto-move off', () => {
    it('leaves a forced win position for the player to play', () => {
      const game = playOut(
        createPositionState({
          placements: [
            { point: 1, player: 'white', count: 1 },
            { point: 24, player: 'black', count: 15 },
          ],
          borneOff: { white: 14, black: 0 },
          dice: [6, 5],
          mode: 'vs-computer',
        }),
        { autoMoveWhenForced: false },
      );
      expect(game.state?.phase).toBe('moving');
      expect(game.state?.winner).toBeNull();
      expect(getForcedLegalMove(game.state!)).not.toBeNull();
      tally(game.state);
    });
  });

  describe('bar entry forced moves', () => {
    const barRolls: Array<[number, number]> = [[1, 2], [2, 1], [6, 5], [5, 6], [3, 3], [1, 1], [6, 6], [4, 2]];

    it.each(barRolls)('white on bar + home checker, roll %i-%i, never sticks', (a, b) => {
      const game = playOut(createPositionState({
        placements: [
          { point: 1, player: 'white', count: 1 },
          { point: 13, player: 'black', count: 15 },
        ],
        bar: { white: 1 },
        borneOff: { white: 13, black: 0 },
        dice: [a, b],
        mode: 'vs-computer',
      }));
      assertNotStuck(game, `bar ${a}-${b}`);
      // Cannot win this turn (entered checker is outside home).
      expect(game.state?.winner).not.toBe('white');
      tally(game.state);
    });

    it.each(barRolls)('white on bar with entry points blocked, roll %i-%i', (a, b) => {
      const game = playOut(createPositionState({
        placements: [
          { point: 1, player: 'white', count: 1 },
          // Close 24,22,20 (dice 1,3,5 entry)
          { point: 24, player: 'black', count: 2 },
          { point: 22, player: 'black', count: 2 },
          { point: 20, player: 'black', count: 2 },
          { point: 13, player: 'black', count: 9 },
        ],
        bar: { white: 1 },
        borneOff: { white: 13, black: 0 },
        dice: [a, b],
        mode: 'vs-computer',
      }));
      assertNotStuck(game, `bar-blocked ${a}-${b}`);
      tally(game.state);
    });
  });

  describe('higher-die only one die playable', () => {
    it('bears off with the higher die when the lower is stranded', () => {
      // Lone on 1, but we need a case where only higher applies — already covered
      // by lone-1. Add: checker on 6, opponent blocks so 5 doesn't continue.
      const game = playOut(createPositionState({
        placements: [
          { point: 6, player: 'white', count: 1 },
          { point: 1, player: 'black', count: 2 },
          { point: 2, player: 'black', count: 2 },
          { point: 3, player: 'black', count: 2 },
          { point: 4, player: 'black', count: 2 },
          { point: 5, player: 'black', count: 2 },
          { point: 24, player: 'black', count: 5 },
        ],
        borneOff: { white: 14, black: 0 },
        dice: [6, 5],
        mode: 'vs-computer',
      }));
      assertNotStuck(game, 'higher-die-6');
      // Bearing 6 from 6 wins; 5 cannot be used after.
      expect(game.state?.winner).toBe('white');
      tally(game.state);
    });
  });

  describe('computer black bears off last checker', () => {
    it.each([[6, 5], [1, 2], [6, 6], [3, 3]] as Array<[number, number]>)(
      'aI finishes the game on %i-%i',
      (a, b) => {
        mockPrefs({ autoMoveWhenForced: true, autoRoll: false });
        const state = createPositionState({
          placements: [
            { point: 24, player: 'black', count: 1 },
            { point: 1, player: 'white', count: 15 },
          ],
          borneOff: { white: 0, black: 14 },
          dice: [a, b],
          currentPlayer: 'black',
          mode: 'vs-computer',
        });
        jest.mocked(loadPersistedGame).mockReturnValue(state);
        const { result } = renderHook(() => useGameProviderValue(true));
        // Computer think + move + animation watchdog
        flushAutomation(40);
        expect(result.current.state?.winner).toBe('black');
        expect(result.current.state?.phase).toBe('game-over');
        expect(result.current.isAnimating).toBe(false);
        tally(result.current.state);
      },
    );
  });

  describe('4–5 checker samples', () => {
    const samples: Array<{ player: Player; counts: Partial<Record<number, number>> }> = [
      { player: 'white', counts: { 1: 4 } },
      { player: 'white', counts: { 6: 4 } },
      { player: 'white', counts: { 1: 2, 2: 2 } },
      { player: 'white', counts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } },
      { player: 'black', counts: { 24: 4 } },
      { player: 'black', counts: { 19: 3, 20: 2 } },
    ];

    it('auto-moves forced stacks without sticking across samples', () => {
      const failures: string[] = [];
      for (const sample of samples) {
        for (const dice of [[6, 5], [1, 2], [6, 6], [4, 3], [2, 2]] as Array<[number, number]>) {
          const placements = Object.entries(sample.counts).map(([point, count]) => ({
            point: Number(point),
            player: sample.player,
            count: count!,
          }));
          const onBoard = placements.reduce((s, p) => s + p.count, 0);
          const opp: Player = sample.player === 'white' ? 'black' : 'white';
          const oppPoint = sample.player === 'white' ? 24 : 1;
          placements.push({ point: oppPoint, player: opp, count: 15 });
          try {
            const game = playOut(createPositionState({
              placements,
              borneOff: { [sample.player]: TOTAL_CHECKERS - onBoard, [opp]: 0 },
              dice,
              currentPlayer: sample.player,
              mode: 'vs-human',
            }));
            assertNotStuck(game, `${sample.player} ${JSON.stringify(sample.counts)} ${dice}`);
            tally(game.state);
          }
          catch (err) {
            failures.push(`${sample.player} ${dice}: ${(err as Error).message}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });
  });
});
