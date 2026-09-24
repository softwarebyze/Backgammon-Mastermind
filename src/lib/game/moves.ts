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
// Raw single-step generation (no full-turn dice rules)
// ---------------------------------------------------------------------------

function uniqueRemainingDice(remainingDice: number[]): Array<{ value: number; index: number }> {
  const uniqueDice: Array<{ value: number; index: number }> = [];
  const seen = new Set<number>();
  for (let i = 0; i < remainingDice.length; i++) {
    const v = remainingDice[i];
    if (!seen.has(v)) {
      seen.add(v);
      uniqueDice.push({ value: v, index: i });
    }
  }
  return uniqueDice;
}

/**
 * Single-die destinations from this position. Does not apply USBGF max-dice or
 * higher-die rules — `getLegalMoves` filters those afterwards.
 */
function getRawSingleStepMoves(state: GameState): Move[] {
  const { remainingDice, currentPlayer: player, bar } = state;
  if (remainingDice.length === 0)
    return [];

  const uniqueDice = uniqueRemainingDice(remainingDice);
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

function positionKey(state: GameState): string {
  let key = `${state.currentPlayer}:${state.remainingDice.join(',')}:`;
  key += `b${state.bar.white},${state.bar.black};`;
  key += `o${state.borneOff.white},${state.borneOff.black};`;
  for (let i = 1; i <= 24; i++) {
    const p = state.points[i]!;
    if (p.count > 0)
      key += `${i}${p.player === 'white' ? 'w' : 'b'}${p.count},`;
  }
  return key;
}

/** Deepest number of remaining dice that can still be played from `state`. */
function maxDiceUsable(state: GameState, memo: Map<string, number>): number {
  if (state.winner || state.remainingDice.length === 0)
    return 0;

  const key = positionKey(state);
  const cached = memo.get(key);
  if (cached !== undefined)
    return cached;

  const raw = getRawSingleStepMoves(state);
  if (raw.length === 0) {
    memo.set(key, 0);
    return 0;
  }

  let best = 0;
  const target = state.remainingDice.length;
  for (const move of raw) {
    const used = 1 + maxDiceUsable(applyMovePhysical(state, move), memo);
    if (used > best)
      best = used;
    if (best === target)
      break;
  }

  memo.set(key, best);
  return best;
}

/**
 * USBGF: keep first moves that use the most dice; if only one mixed die can be
 * used, keep the higher. Never drops every candidate — raw empty iff legal empty.
 */
function filterFullTurnLegalMoves(state: GameState, raw: Move[]): Move[] {
  if (raw.length <= 1 || state.remainingDice.length <= 1)
    return raw;

  const memo = new Map<string, number>();
  const scored: Array<{ move: Move; usage: number; die: number }> = [];
  let maxUsage = 0;

  for (const move of raw) {
    const die = state.remainingDice[move.dieIndex]!;
    const usage = 1 + maxDiceUsable(applyMovePhysical(state, move), memo);
    scored.push({ move, usage, die });
    if (usage > maxUsage)
      maxUsage = usage;
  }

  let legal = scored.filter(s => s.usage === maxUsage);
  if (maxUsage === 1) {
    const higher = Math.max(...state.remainingDice);
    const lower = Math.min(...state.remainingDice);
    if (higher !== lower && legal.some(s => s.die === higher))
      legal = legal.filter(s => s.die === higher);
  }

  return legal.map(s => s.move);
}

// ---------------------------------------------------------------------------
// Legal move generation
// ---------------------------------------------------------------------------

/**
 * Legal first moves for the current player, after USBGF max-dice / higher-die
 * filtering. Duplicates caused by equal die values are eliminated.
 */
export function getLegalMoves(state: GameState): Move[] {
  return filterFullTurnLegalMoves(state, getRawSingleStepMoves(state));
}

export function hasAnyLegalMove(state: GameState): boolean {
  return getRawSingleStepMoves(state).length > 0;
}

/** End the current turn and hand dice to the opponent. */
export function passTurn(state: GameState): GameState {
  return {
    ...cloneState(state),
    currentPlayer: opponent(state.currentPlayer),
    dice: [0, 0],
    remainingDice: [],
    phase: 'rolling',
    selectedPoint: null,
    legalMovesForSelected: [],
  };
}

function finishMovingTurn(state: GameState): GameState {
  if (state.remainingDice.length === 0) {
    return passTurn(state);
  }
  if (!hasAnyLegalMove(state)) {
    return {
      ...state,
      phase: 'no-move',
      selectedPoint: null,
      legalMovesForSelected: [],
    };
  }
  return state;
}

function moveSequenceKey(at: number, remainingDice: number[]): string {
  return `${at}:${remainingDice.join(',')}`;
}

function isHitMove(state: GameState, move: Move): boolean {
  if (move.to < 1 || move.to > 24) {
    return false;
  }
  const player = state.currentPlayer;
  const dest = state.points[move.to];
  return dest.player === opponent(player) && dest.count === 1;
}

/** True when any step in a compound path hits a blot (needs stepped animation). */
export function moveSequenceInvolvesHit(state: GameState, moves: Move[]): boolean {
  let snap = state;
  for (const planned of moves) {
    const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to);
    if (!legal) {
      break;
    }
    if (isHitMove(snap, legal)) {
      return true;
    }
    snap = applyMove(snap, legal);
  }
  return false;
}

/** Prefer capture steps when BFS finds multiple equal-length compound paths. */
function isBetterSequence(
  candidate: { moves: Move[]; captures: number },
  bestLength: number,
  bestCaptures: number,
): boolean {
  const len = candidate.moves.length;
  return len < bestLength || (len === bestLength && candidate.captures > bestCaptures);
}

/**
 * Find a sequence of legal single-die moves from `from` to `to`.
 * Returns null when no sequence exists (including single-die moves — use getLegalMoves).
 */
export function findMoveSequence(
  state: GameState,
  from: number,
  to: number,
): Move[] | null {
  if (from === to || state.phase !== 'moving') {
    return null;
  }

  type QueueNode = { at: number; state: GameState; moves: Move[]; captures: number };
  const queue: QueueNode[] = [{ at: from, state, moves: [], captures: 0 }];
  const visited = new Set<string>([moveSequenceKey(from, state.remainingDice)]);

  let best: Move[] | null = null;
  let bestCaptures = -1;
  let bestLength = Infinity;

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.moves.length > bestLength) {
      continue;
    }
    if (node.state.phase !== 'moving' || node.state.remainingDice.length === 0) {
      continue;
    }

    const legalFrom = getLegalMoves(node.state)
      .filter(m => m.from === node.at)
      .sort((a, b) => Number(isHitMove(node.state, b)) - Number(isHitMove(node.state, a)));

    for (const move of legalFrom) {
      const nextState = applyMove(node.state, move);
      const captures = node.captures + (isHitMove(node.state, move) ? 1 : 0);
      const sequence = [...node.moves, move];

      if (move.to === to) {
        if (isBetterSequence({ moves: sequence, captures }, bestLength, bestCaptures)) {
          best = sequence;
          bestCaptures = captures;
          bestLength = sequence.length;
        }
        continue;
      }

      if (nextState.phase !== 'moving' || nextState.remainingDice.length === 0) {
        continue;
      }

      const key = moveSequenceKey(move.to, nextState.remainingDice);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push({ at: move.to, state: nextState, moves: sequence, captures });
    }
  }

  return best;
}

/** All destinations reachable from `from`, mapped to a move sequence (shortest first). */
export function getReachableDestinations(
  state: GameState,
  from: number,
): Map<number, Move[]> {
  const result = new Map<number, Move[]>();
  if (state.phase !== 'moving') {
    return result;
  }

  type QueueNode = { at: number; state: GameState; moves: Move[]; captures: number };
  const queue: QueueNode[] = [{ at: from, state, moves: [], captures: 0 }];
  const visited = new Set<string>([moveSequenceKey(from, state.remainingDice)]);
  const captureCountByDest = new Map<number, number>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.state.phase !== 'moving' || node.state.remainingDice.length === 0) {
      continue;
    }

    const legalFrom = getLegalMoves(node.state)
      .filter(m => m.from === node.at)
      .sort((a, b) => Number(isHitMove(node.state, b)) - Number(isHitMove(node.state, a)));

    for (const move of legalFrom) {
      const nextState = applyMove(node.state, move);
      const sequence = [...node.moves, move];
      const captures = node.captures + (isHitMove(node.state, move) ? 1 : 0);

      const existing = result.get(move.to);
      const existingCaptures = captureCountByDest.get(move.to) ?? -1;
      if (
        !existing
        || isBetterSequence(
          { moves: sequence, captures },
          existing.length,
          existingCaptures,
        )
      ) {
        result.set(move.to, sequence);
        captureCountByDest.set(move.to, captures);
      }

      if (nextState.phase !== 'moving' || nextState.remainingDice.length === 0) {
        continue;
      }

      const key = moveSequenceKey(move.to, nextState.remainingDice);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push({ at: move.to, state: nextState, moves: sequence, captures });
    }
  }

  return result;
}

/** Apply several moves in order (e.g. compound tap consuming multiple dice). */
export function applyMoveSequence(state: GameState, moves: Move[]): GameState {
  let snap = state;
  for (const planned of moves) {
    const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to);
    if (!legal) {
      break;
    }
    snap = applyMove(snap, legal);
  }
  return snap;
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
 * Move a checker and consume a die. Does not pass the turn or consult legality,
 * so full-turn search cannot recurse through `getLegalMoves` / `applyMove`.
 */
function applyMovePhysical(state: GameState, move: Move): GameState {
  const player = state.currentPlayer;
  const opp = opponent(player);
  const next = cloneState(state);

  if (move.from === BAR_POINT) {
    next.bar[player]--;
  }
  else {
    next.points[move.from].count--;
    if (next.points[move.from].count === 0) {
      next.points[move.from].player = null;
    }
  }

  if (move.to === BEAR_OFF) {
    next.borneOff[player]++;
  }
  else {
    const dest = next.points[move.to];
    if (dest.player === opp && dest.count === 1) {
      next.bar[opp]++;
      next.points[move.to] = { player, count: 1 };
    }
    else {
      next.points[move.to] = { player, count: dest.count + 1 };
    }
  }

  next.remainingDice.splice(move.dieIndex, 1);
  next.selectedPoint = null;

  if (next.borneOff[player] === TOTAL_CHECKERS) {
    next.winner = player;
    next.phase = 'game-over';
  }

  return next;
}

/**
 * Apply a move and return the next game state.
 * Automatically advances the turn when no dice remain or no moves are available.
 */
export function applyMove(state: GameState, move: Move): GameState {
  const next = applyMovePhysical(state, move);
  if (next.phase === 'game-over')
    return next;
  return finishMovingTurn(next);
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
    // Keep both dice so the UI can show “tie — roll again” before clearing.
    return {
      ...cloneState(state),
      openingRolls: { white: whiteDie, black: blackDie },
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
      phase: 'no-move',
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

/**
 * True when no move has been played yet this turn: every granted die is
 * still unused. Doubles grant four dice, any other roll grants two.
 */
export function isTurnStart(state: GameState): boolean {
  const granted = state.dice[0] === state.dice[1] ? 4 : 2;
  return state.remainingDice.length === granted;
}
