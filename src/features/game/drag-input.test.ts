import { canDragFromBar, canDragFromColumn, validateDragStart } from '@/features/game/drag-input';
import { createInitialState } from '@/lib/game';
import { BAR_POINT } from '@/lib/game/constants';

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

describe('canDragFromColumn', () => {
  it('allows drag on own checker during moving', () => {
    const state = movingState();
    expect(canDragFromColumn({
      dragInteractionEnabled: true,
      phase: state.phase,
      point: state.points[24],
      currentPlayer: 'white',
      barCountForPlayer: 0,
    })).toBe(true);
  });

  it('blocks opponent points', () => {
    const state = movingState();
    expect(canDragFromColumn({
      dragInteractionEnabled: true,
      phase: state.phase,
      point: state.points[1],
      currentPlayer: 'white',
      barCountForPlayer: 0,
    })).toBe(false);
  });

  it('blocks empty points', () => {
    expect(canDragFromColumn({
      dragInteractionEnabled: true,
      phase: 'moving',
      point: { player: null, count: 0 },
      currentPlayer: 'white',
      barCountForPlayer: 0,
    })).toBe(false);
  });

  it('blocks point drag when bar must be cleared first', () => {
    const state = movingState();
    expect(canDragFromColumn({
      dragInteractionEnabled: true,
      phase: state.phase,
      point: state.points[24],
      currentPlayer: 'white',
      barCountForPlayer: 1,
    })).toBe(false);
  });

  it('still allows gesture during rolling for roll nudge (bar empty)', () => {
    const state = { ...movingState(), phase: 'rolling' as const, dice: [0, 0] as [number, number] };
    expect(canDragFromColumn({
      dragInteractionEnabled: true,
      phase: state.phase,
      point: state.points[24],
      currentPlayer: 'white',
      barCountForPlayer: 0,
    })).toBe(true);
  });

  it('respects board-level drag off switch', () => {
    const state = movingState();
    expect(canDragFromColumn({
      dragInteractionEnabled: false,
      phase: state.phase,
      point: state.points[24],
      currentPlayer: 'white',
      barCountForPlayer: 0,
    })).toBe(false);
  });
});

describe('canDragFromBar', () => {
  it('allows when player has bar checkers', () => {
    expect(canDragFromBar({ dragInteractionEnabled: true, barCountForPlayer: 2 })).toBe(true);
  });

  it('blocks when bar is empty', () => {
    expect(canDragFromBar({ dragInteractionEnabled: true, barCountForPlayer: 0 })).toBe(false);
  });
});

describe('validateDragStart', () => {
  it('accepts legal point drag', () => {
    const state = movingState();
    expect(validateDragStart(state, 24)).toBe('ok');
  });

  it('accepts legal bar drag', () => {
    const state = {
      ...movingState(),
      bar: { white: 1, black: 0 },
      points: movingState().points.map((p, i) =>
        i === 24 ? { player: null, count: 0 } : p),
    };
    expect(validateDragStart(state, BAR_POINT)).toBe('ok');
  });

  it('rejects bar drag when bar is empty', () => {
    expect(validateDragStart(movingState(), BAR_POINT)).toBe('no-checker');
  });

  it('rejects when no legal moves from point', () => {
    const blocked = {
      ...movingState(),
      points: movingState().points.map((p, i) => {
        if (i === 24) {
          return { player: 'white' as const, count: 1 };
        }
        if (i === 23 || i === 22 || i === 21) {
          return { player: 'black' as const, count: 2 };
        }
        return p;
      }),
      remainingDice: [1] as number[],
    };
    expect(validateDragStart(blocked, 24)).toBe('no-legal-moves');
  });
});
