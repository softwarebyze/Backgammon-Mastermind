/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, useEffect } from 'react';
import { clearGuidance, getGuidance, showGuidance, useGuidance } from '@/features/game/guidance-store';
import { attachGameKeyboardShortcuts } from '@/features/game/use-game-keyboard-shortcuts';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { createPositionState } from '@/lib/game/create-position';

const { createRoot } = jest.requireActual<{
  createRoot: (el: Element) => { render: (node: ReactNode) => void; unmount: () => void };
}>('react-dom/client');
jest.mock('expo-router', () => ({ useFocusEffect: () => {} }));
jest.mock('posthog-react-native', () => ({
  usePostHog: function posthogApi() {
    return { capture: jest.fn() };
  },
}));

function start() {
  return createPositionState({
    placements: [{ point: 6, player: 'white', count: 15 }, { point: 24, player: 'black', count: 15 }],
    dice: [3, 1],
    mode: 'vs-human',
  });
}

describe('dom keyboard Undo with real game and guidance state', () => {
  it.each([{ key: 'z' }, { key: 'z', ctrlKey: true }, { key: 'z', metaKey: true }])('dismisses the overlay and restores the complete action for %j, with grouped redo', (keys) => {
    let game!: ReturnType<typeof useGameProviderValue>;
    function Screen() {
      const value = useGameProviderValue(true);
      useEffect(() => {
        game = value;
      });
      const guidance = useGuidance();
      useEffect(() => attachGameKeyboardShortcuts(window, {
        canRoll: false,
        confirmReady: false,
        canUndo: value.canUndo,
        canRedo: value.canRedo,
        hasSelection: false,
        onRoll: () => {},
        onConfirm: () => {},
        onUndo: value.doUndo,
        onRedo: value.doRedo,
        onCancelSelection: () => {},
      }), [value.doUndo, value.doRedo, value.canUndo, value.canRedo]);
      return guidance ? <div data-testid="guidance-modal">Take back &amp; retry</div> : null;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    // eslint-disable-next-line testing-library/no-unnecessary-act -- real react-dom root
    act(() => root.render(<Screen />));
    try {
      act(() => game.startFromPosition(start()));
      act(() => game.doMoveSequence([{ from: 6, to: 3, dieIndex: 0 }, { from: 3, to: 2, dieIndex: 0 }], { concurrent: true }));
      act(() => game.moveAnimation!.onFinish());
      act(() => showGuidance({ kind: 'blunder', questionState: start(), myMoves: [], engineMoves: [], revealed: false, showMine: false, showEngine: false }));
      expect(container.querySelector('[data-testid="guidance-modal"]')).not.toBeNull();
      expect(game.moveLog).toHaveLength(2);
      const undo = new KeyboardEvent('keydown', { ...keys, bubbles: true, cancelable: true });
      act(() => document.body.dispatchEvent(undo));
      expect(undo.defaultPrevented).toBe(true);
      expect(getGuidance()).toBeNull();
      expect(container.querySelector('[data-testid="guidance-modal"]')).toBeNull();
      expect(game.state!.points).toEqual(start().points);
      expect(game.state!.remainingDice).toEqual([3, 1]);
      expect(game.moveLog).toHaveLength(0);
      expect(game.canUndo).toBe(false);
      expect(game.canRedo).toBe(true);
      act(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', bubbles: true })));
      expect(game.state!.points[2]!.count).toBe(1);
      expect(game.moveLog).toHaveLength(2);
      expect(game.canRedo).toBe(false);
    }
    finally {
      act(() => root.unmount());
      container.remove();
      clearGuidance();
    }
  });
});
