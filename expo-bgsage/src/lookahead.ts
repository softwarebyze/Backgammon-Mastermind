// One roll of lookahead on top of 1-ply evaluations, restricted to the best
// few root candidates. The engine's own 2-ply scores every root candidate
// and trips its 1000 ms budget in busy middle-game positions; this needs at
// most 21 cheap 1-ply calls per kept candidate.

export type LookaheadCandidate = { board: number[]; equity: number };
/** Best-first cubeless candidates for the player on roll of `board`. */
export type OnePlyAnalyzer = (board: number[], die1: number, die2: number) => Promise<LookaheadCandidate[]>;

const ROLLS: [number, number, number][] = [];
for (let a = 1; a <= 6; a++) {
  for (let b = a; b <= 6; b++)
    ROLLS.push([a, b, a === b ? 1 / 36 : 2 / 36]);
}

/** Same position, seen by the other player on roll (bgsage 26-array). */
export function flipSageBoard(b: number[]): number[] {
  const f = Array.from({ length: 26 }, () => 0);
  for (let i = 1; i <= 24; i++)
    f[i] = -b[25 - i] || 0;
  f[25] = b[0];
  f[0] = b[25];
  return f;
}

function moverCheckers(b: number[]): number {
  let n = b[25];
  for (let i = 1; i <= 24; i++) {
    if (b[i] > 0)
      n += b[i];
  }
  return n;
}

/**
 * Re-rank the top root candidates (at most `maxCandidates`, within `maxLoss`
 * of the best 1-ply equity) by averaging, over all 21 opponent rolls, the
 * negated equity of the opponent's best 1-ply reply. The rest keep their
 * 1-ply order below them. Returns best-first.
 */
export async function rescoreWithLookahead(
  candidates: readonly LookaheadCandidate[],
  analyze: OnePlyAnalyzer,
  limits: { maxCandidates?: number; maxLoss?: number } = {},
): Promise<LookaheadCandidate[]> {
  const maxCandidates = limits.maxCandidates ?? 5;
  const maxLoss = limits.maxLoss ?? 0.08;
  if (candidates.length <= 1)
    return candidates.slice();
  const best = candidates[0].equity;
  const kept = candidates.filter((c, i) => i < maxCandidates && best - c.equity <= maxLoss);
  const rescored: LookaheadCandidate[] = [];
  for (const c of kept) {
    // Bearing off the last checker wins outright; 1-ply already scores it exactly.
    if (moverCheckers(c.board) === 0) {
      rescored.push(c);
      continue;
    }
    const opp = flipSageBoard(c.board);
    let equity = 0;
    for (const [d1, d2, p] of ROLLS) {
      const replies = await analyze(opp, d1, d2);
      equity += p * -(replies[0]?.equity ?? -c.equity);
    }
    rescored.push({ board: c.board, equity });
  }
  rescored.sort((a, b) => b.equity - a.equity);
  return [...rescored, ...candidates.slice(kept.length)];
}
