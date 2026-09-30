import type { GameState, Player } from '@/lib/game/types';
import { opponent } from '@/lib/game';

export type StrategyKey
  = | 'running'
    | 'blitz'
    | 'priming'
    | 'holding'
    | 'backgame'
    | 'developing';

/**
 * Message under `game.strategy.why.` explaining why the position calls for this
 * strategy. Copy lives in the translation resources, not here, so it is
 * localizable like the rest of the game chrome.
 */
type StrategyReasonKey
  = | 'backgame'
    | 'blitz_bar'
    | 'blitz_bar_blot'
    | 'blitz_bar_blots'
    | 'blitz_blot'
    | 'blitz_blots'
    | 'developing'
    | 'holding'
    | 'priming'
    | 'priming_anchor'
    | 'running_lead'
    | 'running_race';

type StrategyReason = {
  message: StrategyReasonKey;
  /** Interpolation values for the message (pip counts, point numbers). */
  params: Record<string, number>;
};

export type StrategyInfo = {
  key: StrategyKey;
  reason: StrategyReason;
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
 * either side with an enemy checker 1-6 pips *behind* it — i.e. a checker
 * the enemy can still move onto the blot. Attackers ahead of the blot have
 * already raced past it and can never come back, so they don't count.
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
      // Attacker at p moving `forward` lands on p + forward*d; it threatens
      // the blot at b exactly when p = b - forward*d (behind the blot).
      if (attackers.has(blot - d * forward))
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
 * Whether no contact is possible for the rest of the game: every white
 * checker has already passed every black checker (white's highest point is
 * below black's lowest), so neither side can ever hit the other. White moves
 * 24 -> 1 and black moves 1 -> 24, so once all of white sits below all of
 * black they're racing away from each other. Bar checkers re-enter into
 * contact, so any checker on the bar disqualifies the race.
 */
function isPureRace(state: GameState): boolean {
  if (state.bar.white > 0 || state.bar.black > 0)
    return false;
  let whiteMax = -1;
  let blackMin = 25;
  for (let n = 1; n <= 24; n++) {
    const point = state.points[n];
    if (point.count === 0)
      continue;
    if (point.player === 'white')
      whiteMax = n;
    else if (point.player === 'black')
      blackMin = Math.min(blackMin, n);
  }
  // A side with no checkers on the board has nothing left to touch; leave
  // those (game-over or synthetic) positions to the cascade below.
  if (whiteMax < 0 || blackMin > 24)
    return false;
  return whiteMax < blackMin;
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
  const pipGap = Math.abs(myPips - foePips);
  const pureRace = isPureRace(state);

  let key: StrategyKey = 'developing';
  let reason: StrategyReason = { message: 'developing', params: {} };
  // No contact is possible, so no prime, blitz, backgame, or holding game can
  // mean anything: it's a straight race to bear off.
  if (pureRace) {
    key = 'running';
    reason = { message: 'running_race', params: { myPips, foePips } };
  }
  // Most committal first: a deep two-anchor back game overrides everything.
  else if (anchors.length >= 2 && deepAnchors.length >= 2 && pipDeficit > 0.08) {
    key = 'backgame';
    reason = {
      message: 'backgame',
      params: { point1: deepAnchors[0], point2: deepAnchors[1], pipGap },
    };
  }
  else if ((foeBlotsHome.length >= 2 || state.bar[foe] > 0) && homeMade.length >= 2) {
    key = 'blitz';
    // The bar count and the blot count are each optional, and the blot count
    // takes a singular form at one — four distinct messages rather than a
    // pre-joined English fragment.
    const barCount = state.bar[foe];
    const blotCount = foeBlotsHome.length;
    const message: StrategyReasonKey
      = barCount > 0
        ? blotCount === 0
          ? 'blitz_bar'
          : blotCount === 1
            ? 'blitz_bar_blot'
            : 'blitz_bar_blots'
        : blotCount === 1
          ? 'blitz_blot'
          : 'blitz_blots';
    reason = { message, params: { barCount, blotCount, homeMade: homeMade.length } };
  }
  else if (prime >= 4 || (prime >= 3 && anchors.length >= 1)) {
    key = 'priming';
    reason = {
      message: anchors.length >= 1 ? 'priming_anchor' : 'priming',
      params: { prime },
    };
  }
  else if (anchors.length >= 1 && pipDeficit > 0.03) {
    key = 'holding';
    reason = { message: 'holding', params: { point: anchors[0], pipGap } };
  }
  else if (pipLead >= 0.1 && !contactExposed(state, player)) {
    key = 'running';
    reason = { message: 'running_lead', params: { foePips, myPips } };
  }

  return { key, reason };
}
