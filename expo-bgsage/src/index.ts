// expo-bgsage/src/index.ts — TypeScript API for the bgsage engine.
//
// The structural types below mirror Backgammon Mastermind's
// src/lib/game/types.ts (Player, BoardPoint, Move, GameState). They are
// declared locally so this module doesn't depend on the host app; his full
// GameState/Move are assignable to these (TypeScript structural typing).
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export type SagePlayer = 'white' | 'black';
export interface SageBoardPoint { player: SagePlayer | null; count: number }
export interface SageGameState {
  /** Index 0 unused; indices 1..24 are the board points. */
  points: SageBoardPoint[];
  bar: Record<SagePlayer, number>;
  currentPlayer: SagePlayer;
  dice: [number, number];
  remainingDice: number[];
}
/** from: 0 = bar, 1..24 = point. to: 1..24 = point, 25 = bear off. */
export interface SageMove { from: number; to: number; dieIndex: number }

export class SageEngineError extends Error {}

// Lazily resolved so that importing this module never throws when the native
// side isn't linked (e.g. Expo Go) — only actual engine calls fail, letting
// the caller fall back to the heuristic AI.
//
// Platform routing:
//   iOS / Android -> the Expo native module (Swift/Kotlin -> C ABI).
//   web           -> the WebAssembly build, lazy-loaded by ./web-engine
//                    (~13MB of weights download on first use).
interface SageEngineApi {
  analyzeCheckers(board: number[], die1: number, die2: number, ply: number): Promise<string>;
  analyzeCube(board: number[], cubeValue: number, cubeOwner: number, ply: number): Promise<string>;
}

let cachedApi: SageEngineApi | null = null;
async function engineApi(): Promise<SageEngineApi> {
  if (cachedApi) return cachedApi;
  if (Platform.OS === 'web') {
    const web = await import('./web-engine');
    cachedApi = {
      analyzeCheckers: web.analyzeCheckers,
      analyzeCube: web.analyzeCube,
    };
    return cachedApi;
  }
  try {
    cachedApi = requireNativeModule('Bgsage') as SageEngineApi;
  } catch (e) {
    throw new SageEngineError('Bgsage native module is not linked: ' + String(e));
  }
  return cachedApi;
}

// ---- board conversion: Mastermind <-> bgsage player-on-roll 26-array ----
function sageIdx(appPoint: number, p: SagePlayer): number {
  return p === 'white' ? appPoint : 25 - appPoint;
}
function appPoint(sage: number, p: SagePlayer): number {
  return p === 'white' ? sage : 25 - sage;
}

/** Mastermind GameState -> bgsage board[26] (index 0 = opp bar, 25 = my bar). */
export function gameStateToSageBoard(state: SageGameState): number[] {
  const P = state.currentPlayer;
  const opp: SagePlayer = P === 'white' ? 'black' : 'white';
  const b = new Array(26).fill(0);
  for (let i = 1; i <= 24; i++) {
    const pt = state.points[i];
    if (!pt || !pt.player || pt.count === 0) continue;
    b[sageIdx(i, P)] = pt.player === P ? pt.count : -pt.count;
  }
  b[25] = state.bar[P];
  b[0] = state.bar[opp];
  return b;
}

// ---- move decomposition: engine's resulting board -> individual moves ----
type RawMove = { from: number; to: number; die: number };
function boardEq(a: number[], b: number[]): boolean {
  for (let i = 0; i < 26; i++) if (a[i] !== b[i]) return false;
  return true;
}
function singleMoves(w: number[], d: number): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = [];
  const fromBar = w[25] > 0;
  const sources: number[] = fromBar ? [25] : [];
  if (!fromBar) for (let i = 1; i <= 24; i++) if (w[i] > 0) sources.push(i);
  for (const from of sources) {
    if (from === 25) {
      const to = 25 - d;
      if (w[to] >= -1) moves.push({ from, to });
    } else {
      const to = from - d;
      if (to >= 1) {
        if (w[to] >= -1) moves.push({ from, to });
      } else if (from <= d) {
        let higher = false;
        for (let k = from + 1; k <= 24; k++) if (w[k] > 0) { higher = true; break; }
        if (from === d || !higher) moves.push({ from, to: 0 });
      }
    }
  }
  return moves;
}
function applySingle(w: number[], m: { from: number; to: number }): number[] {
  const n = w.slice();
  n[m.from]--;
  if (m.to !== 0) {
    if (n[m.to] === -1) { n[m.to] = 1; n[0]++; } else n[m.to]++;
  }
  return n;
}
function decomposeMoves(oldB: number[], newB: number[], dice: number[]): RawMove[] | null {
  const orders =
    dice.length === 2 && dice[0] !== dice[1] ? [[dice[0], dice[1]], [dice[1], dice[0]]] : [dice.slice()];
  for (const order of orders) {
    let nodes = 0;
    const dfs = (w: number[], di: number, seq: RawMove[]): RawMove[] | null => {
      if (boardEq(w, newB)) return seq;
      if (di >= order.length || ++nodes > 300000) return null;
      const cands = singleMoves(w, order[di]);
      if (cands.length === 0) return dfs(w, di + 1, seq);
      for (const m of cands) {
        const r = dfs(applySingle(w, m), di + 1, seq.concat([{ from: m.from, to: m.to, die: order[di] }]));
        if (r) return r;
      }
      return null;
    };
    const r = dfs(oldB.slice(), 0, []);
    if (r) return r;
  }
  return null;
}

// ---- public API ----
export interface SageTurnCandidate {
  /** Resulting board (bgsage 26-array, player-on-roll perspective). */
  board: number[];
  /** Cubeless equity for the player on roll after this candidate. */
  equity: number;
}

export interface SageTurnPlan {
  /** Best full-turn move sequence, Mastermind-style (dieIndex into state.remainingDice). */
  moves: SageMove[];
  /** Cubeless equity of the best move for the player on roll. */
  equity: number;
  /** Every legal candidate's resulting board + equity, best first. */
  candidates: SageTurnCandidate[];
}

/**
 * Ask the engine for the full checker-play turn, with equities. Returns the
 * best move sequence plus every candidate's resulting board and equity
 * (best first) — the candidate list powers tutor-mode blunder detection
 * (equity loss of the played move vs the engine's best).
 * Throws SageEngineError when the engine is unavailable or its output can't
 * be decomposed — the caller should fall back to the heuristic AI (hints)
 * or skip silently (tutor).
 */
export async function planSageTurnFull(state: SageGameState, ply: 1 | 2 = 2): Promise<SageTurnPlan> {
  const P = state.currentPlayer;
  const board = gameStateToSageBoard(state);
  const [d1, d2] = state.dice;
  let raw: string;
  try {
    raw = await (await engineApi()).analyzeCheckers(board, d1, d2, ply);
  } catch (e) {
    throw new SageEngineError('sage analyzeCheckers failed: ' + String(e));
  }
  const json = JSON.parse(raw);
  if (json.error || !json.moves || json.moves.length === 0) {
    throw new SageEngineError('sage returned no moves: ' + (json.error ?? String(raw).slice(0, 120)));
  }
  const candidates: SageTurnCandidate[] = json.moves.map(
    (m: { board: number[]; equity: number; cubeless_equity: number }) => ({
      board: m.board,
      equity: Number(m.cubeless_equity ?? m.equity),
    }),
  );
  const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  const seq = decomposeMoves(board, candidates[0].board, dice);
  if (!seq) throw new SageEngineError('could not decompose sage result into moves');
  const used = new Array(state.remainingDice.length).fill(false);
  const moves = seq.map((m) => {
    const j = state.remainingDice.findIndex((v, k) => !used[k] && v === m.die);
    if (j === -1) throw new SageEngineError('die mismatch while mapping sage move');
    used[j] = true;
    return {
      from: m.from === 25 ? 0 : appPoint(m.from, P),
      to: m.to === 0 ? 25 : appPoint(m.to, P),
      dieIndex: j,
    };
  });
  return { moves, equity: candidates[0].equity, candidates };
}

/**
 * Ask the engine for the full checker-play turn. Returns Mastermind-style
 * Moves (with dieIndex into state.remainingDice) ready to animate.
 * Throws SageEngineError when the engine is unavailable or its output can't
 * be decomposed — the caller should fall back to the heuristic AI.
 */
export async function planSageTurn(state: SageGameState, ply: 1 | 2 = 2): Promise<SageMove[]> {
  return (await planSageTurnFull(state, ply)).moves;
}

export interface SageCubeVerdict {
  action: string;
  shouldDouble: boolean;
  shouldTake: boolean;
  equityNoDouble: number;
  equityDoubleTake: number;
  equityDoublePass: number;
}

/**
 * Cube decision for the player on roll. cubeOwner: 0 = centered, 1 = player
 * on roll owns the cube, 2 = opponent owns it. (Mastermind has no doubling
 * cube yet — this is ready for when one is added.)
 */
export async function sageCubeDecision(
  state: SageGameState, cubeValue: number, cubeOwner: 0 | 1 | 2, ply: 1 | 2 = 2,
): Promise<SageCubeVerdict> {
  const board = gameStateToSageBoard(state);
  const raw: string = await (await engineApi()).analyzeCube(board, cubeValue, cubeOwner, ply);
  const j = JSON.parse(raw);
  if (j.error) throw new SageEngineError('sage cube failed: ' + j.error);
  return {
    action: j.optimal_action ?? 'unknown',
    shouldDouble: !!j.should_double,
    shouldTake: !!j.should_take,
    equityNoDouble: +j.equity_nd,
    equityDoubleTake: +j.equity_dt,
    equityDoublePass: +j.equity_dp,
  };
}
