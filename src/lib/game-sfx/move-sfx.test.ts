import { BEAR_OFF, createInitialState } from '@/lib/game';
import { sfxKindsForMove } from '@/lib/game-sfx/move-sfx';

describe('sfxKindsForMove', () => {
  it('returns hit when opponent bar increases', () => {
    const snapshot = createInitialState('vs-computer');
    snapshot.phase = 'moving';
    snapshot.currentPlayer = 'white';
    snapshot.points[1] = { player: 'black', count: 1 };
    const next = {
      ...snapshot,
      bar: { white: 0, black: 1 },
      points: snapshot.points.map((p, i) =>
        i === 1 ? { player: 'white' as const, count: 1 } : p,
      ),
    };
    expect(sfxKindsForMove(snapshot, { from: 6, to: 1, dieIndex: 0 }, next)).toEqual(['hit']);
  });

  it('returns place for a normal point-to-point move', () => {
    const snapshot = createInitialState('vs-computer');
    snapshot.phase = 'moving';
    snapshot.currentPlayer = 'white';
    const next = {
      ...snapshot,
      points: snapshot.points.map((p, i) => {
        if (i === 24) {
          return { player: 'white' as const, count: 1 };
        }
        if (i === 18) {
          return { player: 'white' as const, count: 1 };
        }
        return p;
      }),
    };
    expect(sfxKindsForMove(snapshot, { from: 24, to: 18, dieIndex: 0 }, next)).toEqual(['place']);
  });

  it('returns bearOff for bearing off', () => {
    const snapshot = createInitialState('vs-computer');
    snapshot.phase = 'moving';
    snapshot.currentPlayer = 'white';
    const next = { ...snapshot, borneOff: { white: 1, black: 0 } };
    expect(sfxKindsForMove(snapshot, { from: 1, to: BEAR_OFF, dieIndex: 0 }, next)).toEqual([
      'bearOff',
    ]);
  });

  it('returns win on celebrating game-over', () => {
    const snapshot = createInitialState('vs-computer');
    snapshot.phase = 'moving';
    snapshot.currentPlayer = 'white';
    snapshot.borneOff = { white: 14, black: 0 };
    const next = {
      ...snapshot,
      phase: 'game-over' as const,
      winner: 'white' as const,
      borneOff: { white: 15, black: 0 },
    };
    expect(sfxKindsForMove(snapshot, { from: 1, to: BEAR_OFF, dieIndex: 0 }, next)).toEqual([
      'bearOff',
      'win',
    ]);
  });
});
