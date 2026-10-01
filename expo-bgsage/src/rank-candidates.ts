/**
 * The mobile engine orders its JSON by cubeful equity. The app has no cube,
 * so callers pass each candidate's cubeless equity and use this ranking for
 * both the suggested play and tutor loss.
 */
export function rankCubelessCandidates<T extends { board: number[]; equity: number }>(candidates: T[]): T[] {
  if (candidates.some(c => !Array.isArray(c.board)
    || c.board.length !== 26
    || !c.board.every(Number.isInteger)
    || !Number.isFinite(c.equity))) {
    throw new Error('sage returned an invalid candidate');
  }
  return candidates.sort((a, b) => b.equity - a.equity);
}
