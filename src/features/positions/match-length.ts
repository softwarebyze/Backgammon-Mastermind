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
