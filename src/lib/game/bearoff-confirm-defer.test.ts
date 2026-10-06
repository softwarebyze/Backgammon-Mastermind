/**
 * Confirm-move (PR #205) defers turn handoff when dice are spent. Winning must
 * still reach game-over immediately — defer must not block the win path.
 */
import { createPositionState } from './create-position';
import { applyMove, getLegalMoves } from './moves';
import { getForcedLegalMove, getForcedTurnSequence } from './single-move';

/** Mirror of PR #205 applyMove options without importing that branch. */
function applyMoveMaybeDefer(
  state: Parameters<typeof applyMove>[0],
  move: Parameters<typeof applyMove>[1],
  deferTurnEnd: boolean,
) {
  // On main, applyMove has no defer option. Simulate by applying then, if
  // dice empty and not game-over, forcing phase back to moving.
  const next = applyMove(state, move);
  if (!deferTurnEnd || next.phase === 'game-over' || next.winner) {
    return next;
  }
  if (next.phase === 'rolling' && next.remainingDice.length === 0) {
    // passTurn happened — undo the handoff to mimic defer
    return {
      ...next,
      currentPlayer: state.currentPlayer,
      dice: state.dice,
      remainingDice: [],
      phase: 'moving' as const,
      selectedPoint: null,
      legalMovesForSelected: [],
    };
  }
  return next;
}

describe('confirm-move defer vs bear-off win', () => {
  it('still wins when the last checker bears off under deferTurnEnd', () => {
    const state = createPositionState({
      placements: [
        { point: 1, player: 'white', count: 1 },
        { point: 24, player: 'black', count: 15 },
      ],
      borneOff: { white: 14, black: 0 },
      dice: [6, 5],
      mode: 'vs-computer',
    });
    const move = getForcedLegalMove(state)!;
    expect(move).toBeTruthy();
    const next = applyMoveMaybeDefer(state, move, true);
    expect(next.winner).toBe('white');
    expect(next.phase).toBe('game-over');
  });

  it('defers handoff when dice are spent without a win', () => {
    const state = createPositionState({
      placements: [
        { point: 6, player: 'white', count: 2 },
        { point: 24, player: 'black', count: 15 },
      ],
      borneOff: { white: 13, black: 0 },
      dice: [6, 5],
      mode: 'vs-computer',
    });
    // Play both bears if forced, or step through.
    const seq = getForcedTurnSequence(state);
    let snap = state;
    if (seq) {
      for (const m of seq) {
        snap = applyMoveMaybeDefer(snap, m, true);
      }
    }
    else {
      const first = getLegalMoves(state)[0]!;
      snap = applyMoveMaybeDefer(state, first, true);
      if (snap.phase === 'moving' && snap.remainingDice.length > 0) {
        const second = getLegalMoves(snap)[0];
        if (second) {
          snap = applyMoveMaybeDefer(snap, second, true);
        }
      }
    }
    if (snap.winner) {
      expect(snap.phase).toBe('game-over');
    }
    else if (snap.remainingDice.length === 0) {
      expect(snap.phase).toBe('moving');
      expect(snap.currentPlayer).toBe('white');
    }
  });

  it('forced multi-step win under defer still ends the game', () => {
    const state = createPositionState({
      placements: [
        { point: 1, player: 'white', count: 1 },
        { point: 2, player: 'white', count: 1 },
        { point: 24, player: 'black', count: 15 },
      ],
      borneOff: { white: 13, black: 0 },
      dice: [6, 5],
      mode: 'vs-human',
    });
    const seq = getForcedTurnSequence(state)!;
    expect(seq.length).toBeGreaterThan(1);
    let snap = state;
    for (const planned of seq) {
      const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to)!;
      snap = applyMoveMaybeDefer(snap, legal, true);
    }
    expect(snap.winner).toBe('white');
    expect(snap.phase).toBe('game-over');
  });
});
