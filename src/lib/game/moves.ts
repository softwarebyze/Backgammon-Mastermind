import type { GameState, Move, Player } from './types';
import { BAR_POINT, BEAR_OFF, TOTAL_CHECKERS } from './constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function opponent(player: Player): Player {
  return player === 'white' ? 'black' : 'white';
}

/** White moves toward lower indices (-1), Black toward higher (+1). */
export function playerDirection(player: Player): number {
  return player === 'white' ? -1 : 1;
}

/** Home board: points 1-6 for White, points 19-24 for Black. */
export function isInHomeBoard(player: Player, point: number): boolean {
  return player === 'white'
    ? point >= 1 && point <= 6
    : point >= 19 && point <= 24;
}

/** True when all of this player's checkers (including bar) are inside their home board. */
export function allCheckersInHome(state: GameState, player: Player): boolean {
  if (state.bar[player] > 0)
    return false;
  for (let p = 1; p <= 24; p++) {
    if (
      !isInHomeBoard(player, p)
      && state.points[p].player === player
      && state.points[p].count > 0
    ) {
      return false;
    }
  }
  return true;
}

/** Whether a player's checker can land on a given point. */
export function canLandOn(state: GameState, player: Player, point: number): boolean {
  if (point < 1 || point > 24)
    return false;
  const pt = state.points[point];
  if (pt.count === 0 || pt.player === null)
    return true;
  if (pt.player === player)
    return true;
  return pt.count === 1; // blot – can hit
}

/**
 * For bearing off with a die larger than the point number requires:
 * the checker must be on the "highest" (furthest from exit) occupied home point.
 * White: "highest" = highest numbered point in 1-6 (exit is below 1).
 * Black: "lowest" = lowest numbered point in 19-24 (exit is above 24).
 */
function canUseLargerDieToBearOff(state: GameState, player: Player, fromPoint: number): boolean {
  if (player === 'white') {
    for (let p = fromPoint + 1; p <= 6; p++) {
      if (state.points[p].player === 'white' && state.points[p].count > 0)
        return false;
    }
    return true;
  }
  else {
    for (let p = 19; p < fromPoint; p++) {
      if (state.points[p].player === 'black' && state.points[p].count > 0)
        return false;
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Legal move generation
// ---------------------------------------------------------------------------

/**
 * Returns all legal moves for the current player in the given state.
 * Duplicates caused by equal die values are eliminated.
 */
export function getLegalMoves(state: GameState): Move[] {
  const { remainingDice, currentPlayer: player, bar } = state;
  if (remainingDice.length === 0)
    return [];

  // Deduplicate die values so identical dice don't produce duplicate moves.
  const uniqueDice: Array<{ value: number; index: number }> = [];
  const seen = new Set<number>();
  for (let i = 0; i < remainingDice.length; i++) {
    const v = remainingDice[i];
    if (!seen.has(v)) {
      seen.add(v);
      uniqueDice.push({ value: v, index: i });
    }
  }

  const moves: Move[] = [];

  // ── Bar: must enter before any other move ──────────────────────────────────
  if (bar[player] > 0) {
    for (const { value: die, index: dieIndex } of uniqueDice) {
      const to = player === 'white' ? 25 - die : die;
      if (canLandOn(state, player, to)) {
        moves.push({ from: BAR_POINT, to, dieIndex });
      }
    }
    return moves;
  }

  // ── Normal board moves ─────────────────────────────────────────────────────
  const inHome = allCheckersInHome(state, player);
  const dir = playerDirection(player);

  for (let fromPoint = 1; fromPoint <= 24; fromPoint++) {
    const pt = state.points[fromPoint];
    if (pt.player !== player || pt.count === 0)
      continue;

    for (const { value: die, index: dieIndex } of uniqueDice) {
      const to = fromPoint + dir * die;

      if (to >= 1 && to <= 24) {
        if (canLandOn(state, player, to)) {
          moves.push({ from: fromPoint, to, dieIndex });
        }
      }
      else if (inHome && isInHomeBoard(player, fromPoint)) {
        // Potential bear-off
        const exactExit
          = player === 'white' ? fromPoint - die === 0 : fromPoint + die === 25;
        const overshot
          = player === 'white' ? fromPoint - die < 0 : fromPoint + die > 25;

        if (exactExit) {
          moves.push({ from: fromPoint, to: BEAR_OFF, dieIndex });
        }
        else if (overshot && canUseLargerDieToBearOff(state, player, fromPoint)) {
          moves.push({ from: fromPoint, to: BEAR_OFF, dieIndex });
        }
      }
    }
  }

  return moves;
}

export function hasAnyLegalMove(state: GameState): boolean {
  return getLegalMoves(state).length > 0;
}

// ---------------------------------------------------------------------------
// State mutation
// ---------------------------------------------------------------------------

/** Deep-clone only the mutable parts of GameState. */
function cloneState(state: GameState): GameState {
  return {
    ...state,
    points: state.points.map(p => ({ ...p })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
    remainingDice: [...state.remainingDice],
    legalMovesForSelected: [],
  };
}

/**
 * Apply a move and return the next game state.
 * Automatically advances the turn when no dice remain or no moves are available.
 */
export function applyMove(state: GameState, move: Move): GameState {
  const player = state.currentPlayer;
  const opp = opponent(player);
  const next = cloneState(state);

  // Remove from source
  if (move.from === BAR_POINT) {
    next.bar[player]--;
  }
  else {
    next.points[move.from].count--;
    if (next.points[move.from].count === 0) {
      next.points[move.from].player = null;
    }
  }

  // Place at destination
  if (move.to === BEAR_OFF) {
    next.borneOff[player]++;
  }
  else {
    const dest = next.points[move.to];
    if (dest.player === opp && dest.count === 1) {
      // Hit a blot
      next.bar[opp]++;
      next.points[move.to] = { player, count: 1 };
    }
    else {
      next.points[move.to] = { player, count: dest.count + 1 };
    }
  }

  // Consume die
  next.remainingDice.splice(move.dieIndex, 1);

  // Win condition
  if (next.borneOff[player] === TOTAL_CHECKERS) {
    next.winner = player;
    next.phase = 'game-over';
    next.selectedPoint = null;
    return next;
  }

  // Switch turn when dice are exhausted or no moves remain
  if (next.remainingDice.length === 0 || !hasAnyLegalMove(next)) {
    next.currentPlayer = opp;
    next.dice = [0, 0];
    next.remainingDice = [];
    next.phase = 'rolling';
  }

  next.selectedPoint = null;
  return next;
}

/** Roll two dice (pure, does not mutate state). */
export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function rollOpeningDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Record one opening die. When both players have rolled, higher die wins first turn
 * using both values; equal dice re-roll (opening never starts with doubles).
 */
export function applyOpeningDieRoll(state: GameState, die: number): GameState {
  const player = state.currentPlayer;
  const openingRolls = { ...state.openingRolls, [player]: die };
  const other = opponent(player);

  if (openingRolls[other] === null) {
    return {
      ...cloneState(state),
      openingRolls,
      currentPlayer: other,
    };
  }

  const whiteDie = openingRolls.white!;
  const blackDie = openingRolls.black!;
  if (whiteDie === blackDie) {
    return {
      ...cloneState(state),
      openingRolls: { white: null, black: null },
      currentPlayer: 'white',
      phase: 'opening-roll',
    };
  }

  const winner: Player = whiteDie > blackDie ? 'white' : 'black';
  const next = {
    ...cloneState(state),
    currentPlayer: winner,
    openingRolls: { white: null, black: null },
    phase: 'rolling' as const,
  };
  return applyDiceRoll(next, [whiteDie, blackDie]);
}

/**
 * Apply a dice roll to the state.
 * Doubles grant 4 moves with that value.
 * If no legal move exists, the turn is automatically passed.
 */
export function applyDiceRoll(state: GameState, dice: [number, number]): GameState {
  const remaining: number[]
    = dice[0] === dice[1]
      ? [dice[0], dice[0], dice[0], dice[0]]
      : [dice[0], dice[1]];

  const next: GameState = {
    ...cloneState(state),
    dice,
    remainingDice: remaining,
    phase: 'moving',
    selectedPoint: null,
    legalMovesForSelected: [],
  };

  if (!hasAnyLegalMove(next)) {
    return {
      ...next,
      currentPlayer: opponent(state.currentPlayer),
      dice: [0, 0],
      remainingDice: [],
      phase: 'rolling',
    };
  }

  return next;
}

/** Pip count – total pips left for a player (lower = closer to winning). */
export function calculatePipCount(state: GameState, player: Player): number {
  let pips = 0;
  for (let p = 1; p <= 24; p++) {
    if (state.points[p].player === player && state.points[p].count > 0) {
      const distance = player === 'white' ? p : 25 - p;
      pips += distance * state.points[p].count;
    }
  }
  pips += state.bar[player] * 25;
  return pips;
}
