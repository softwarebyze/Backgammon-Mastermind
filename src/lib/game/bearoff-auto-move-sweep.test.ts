/**
 * Exhaustive bear-off / auto-move / forced-move sweep.
 *
 * Drives the same pure helpers the UI uses (getForcedLegalMove,
 * getForcedTurnSequence, applyMove, applyMoveSequence, getLegalMoves) and
 * asserts the game never stalls mid-turn and always reaches game-over when
 * every checker is borne off.
 */
import type { GameState, Player } from './types';

import { TOTAL_CHECKERS } from './constants';
import { createPositionState } from './create-position';
import {
  applyMove,
  applyMoveSequence,
  getLegalMoves,
  hasAnyLegalMove,
} from './moves';
import { getForcedLegalMove, getForcedTurnSequence } from './single-move';

/** All 21 unordered dice pairs, plus both orders for mixed dice. */
const DISTINCT_ROLLS: Array<[number, number]> = (() => {
  const rolls: Array<[number, number]> = [];
  for (let a = 1; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      rolls.push([a, b]);
      if (a !== b) {
        rolls.push([b, a]);
      }
    }
  }
  return rolls;
})();

/** Integer compositions of `n` checkers onto home points (length 6). */
function* compositions(n: number, slots: number): Generator<number[]> {
  if (slots === 1) {
    yield [n];
    return;
  }
  for (let i = 0; i <= n; i++) {
    for (const rest of compositions(n - i, slots - 1)) {
      yield [i, ...rest];
    }
  }
}

function homePoints(player: Player): number[] {
  return player === 'white' ? [1, 2, 3, 4, 5, 6] : [24, 23, 22, 21, 20, 19];
}

function assertInvariants(state: GameState, label: string) {
  if (state.winner) {
    expect(state.phase).toBe('game-over');
    expect(state.borneOff[state.winner]).toBe(TOTAL_CHECKERS);
    return;
  }
  if (state.phase === 'moving') {
    // Stuck: still moving, dice left, but nothing legal.
    if (state.remainingDice.length > 0 && !hasAnyLegalMove(state)) {
      throw new Error(`STUCK moving with no legal moves: ${label}`);
    }
    // Dice spent but turn never handed off (confirm-move is off on main).
    if (state.remainingDice.length === 0) {
      throw new Error(`STUCK moving with empty dice: ${label}`);
    }
  }
  if (
    state.borneOff.white === TOTAL_CHECKERS
    || state.borneOff.black === TOTAL_CHECKERS
  ) {
    throw new Error(`All checkers off but no winner: ${label}`);
  }
}

/**
 * Apply forced auto-moves the same way useGameplayHelpers does: prefer a
 * full-turn forced sequence, else a single forced first move, looping until
 * the turn is no longer forced (or the game ends).
 */
function playForcedAutoMoves(start: GameState, maxSteps = 16): GameState {
  let state = start;
  for (let i = 0; i < maxSteps; i++) {
    if (state.phase !== 'moving' || state.winner) {
      return state;
    }
    const sequence = getForcedTurnSequence(state);
    if (sequence) {
      state = applyMoveSequence(state, sequence);
      continue;
    }
    const move = getForcedLegalMove(state);
    if (!move) {
      return state;
    }
    state = applyMove(state, move);
  }
  throw new Error('auto-move loop exceeded max steps');
}

/**
 * Exhaust every legal play line (BFS) and assert invariants at every node.
 * Returns whether any terminal line wins for the current player.
 */
function exploreAllLines(start: GameState, label: string, maxNodes = 400): {
  nodes: number;
  wins: number;
  terminals: number;
} {
  type Node = { state: GameState };
  const queue: Node[] = [{ state: start }];
  let nodes = 0;
  let wins = 0;
  let terminals = 0;
  const seen = new Set<string>();

  while (queue.length > 0) {
    const { state } = queue.shift()!;
    nodes++;
    if (nodes > maxNodes) {
      throw new Error(`BFS blew maxNodes for ${label}`);
    }
    assertInvariants(state, `${label} @node${nodes}`);

    if (state.winner) {
      wins++;
      terminals++;
      continue;
    }
    if (state.phase !== 'moving') {
      terminals++;
      continue;
    }

    const legal = getLegalMoves(state);
    if (legal.length === 0) {
      // Should have been no-move via applyMove / applyDiceRoll.
      throw new Error(`moving with empty legal list: ${label}`);
    }

    for (const move of legal) {
      const next = applyMove(state, move);
      const key = [
        next.phase,
        next.winner ?? '-',
        next.remainingDice.join(','),
        next.borneOff.white,
        next.borneOff.black,
        next.bar.white,
        next.bar.black,
        next.points.map((p, i) => (p.count ? `${i}${p.player?.[0]}${p.count}` : '')).filter(Boolean).join('|'),
      ].join(';');
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      queue.push({ state: next });
    }
  }

  return { nodes, wins, terminals };
}

type CaseResult = {
  label: string;
  forced: boolean;
  won: boolean;
  phase: string;
};

function buildHomePlacements(
  player: Player,
  counts: number[],
): { point: number; player: Player; count: number }[] {
  const points = homePoints(player);
  const placements: { point: number; player: Player; count: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const count = counts[i]!;
    if (count > 0) {
      placements.push({ point: points[i]!, player, count });
    }
  }
  return placements;
}

function runCase(opts: {
  player: Player;
  counts: number[];
  dice: [number, number];
  bar?: number;
  /** Opponent points closed in the player's home (blocks landing/entry). */
  blockedHome?: number[];
  /** Opponent points closed on the player's entry board (blocks bar entry). */
  blockedEntry?: number[];
  /** Extra opponent checkers on high points (outside home) for clutter. */
  extraOpp?: { point: number; count: number }[];
}): CaseResult {
  const player = opts.player;
  const opp: Player = player === 'white' ? 'black' : 'white';
  const onBoard = opts.counts.reduce((a, b) => a + b, 0);
  const onBar = opts.bar ?? 0;
  const borneOff = TOTAL_CHECKERS - onBoard - onBar;
  if (borneOff < 0) {
    throw new Error('too many checkers');
  }

  const placements = buildHomePlacements(player, opts.counts);

  // Keep opponent from having already won; park remaining opp checkers.
  let oppPlaced = 0;
  for (const pt of opts.blockedHome ?? []) {
    placements.push({ point: pt, player: opp, count: 2 });
    oppPlaced += 2;
  }
  for (const pt of opts.blockedEntry ?? []) {
    placements.push({ point: pt, player: opp, count: 2 });
    oppPlaced += 2;
  }
  for (const extra of opts.extraOpp ?? []) {
    placements.push({ point: extra.point, player: opp, count: extra.count });
    oppPlaced += extra.count;
  }
  // Dump the rest of opponent's checkers far away so they don't win.
  const oppDump = player === 'white' ? 24 : 1;
  const oppRemaining = Math.max(0, TOTAL_CHECKERS - oppPlaced);
  if (oppRemaining > 0) {
    const existing = placements.find(p => p.point === oppDump && p.player === opp);
    if (existing) {
      existing.count += oppRemaining;
    }
    else {
      placements.push({ point: oppDump, player: opp, count: oppRemaining });
    }
  }

  const label = [
    player,
    `c[${opts.counts.join(',')}]`,
    onBar ? `bar${onBar}` : 'nobar',
    `d${opts.dice[0]}-${opts.dice[1]}`,
    opts.blockedHome?.length ? `bh${opts.blockedHome.join('.')}` : '',
    opts.blockedEntry?.length ? `be${opts.blockedEntry.join('.')}` : '',
  ].filter(Boolean).join(' ');

  const state = createPositionState({
    placements,
    bar: { [player]: onBar },
    borneOff: { [player]: borneOff, [opp]: 0 },
    dice: opts.dice,
    currentPlayer: player,
    mode: 'vs-human',
  });

  assertInvariants(state, `${label} (start)`);
  exploreAllLines(state, label);

  const after = playForcedAutoMoves(state);
  assertInvariants(after, `${label} (after auto)`);

  const wasForced
    = getForcedLegalMove(state) !== null
      || getForcedTurnSequence(state) !== null;

  // If every checker is gone after forced play, must have won.
  if (
    after.borneOff[player] === TOTAL_CHECKERS
    || (after.points.every(p => p.player !== player || p.count === 0)
      && after.bar[player] === 0)
  ) {
    expect(after.winner).toBe(player);
    expect(after.phase).toBe('game-over');
  }

  return {
    label,
    forced: wasForced,
    won: after.winner === player,
    phase: after.phase,
  };
}

/* Exhaustive matrix — keep one suite so afterAll can print totals. */
// eslint-disable-next-line max-lines-per-function -- sweep matrix
describe('exhaustive bear-off / forced auto-move sweep', () => {
  const summary = {
    cases: 0,
    forced: 0,
    won: 0,
    choiceLeft: 0,
    noMove: 0,
    passedRolling: 0,
  };

  afterAll(() => {
    console.log(
      `[bearoff-sweep] cases=${summary.cases} forced=${summary.forced} `
      + `won=${summary.won} choiceLeft=${summary.choiceLeft} `
      + `noMove=${summary.noMove} otherPhase=${summary.passedRolling}`,
    );
  });

  function record(result: CaseResult) {
    summary.cases++;
    if (result.forced) {
      summary.forced++;
    }
    if (result.won) {
      summary.won++;
    }
    if (result.phase === 'moving') {
      summary.choiceLeft++;
    }
    else if (result.phase === 'no-move') {
      summary.noMove++;
    }
    else if (result.phase !== 'game-over') {
      summary.passedRolling++;
    }
  }

  describe.each(['white', 'black'] as Player[])('%s home-board 1–3 checkers', (player) => {
    it('sweeps every distribution × every ordered roll', () => {
      const failures: string[] = [];
      for (let n = 1; n <= 3; n++) {
        for (const counts of compositions(n, 6)) {
          if (counts.every(c => c === 0)) {
            continue;
          }
          for (const dice of DISTINCT_ROLLS) {
            try {
              record(runCase({ player, counts, dice }));
            }
            catch (err) {
              failures.push(`${player} n=${n} [${counts}] ${dice}: ${(err as Error).message}`);
            }
          }
        }
      }
      expect(failures).toEqual([]);
    });
  });

  describe.each(['white', 'black'] as Player[])('%s 4–5 checker sample incl. high points', (player) => {
    it('covers stacked and high-point cases', () => {
      const failures: string[] = [];
      const samples: number[][] = [
        [4, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 4],
        [2, 2, 0, 0, 0, 0],
        [1, 1, 1, 1, 0, 0],
        [5, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 2, 3],
        [3, 0, 0, 0, 0, 2],
      ];
      // Also put a checker outside home (high point) with rest in home —
      // cannot bear off until that checker comes home.
      const highPoint = player === 'white' ? 8 : 17;
      for (const counts of samples) {
        for (const dice of DISTINCT_ROLLS) {
          try {
            record(runCase({ player, counts, dice }));
          }
          catch (err) {
            failures.push(`sample [${counts}] ${dice}: ${(err as Error).message}`);
          }
        }
      }
      // High-point + home: 1 outside + 2 in home.
      for (const dice of DISTINCT_ROLLS) {
        try {
          const onBoard = 3;
          const borneOff = TOTAL_CHECKERS - onBoard;
          const placements = [
            ...buildHomePlacements(player, [1, 1, 0, 0, 0, 0]),
            { point: highPoint, player, count: 1 },
            { point: player === 'white' ? 24 : 1, player: (player === 'white' ? 'black' : 'white') as Player, count: 15 },
          ];
          const state = createPositionState({
            placements,
            borneOff: { [player]: borneOff },
            dice,
            currentPlayer: player,
            mode: 'vs-human',
          });
          assertInvariants(state, 'high');
          exploreAllLines(state, `high ${player} ${dice}`);
          const after = playForcedAutoMoves(state);
          assertInvariants(after, 'high-after');
          record({
            label: `high ${dice}`,
            forced: getForcedLegalMove(state) !== null || getForcedTurnSequence(state) !== null,
            won: after.winner === player,
            phase: after.phase,
          });
        }
        catch (err) {
          failures.push(`high ${dice}: ${(err as Error).message}`);
        }
      }
      expect(failures).toEqual([]);
    });
  });

  describe.each(['white', 'black'] as Player[])('%s bar-entry variants', (player) => {
    it('forces bar entry then continues; never sticks', () => {
      const failures: string[] = [];
      // 1 on bar + 0–2 in home (cannot bear off until the entered checker
      // journeys home — still must not stick).
      const homeSamples = [
        [0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 1],
      ];
      const entryBoard = player === 'white'
        ? [24, 23, 22, 21, 20, 19]
        : [1, 2, 3, 4, 5, 6];

      for (const counts of homeSamples) {
        for (const dice of DISTINCT_ROLLS) {
          try {
            record(runCase({ player, counts, dice, bar: 1 }));
          }
          catch (err) {
            failures.push(`bar [${counts}] ${dice}: ${(err as Error).message}`);
          }
          // Block some entry points (closed by opponent).
          try {
            record(runCase({
              player,
              counts,
              dice,
              bar: 1,
              blockedEntry: [entryBoard[0]!, entryBoard[2]!, entryBoard[4]!],
            }));
          }
          catch (err) {
            failures.push(`bar-blocked [${counts}] ${dice}: ${(err as Error).message}`);
          }
        }
      }

      // Two on the bar (doubles-heavy path).
      for (const dice of DISTINCT_ROLLS.filter(d => d[0] === d[1] || d[0] + d[1] <= 7)) {
        try {
          record(runCase({
            player,
            counts: [0, 0, 0, 0, 0, 0],
            dice,
            bar: 2,
          }));
        }
        catch (err) {
          failures.push(`bar2 ${dice}: ${(err as Error).message}`);
        }
      }
      expect(failures).toEqual([]);
    });
  });

  describe.each(['white', 'black'] as Player[])('%s opponent blocks in home (higher-die / single-die)', (player) => {
    it('covers blocked home points that leave only one die playable', () => {
      const failures: string[] = [];
      const home = homePoints(player);
      // Close points 2,3,4,5 — leave 1 and 6 open-ish via opponent primes.
      const blocked = [home[1]!, home[2]!, home[3]!, home[4]!];
      for (const counts of [[1, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 1], [2, 0, 0, 0, 0, 1]]) {
        for (const dice of DISTINCT_ROLLS) {
          try {
            record(runCase({ player, counts, dice, blockedHome: blocked }));
          }
          catch (err) {
            failures.push(`blocked [${counts}] ${dice}: ${(err as Error).message}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });
  });

  it('auto-move off: forced positions stay put until manually applied', () => {
    // Pure logic: when we do NOT call playForcedAutoMoves, a forced win
    // position remains in moving with a forced move available.
    const state = createPositionState({
      placements: [
        { point: 1, player: 'white', count: 1 },
        { point: 24, player: 'black', count: 15 },
      ],
      borneOff: { white: 14, black: 0 },
      dice: [6, 5],
      currentPlayer: 'white',
      mode: 'vs-computer',
    });
    expect(getForcedLegalMove(state)).not.toBeNull();
    expect(state.phase).toBe('moving');
    expect(state.winner).toBeNull();
    // Manual apply still wins.
    const move = getForcedLegalMove(state)!;
    const after = applyMove(state, move);
    expect(after.winner).toBe('white');
    expect(after.phase).toBe('game-over');
  });

  it('applies a forced multi-step bear-off sequence without sticking', () => {
    const state = createPositionState({
      placements: [
        { point: 1, player: 'white', count: 1 },
        { point: 2, player: 'white', count: 1 },
        { point: 24, player: 'black', count: 15 },
      ],
      borneOff: { white: 13, black: 0 },
      dice: [6, 5],
      currentPlayer: 'white',
      mode: 'vs-human',
    });
    const seq = getForcedTurnSequence(state);
    expect(seq).not.toBeNull();
    expect(seq!.length).toBeGreaterThan(1);
    const after = applyMoveSequence(state, seq!);
    expect(after.winner).toBe('white');
    expect(after.phase).toBe('game-over');
  });
});
