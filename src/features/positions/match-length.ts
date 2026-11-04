import type { Position } from '@/lib/positions/position';

/**
 * Matches are played to an odd number of points, so the target steps
 * Money → 1 → 3 → … → 25. An imported even length steps to its odd neighbour.
 */
export function nextMatchLength(length: number, direction: 1 | -1): number {
  if (direction === 1)
    return length === 0 ? 1 : length % 2 === 0 ? length + 1 : length + 2;
  if (length <= 1)
    return 0;
  return length % 2 === 0 ? length - 1 : length - 2;
}

/**
 * The Crawford game is the one game right after a player first reaches one
 * point from winning. So it needs exactly one side at match point: at
 * double match point neither can double anyway.
 */
export function crawfordPossible({ matchLength, scores }: Pick<Position['context'], 'matchLength' | 'scores'>): boolean {
  if (!matchLength)
    return false;
  return (scores.white === matchLength - 1) !== (scores.black === matchLength - 1);
}
