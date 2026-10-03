import { playValidatedMoveSequence } from '@/features/game/play-validated-move-sequence';
import { createPositionState } from '@/lib/game/create-position';

function play(snapshot: ReturnType<typeof createPositionState>, moves: { from: number; to: number; dieIndex: number }[]) {
  const setMoveAnimation = jest.fn();
  const playMove = jest.fn();
  playValidatedMoveSequence({
    snapshot,
    moves,
    gen: 0,
    generationRef: { current: 0 },
    finishOnceRef: { current: null },
    isAnimating: false,
    playMove,
    setState: jest.fn(),
    setMoveAnimation,
    setSequenceActive: jest.fn(),
    isCommitLive: () => true,
  });
  return { setMoveAnimation, playMove };
}

describe('playValidatedMoveSequence', () => {
  it('slides one checker when the suggestion continues that checker', () => {
    const state = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'white',
      dice: [3, 1],
    });
    const { setMoveAnimation, playMove } = play(state, [
      { from: 13, to: 10, dieIndex: 0 },
      { from: 10, to: 9, dieIndex: 1 },
    ]);

    expect(playMove).not.toHaveBeenCalled();
    expect(setMoveAnimation).toHaveBeenCalledTimes(1);
    expect(setMoveAnimation.mock.calls[0][0]).toMatchObject({ from: 13, to: 9 });
  });

  it('animates each checker when the suggestion plays two different ones', () => {
    const state = createPositionState({
      currentPlayer: 'white',
      dice: [1, 2],
      bar: { white: 1 },
      placements: [{ point: 6, player: 'white', count: 2 }],
    });
    const { setMoveAnimation, playMove } = play(state, [
      { from: 0, to: 24, dieIndex: 0 },
      { from: 6, to: 4, dieIndex: 1 },
    ]);

    expect(setMoveAnimation).not.toHaveBeenCalled();
    expect(playMove).toHaveBeenCalledTimes(1);
    expect(playMove.mock.calls[0][1]).toMatchObject({ from: 0, to: 24 });
  });
});
