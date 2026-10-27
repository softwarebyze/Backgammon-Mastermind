import type { Position, PositionLocation } from './position';
import type { Player } from '@/lib/game/types';
import { newPosition, validatePosition } from './position';

/** Paint a stack, returning replaced checkers to their own off tray. */
// eslint-disable-next-line max-params -- document, target, selected color, desired stack
export function setPositionStack(p: Position, location: PositionLocation, color: Player, requested: number): Position {
  if (!Number.isFinite(requested) || (typeof location === 'number' && (!Number.isInteger(location) || location < 1 || location > 24)))
    return p;
  // A half-entered roll or match field must not interrupt board editing.
  const next = validatePosition({ ...p, dice: [0, 0], context: newPosition().context });
  const desired = Math.max(0, Math.min(15, Math.round(requested)));
  if (typeof location === 'number') {
    const old = next.points[location]!;
    const available = next.borneOff[color] + (old.player === color ? old.count : 0);
    const count = Math.min(desired, available);
    if (desired > 0 && count === 0)
      return p;
    if (old.player)
      next.borneOff[old.player] += old.count;
    next.points[location] = { player: count ? color : null, count };
    next.borneOff[color] -= count;
  }
  else {
    const owner = location === 'white-bar' ? 'white' : 'black';
    const count = Math.min(desired, next.borneOff[owner] + next.bar[owner]);
    next.borneOff[owner] += next.bar[owner] - count;
    next.bar[owner] = count;
  }
  return { ...next, dice: p.dice, context: p.context };
}

export function stackDragCount(initial: number, steps: number, top: boolean): number {
  return Math.max(0, Math.min(15, initial + (top ? steps : -steps)));
}

/** The checker centre nearest the press, measured inward from the outer edge. */
export function stackPressCount(distance: number, checkerSize: number, spacing = checkerSize - 2): number {
  if (!Number.isFinite(distance) || checkerSize <= 0 || spacing <= 0)
    return 1;
  return Math.max(1, Math.min(15, 1 + Math.round((distance - checkerSize / 2) / spacing)));
}
