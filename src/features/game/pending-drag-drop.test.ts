import { resolvePendingDragDrop } from '@/features/game/pending-drag-drop';
import { createInitialState } from '@/lib/game';

function movingState() {
  const state = createInitialState('vs-human');
  return {
    ...state,
    phase: 'moving' as const,
    currentPlayer: 'white' as const,
    dice: [3, 5] as [number, number],
    remainingDice: [3, 5],
  };
}

describe('resolvePendingDragDrop', () => {
  it('re-resolves a queued drop against post-animation state', () => {
    const state = movingState();
    const resolved = resolvePendingDragDrop(state, {
      from: 24,
      to: 21,
      fromAnchor: { x: 10, y: 20 },
    });
    expect(resolved).toEqual({
      kind: 'single',
      move: { from: 24, to: 21, dieIndex: expect.any(Number) },
    });
  });

  it('returns null when the queued drop is no longer legal', () => {
    const state = {
      ...movingState(),
      remainingDice: [5],
    };
    // 24→21 needs a 3; only a 5 remains after the prior move committed.
    expect(resolvePendingDragDrop(state, {
      from: 24,
      to: 21,
      fromAnchor: { x: 0, y: 0 },
    })).toBeNull();
  });
});
