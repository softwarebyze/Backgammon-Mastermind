import type { MoveLogEntry } from '@/lib/game/move-log';
import {
  nextTurnEndPly,
  previousTurnEndPly,
  turnContainingPly,
  turnStartPly,
} from '@/features/game/use-review-turn-loop';

const log: MoveLogEntry[] = [
  { ply: 1, player: 'white', dice: [6, 5], from: 24, to: 18 },
  { ply: 2, player: 'white', dice: [6, 5], from: 18, to: 13 },
  { ply: 3, player: 'black', dice: [1, 4], from: 19, to: 20 },
  { ply: 4, player: 'black', dice: [1, 4], from: 17, to: 13 },
];

describe('review turn navigation', () => {
  it('finds the turn containing a ply', () => {
    const t1 = turnContainingPly(log, 2)!;
    expect(t1.player).toBe('white');
    expect(turnStartPly(t1)).toBe(1);
    expect(t1.endPly).toBe(2);

    const t2 = turnContainingPly(log, 3)!;
    expect(t2.player).toBe('black');
    expect(turnStartPly(t2)).toBe(3);
  });

  it('steps back/forward by whole turns', () => {
    expect(previousTurnEndPly(log, 4)).toBe(2);
    expect(previousTurnEndPly(log, 2)).toBe(0);
    expect(previousTurnEndPly(log, 0)).toBe(0);

    expect(nextTurnEndPly(log, 0, 4)).toBe(2);
    expect(nextTurnEndPly(log, 2, 4)).toBe(4);
    expect(nextTurnEndPly(log, 4, 4)).toBe(4);
  });
});
