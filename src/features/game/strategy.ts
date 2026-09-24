import type { GameState, Player } from '@/lib/game/types';
import { opponent } from '@/lib/game';

export type StrategyKey
  = | 'running'
    | 'blitz'
    | 'priming'
    | 'holding'
    | 'backgame'
    | 'developing';

export type StrategyInfo = {
  key: StrategyKey;
  /** Short label, e.g. "Running game". */
  label: string;
  /** One-line execution tip. */
  tip: string;
};

const STRATEGIES: Record<StrategyKey, { label: string; tip: string }> = {
  running: {
    label: 'Running game',
    tip: 'You lead the race — bring checkers home safely and avoid leaving blots.',
  },
  blitz: {
    label: 'Blitz',
    tip: 'Attack: hit every blot you can and close your home board.',
  },
  priming: {
    label: 'Priming game',
    tip: 'Extend your wall one point at a time and trap their back checkers.',
  },
  holding: {
    label: 'Holding game',
    tip: 'Hold your anchor, stay safe, and wait for your hitting chance.',
  },
  backgame: {
    label: 'Back game',
    tip: 'Stay back, keep your home board strong, and wait for a late shot.',
  },
  developing: {
    label: 'Developing',
    tip: 'Build points, fight for the 5-point, and stay flexible.',
  },
};

/**
 * Race pip count: total pips a player's checkers must travel to bear off.
 * Lower is ahead. Bar checkers count 25 (re-enter, then travel the full
 * board); borne-off checkers count 0.
 */
export function pipCount(state: GameState, player: Player): number {
  let pips = 0;
  for (let n = 1; n <= 24; n++) {
    const point = state.points[n];
    if (point.player !== player)
      continue;
    // White travels 24 -> 1 (point n is n pips out); black travels 1 -> 24.
    const distance = player === 'white' ? n : 25 - n;
    pips += point.count * distance;
  }
  pips += state.bar[player] * 25;
  return pips;
}

/** Points (1-24) where `player` has a made point (2+ checkers). */
function madePoints(state: GameState, player: Player): number[] {
  const made: number[] = [];
  for (let n = 1; n <= 24; n++) {
    const point = state.points[n];
    if (point.player === player && point.count >= 2)
      made.push(n);
  }
  return made;
}

/** Points (1-24) where `player` has a lone blot. */
function blots(state: GameState, player: Player): number[] {
  const found: number[] = [];
  for (let n = 1; n <= 24; n++) {
    const point = state.points[n];
    if (point.player === player && point.count === 1)
      found.push(n);
  }
  return found;
}

/** Opponent's home board from `player`'s perspective (white: 19-24). */
function oppHomeRange(player: Player): [number, number] {
  return player === 'white' ? [19, 24] : [1, 6];
}

/** Player's own home board (white: 1-6). */
function ownHomeRange(player: Player): [number, number] {
  return player === 'white' ? [1, 6] : [19, 24];
}

function inRange(n: number, [lo, hi]: [number, number]): boolean {
  return n >= lo && n <= hi;
}

/** Longest run of consecutive made points. */
function longestPrime(made: number[]): number {
  let best = 0;
  let run = 0;
  let prev = -10;
  for (const n of made) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  return best;
}

/**
 * Whether `player` has an exposed blot the opponent can reach: a blot of
 * either side within 1-6 pips of an enemy checker (a direct shot).
 */
function contactExposed(state: GameState, player: Player): boolean {
  const foe = opponent(player);
  const myBlots = blots(state, player);
  const foeBlots = blots(state, foe);
  const myCheckers = new Set<number>();
  const foeCheckers = new Set<number>();
  for (let n = 1; n <= 24; n++) {
    const point = state.points[n];
    if (point.player === player && point.count > 0)
      myCheckers.add(n);
    if (point.player === foe && point.count > 0)
      foeCheckers.add(n);
  }
  const inShot = (blot: number, attackers: Set<number>, forward: 1 | -1): boolean => {
    for (let d = 1; d <= 6; d++) {
      if (attackers.has(blot + d * forward))
        return true;
    }
    return false;
  };
  // White attacks toward decreasing n; black toward increasing n.
  const foeForward = foe === 'white' ? -1 : 1;
  const myForward = player === 'white' ? -1 : 1;
  return (
    myBlots.some(b => inShot(b, foeCheckers, foeForward))
    || foeBlots.some(b => inShot(b, myCheckers, myForward))
    || state.bar[player] > 0
    || state.bar[foe] > 0
  );
}

/**
 * Which of backgammon's five core strategies the position points to for
 * `player`, per backgammon.com's "5 Core Strategies". Falls back to
 * "Developing" for early/neutral positions — most games start there.
 */
export function classifyStrategy(state: GameState, player: Player): StrategyInfo {
  const foe = opponent(player);
  const myPips = pipCount(state, player);
  const foePips = pipCount(state, foe);
  const made = madePoints(state, player);
  const [oppLo, oppHi] = oppHomeRange(player);
  const [homeLo, homeHi] = ownHomeRange(player);

  const anchors = made.filter(n => inRange(n, [oppLo, oppHi]));
  const deepAnchors = made.filter(n =>
    player === 'white' ? n >= 22 : n <= 3,
  );
  const homeMade = made.filter(n => inRange(n, [homeLo, homeHi]));
  const foeBlotsHome = blots(state, foe).filter(n => inRange(n, [homeLo, homeHi]));
  const prime = longestPrime(made);

  const pipLead = foePips > 0 ? (foePips - myPips) / foePips : 0;
  const pipDeficit = myPips > 0 ? (myPips - foePips) / myPips : 0;

  let key: StrategyKey = 'developing';
  // Most committal first: a deep two-anchor back game overrides everything.
  if (anchors.length >= 2 && deepAnchors.length >= 2 && pipDeficit > 0.08) {
    key = 'backgame';
  }
  else if ((foeBlotsHome.length >= 2 || state.bar[foe] > 0) && homeMade.length >= 2) {
    key = 'blitz';
  }
  else if (prime >= 4 || (prime >= 3 && anchors.length >= 1)) {
    key = 'priming';
  }
  else if (anchors.length >= 1 && pipDeficit > 0.03) {
    key = 'holding';
  }
  else if (pipLead >= 0.1 && !contactExposed(state, player)) {
    key = 'running';
  }

  return { key, ...STRATEGIES[key] };
}
