import type { Player } from '@/lib/game/types';

/** Spoken name for a board point — occupied stacks must still expose a button. */
export function pointAccessibilityLabel(
  pointIndex: number,
  point: { count: number; player: Player | null },
  opts: { isSelected?: boolean; isLegalTarget?: boolean } = {},
): string {
  const parts = [`Point ${pointIndex}`];
  if (point.count > 0 && point.player) {
    const noun = point.count === 1 ? 'checker' : 'checkers';
    parts.push(`${point.count} ${point.player} ${noun}`);
  }
  if (opts.isSelected) {
    parts.push('selected');
  }
  if (opts.isLegalTarget) {
    parts.push('legal move target');
  }
  return parts.join(', ');
}
