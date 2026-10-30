import { createPositionState } from '@/lib/game/create-position';
import { shouldPreselectBar } from './preselect-bar';

const LIVE = { isHumanTurn: true, isAnimating: false, interactionEnabled: true };

function onBar(overrides: Partial<Parameters<typeof createPositionState>[0]> = {}) {
  const state = createPositionState({
    placements: [{ point: 6, player: 'white', count: 5 }, { point: 19, player: 'black', count: 5 }],
    bar: { white: 1, black: 0 },
    dice: [3, 1],
    currentPlayer: 'white',
    mode: 'vs-human',
    ...overrides,
  });
  return { ...state, phase: 'moving' as const };
}

describe('shouldPreselectBar', () => {
  it('selects the bar when the player has to enter from it', () => {
    expect(shouldPreselectBar(onBar(), LIVE)).toBe(true);
  });

  it('leaves selection alone with nothing on the bar', () => {
    expect(shouldPreselectBar(onBar({ bar: { white: 0, black: 0 } }), LIVE)).toBe(false);
  });

  it('does nothing when the home board is closed and entry is impossible', () => {
    const closed = onBar({
      placements: [19, 20, 21, 22, 23, 24].map(point => ({ point, player: 'black' as const, count: 2 })),
    });
    expect(shouldPreselectBar(closed, LIVE)).toBe(false);
  });

  it('keeps an existing selection, and waits for the human turn, animations and overlays', () => {
    expect(shouldPreselectBar({ ...onBar(), selectedPoint: 0 }, LIVE)).toBe(false);
    expect(shouldPreselectBar(onBar(), { ...LIVE, isHumanTurn: false })).toBe(false);
    expect(shouldPreselectBar(onBar(), { ...LIVE, isAnimating: true })).toBe(false);
    expect(shouldPreselectBar(onBar(), { ...LIVE, interactionEnabled: false })).toBe(false);
    expect(shouldPreselectBar({ ...onBar(), phase: 'rolling' }, LIVE)).toBe(false);
  });
});
