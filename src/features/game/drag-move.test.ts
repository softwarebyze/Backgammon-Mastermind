import { resolveDragMove } from '@/features/game/drag-move';
import { createInitialState } from '@/lib/game';

function movingState() {
  const state = createInitialState('vs-human');
  return {
    ...state,
    phase: 'moving' as const,
    currentPlayer: 'white' as const,
    dice: [1, 2] as [number, number],
    remainingDice: [1, 2],
  };
}

describe('resolveDragMove', () => {
  it('returns a single die move when legal', () => {
    const state = movingState();
    const result = resolveDragMove(state, 24, 23);
    expect(result?.kind).toBe('single');
    if (result?.kind === 'single') {
      expect(result.move.from).toBe(24);
      expect(result.move.to).toBe(23);
    }
  });

  it('returns null for illegal drop', () => {
    const state = movingState();
    expect(resolveDragMove(state, 24, 1)).toBeNull();
  });
});
