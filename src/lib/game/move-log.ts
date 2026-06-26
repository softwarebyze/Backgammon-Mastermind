import type { Move, Player } from './types';
import { BAR_POINT, BEAR_OFF } from './constants';

export type MoveLogEntry = {
  ply: number;
  player: Player;
  dice: [number, number];
  from: number;
  to: number;
};

function pointLabel(point: number): string {
  if (point === BAR_POINT) {
    return 'bar';
  }
  if (point === BEAR_OFF) {
    return 'off';
  }
  return String(point);
}

export function formatMoveLogEntry(entry: MoveLogEntry): string {
  const who = entry.player === 'white' ? 'White' : 'Black';
  return `${who}: ${pointLabel(entry.from)} → ${pointLabel(entry.to)} (${entry.dice[0]}, ${entry.dice[1]})`;
}

export function appendMoveLogEntry(
  log: MoveLogEntry[],
  ctx: { player: Player; dice: [number, number]; move: Move },
): MoveLogEntry[] {
  return [
    ...log,
    {
      ply: log.length + 1,
      player: ctx.player,
      dice: [...ctx.dice] as [number, number],
      from: ctx.move.from,
      to: ctx.move.to,
    },
  ];
}
