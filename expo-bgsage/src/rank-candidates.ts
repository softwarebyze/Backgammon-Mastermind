/** Rank validated candidates using the caller’s selected cube-aware or cubeless equity. */
export function rankCandidates<T extends { board: number[]; equity: number }>(candidates: T[]): T[] {
  if (candidates.some(c => !Array.isArray(c.board)
    || c.board.length !== 26
    || !c.board.every(Number.isInteger)
    || !Number.isFinite(c.equity))) {
    throw new Error('sage returned an invalid candidate');
  }
  return candidates.sort((a, b) => b.equity - a.equity);
}
