// Pure board conversion and move recovery for bgsage. No react-native or
// native-module imports, so headless tooling (scripts/) can load it in Node.

export type SagePlayer = 'white' | 'black';
export type SageBoardPoint = { player: SagePlayer | null; count: number };
export type SageGameState = {
  /** Index 0 unused; indices 1..24 are the board points. */
  points: SageBoardPoint[];
  bar: Record<SagePlayer, number>;
  currentPlayer: SagePlayer;
  dice: [number, number];
  remainingDice: number[];
};
/** from: 0 = bar, 1..24 = point. to: 1..24 = point, 25 = bear off. */
export type SageMove = { from: number; to: number; dieIndex: number };

export class SageEngineError extends Error {}

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
  const b = Array.from({ length: 26 }, () => 0);
  for (let i = 1; i <= 24; i++) {
    const pt = state.points[i];
    if (!pt || !pt.player || pt.count === 0)
      continue;
    b[sageIdx(i, P)] = pt.player === P ? pt.count : -pt.count;
  }
  b[25] = state.bar[P];
  b[0] = state.bar[opp];
  return b;
}

// ---- move decomposition: engine's resulting board -> individual moves ----
type RawMove = { from: number; to: number; die: number };
function boardEq(a: number[], b: number[]): boolean {
  for (let i = 0; i < 26; i++) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}
function singleMoves(w: number[], d: number): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = [];
  const fromBar = w[25] > 0;
  let allHome = !fromBar;
  for (let k = 7; k <= 24 && allHome; k++) {
    if (w[k] > 0)
      allHome = false;
  }
  const sources: number[] = fromBar ? [25] : [];
  if (!fromBar) {
    for (let i = 1; i <= 24; i++) {
      if (w[i] > 0)
        sources.push(i);
    }
  }
  for (const from of sources) {
    if (from === 25) {
      const to = 25 - d;
      if (w[to] >= -1)
        moves.push({ from, to });
    }
    else {
      const to = from - d;
      if (to >= 1) {
        if (w[to] >= -1)
          moves.push({ from, to });
      }
      else if (allHome && from <= d) {
        let higher = false;
        for (let k = from + 1; k <= 24; k++) {
          if (w[k] > 0) {
            higher = true;
            break;
          }
        }
        if (from === d || !higher)
          moves.push({ from, to: 0 });
      }
    }
  }
  return moves;
}
function applySingle(w: number[], m: { from: number; to: number }): number[] {
  const n = w.slice();
  n[m.from]--;
  if (m.to !== 0) {
    if (n[m.to] === -1) {
      n[m.to] = 1;
      n[0]++;
    }
    else {
      n[m.to]++;
    }
  }
  return n;
}

/**
 * Recover the player-on-roll moves that turn `oldB` into `newB`.
 * Boards are bgsage 26-arrays (index 0 = opponent bar, 25 = player bar,
 * 0 as a move destination = bear off). Returns null when no legal sequence
 * of `dice` reaches the end board.
 */
export function decomposePlayerOnRollBoard(
  oldB: number[],
  newB: number[],
  dice: number[],
): RawMove[] | null {
  const orders
    = dice.length === 2 && dice[0] !== dice[1] ? [[dice[0], dice[1]], [dice[1], dice[0]]] : [dice.slice()];
  // A board can match before every playable die is spent (3/off vs 3/2 2/off
  // with 4-1 at the end of a bear-off); keep the sequence that plays the most dice.
  let best: RawMove[] | null = null;
  for (const order of orders) {
    let nodes = 0;
    const dfs = (w: number[], di: number, seq: RawMove[]): boolean => {
      // Longer sequences win. A one-die bear-off can match for either die of a
      // non-double; the rules require the higher die when both are legal.
      const higherSingle = best !== null && best.length === 1 && seq.length === 1 && seq[0].die > best[0].die;
      if (boardEq(w, newB) && (!best || seq.length > best.length || higherSingle)) {
        best = seq;
        if (seq.length === order.length)
          return true;
      }
      if (di >= order.length || ++nodes > 300000)
        return false;
      const cands = singleMoves(w, order[di]);
      if (cands.length === 0)
        return dfs(w, di + 1, seq);
      for (const m of cands) {
        if (dfs(applySingle(w, m), di + 1, seq.concat([{ from: m.from, to: m.to, die: order[di] }])))
          return true;
      }
      return false;
    };
    if (dfs(oldB.slice(), 0, []))
      return best;
  }
  return best;
}

/**
 * Turn one of the engine's candidate end boards (player-on-roll 26-array)
 * into Mastermind-style moves for `state`, with dieIndex into
 * state.remainingDice. Throws SageEngineError when the board is not
 * reachable with the state's dice.
 */
export function sageBoardToMoves(state: SageGameState, endBoard: number[]): SageMove[] {
  const P = state.currentPlayer;
  const [d1, d2] = state.dice;
  const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  const seq = decomposePlayerOnRollBoard(gameStateToSageBoard(state), endBoard, dice);
  if (!seq)
    throw new SageEngineError('could not decompose sage result into moves');
  const used = Array.from({ length: state.remainingDice.length }, () => false);
  return seq.map((m) => {
    const j = state.remainingDice.findIndex((v, k) => !used[k] && v === m.die);
    if (j === -1)
      throw new SageEngineError('die mismatch while mapping sage move');
    used[j] = true;
    return {
      from: m.from === 25 ? 0 : appPoint(m.from, P),
      to: m.to === 0 ? 25 : appPoint(m.to, P),
      dieIndex: j,
    };
  });
}
