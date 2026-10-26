import { gameStateInvariantError } from '@/lib/game/persisted-session';
import { editCheckers, newPosition, positionFromGame, positionGame, validatePosition } from './position';

describe('position setup', () => {
  it('starts a playable, persistable state with either player, dice and mode', () => {
    const p = newPosition();
    p.dice = [6, 2];
    p.currentPlayer = 'black';
    const state = positionGame(p, 'vs-computer');
    expect(state).toMatchObject({ phase: 'moving', currentPlayer: 'black', mode: 'vs-computer', remainingDice: [6, 2] });
    expect(gameStateInvariantError(state)).toBeNull();
  });

  it('transfers checkers between off tray, exact points and bar without mutating input', () => {
    const empty = newPosition(true);
    const placed = editCheckers(empty, 1, 'white', 15);
    expect(placed.points[1]).toEqual({ player: 'white', count: 15 });
    expect(empty.borneOff.white).toBe(15);
    expect(editCheckers(placed, 1, 'black', 1)).toEqual(placed);
    const removed = editCheckers(placed, 1, 'white', -3);
    const bar = editCheckers(removed, 'white-bar', 'black', 2);
    expect(bar.bar.white).toBe(2);
    expect(bar.borneOff.white).toBe(1);
    expect(editCheckers(bar, 3, 'white', 20).points[3]!.count).toBe(1);
    expect(editCheckers(placed, 1, 'white', -100).points[1]).toEqual({ player: null, count: 0 });
  });

  it.each([
    (p: ReturnType<typeof newPosition>) => { p.bar.white = 1; },
    (p: ReturnType<typeof newPosition>) => { p.points[0] = { player: 'black', count: 1 }; },
    (p: ReturnType<typeof newPosition>) => { p.dice = [0, 4]; },
    (p: ReturnType<typeof newPosition>) => { p.points[4] = { player: 'white', count: -1 }; },
    (p: ReturnType<typeof newPosition>) => {
      p.context.matchLength = 3;
      p.context.scores.white = 4;
    },
  ])('rejects invalid checker, roll and match data', (invalidate) => {
    const p = newPosition();
    invalidate(p);
    expect(() => validatePosition(p)).toThrow();
  });

  it('does not reuse dice already spent in a captured game', () => {
    const p = newPosition();
    p.dice = [3, 1];
    const state = positionGame(p);
    expect(positionFromGame(state).dice).toEqual([3, 1]);
    expect(positionFromGame({ ...state, remainingDice: [1] }).dice).toEqual([0, 0]);
  });

  it('marks a fully borne-off board completed for review', () => {
    const p = editCheckers(newPosition(true), 20, 'black', 15);
    expect(positionGame(p)).toMatchObject({ phase: 'game-over', winner: 'white', remainingDice: [] });
  });
});
