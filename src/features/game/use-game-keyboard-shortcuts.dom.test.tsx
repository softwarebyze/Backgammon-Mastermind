/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Pressable, View } from 'react-native-web';
import { attachGameKeyboardShortcuts } from '@/features/game/use-game-keyboard-shortcuts';

jest.mock('expo-router', () => ({
  useFocusEffect: () => {},
}));

/**
 * Real RN-web DOM: board points are `Pressable accessibilityRole="button"`,
 * which RN-web renders as `<button role="button">` and whose keydown handler
 * stops propagation at the React root. A bubble-phase window listener never
 * sees Space/Enter from a focused point — that's the bug QA hit on web.
 */
function mountBoard(handlers: { onPointPress: () => void; onConfirmButton: () => void }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  // Plain react-dom root (not Testing Library): act flushes the render.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  act(() => {
    root.render(
      <View>
        <View testID="board-view">
          <Pressable accessibilityRole="button" testID="point-8" onPress={handlers.onPointPress} />
        </View>
        <Pressable accessibilityRole="button" testID="confirm-move-button" onPress={handlers.onConfirmButton} />
      </View>,
    );
  });
  const byTestId = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement;
  return {
    point: byTestId('point-8'),
    confirmButton: byTestId('confirm-move-button'),
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function focus(el: HTMLElement) {
  act(() => el.focus());
}

function press(el: HTMLElement, key: ' ' | 'Enter') {
  const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    el.dispatchEvent(down);
    el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
  });
  return down;
}

function config(overrides: Partial<Parameters<typeof attachGameKeyboardShortcuts>[1]> = {}) {
  return {
    canRoll: false,
    confirmReady: true,
    canUndo: true,
    canRedo: false,
    hasSelection: false,
    onRoll: jest.fn(),
    onConfirm: jest.fn(),
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onCancelSelection: jest.fn(),
    ...overrides,
  };
}

describe('game keyboard shortcuts on RN-web DOM', () => {
  let board: ReturnType<typeof mountBoard>;
  let onPointPress: jest.Mock;
  let onConfirmButton: jest.Mock;
  let detach: (() => void) | undefined;

  beforeEach(() => {
    onPointPress = jest.fn();
    onConfirmButton = jest.fn();
    board = mountBoard({ onPointPress, onConfirmButton });
  });

  afterEach(() => {
    detach?.();
    detach = undefined;
    board.cleanup();
  });

  it('renders points the way the browser sees them', () => {
    expect(board.point.tagName).toBe('BUTTON');
    expect(board.point.getAttribute('role')).toBe('button');
    expect(board.point.closest('[data-testid="board-view"]')).not.toBeNull();
  });

  it('a window bubble listener never sees Space/Enter from an RN-web point', () => {
    const bubble = jest.fn();
    window.addEventListener('keydown', bubble);
    focus(board.point);
    press(board.point, 'Enter');
    window.removeEventListener('keydown', bubble);
    expect(bubble).not.toHaveBeenCalled();
  });

  it.each([' ', 'Enter'] as const)('confirms on %j with a board point focused, without pressing the point', (key) => {
    const cfg = config();
    detach = attachGameKeyboardShortcuts(window, cfg);
    focus(board.point);
    expect(document.activeElement).toBe(board.point);

    const down = press(board.point, key);

    expect(cfg.onConfirm).toHaveBeenCalledTimes(1);
    // Default prevented so the browser doesn't "click" the focused point.
    expect(down.defaultPrevented).toBe(true);
    expect(onPointPress).not.toHaveBeenCalled();
    expect(cfg.onRoll).not.toHaveBeenCalled();
  });

  it.each([' ', 'Enter'] as const)('leaves %j on the Confirm button to the button (no double-fire)', (key) => {
    const cfg = config();
    detach = attachGameKeyboardShortcuts(window, cfg);
    focus(board.confirmButton);

    const down = press(board.confirmButton, key);

    expect(cfg.onConfirm).not.toHaveBeenCalled();
    expect(down.defaultPrevented).toBe(false);
  });

  it('does not roll from a focused point when the bar is not up', () => {
    const cfg = config({ confirmReady: false, canRoll: true });
    detach = attachGameKeyboardShortcuts(window, cfg);
    focus(board.point);

    press(board.point, ' ');

    expect(cfg.onRoll).not.toHaveBeenCalled();
    expect(cfg.onConfirm).not.toHaveBeenCalled();
  });

  it('confirms from body focus and stops listening after cleanup', () => {
    const cfg = config();
    detach = attachGameKeyboardShortcuts(window, cfg);
    press(document.body, 'Enter');
    expect(cfg.onConfirm).toHaveBeenCalledTimes(1);

    detach();
    detach = undefined;
    press(document.body, 'Enter');
    expect(cfg.onConfirm).toHaveBeenCalledTimes(1);
  });
});
