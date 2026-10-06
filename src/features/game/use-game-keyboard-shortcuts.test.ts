import {
  rollBlockedByFocus,
  shortcutFor,
  shortcutSuppressedByFocus,
  shouldIgnoreShortcutKeydown,
} from '@/features/game/use-game-keyboard-shortcuts';

jest.mock('expo-router', () => ({
  useFocusEffect: () => {},
}));

function key(
  k: string,
  mods: Partial<{
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    repeat: boolean;
  }> = {},
) {
  return {
    key: k,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    ...mods,
  };
}

describe('game keyboard shortcuts', () => {
  it('rolls on R, Space, and Enter when not awaiting confirm', () => {
    expect(shortcutFor(key('r'))).toBe('roll');
    expect(shortcutFor(key('R'))).toBe('roll');
    expect(shortcutFor(key(' '))).toBe('roll');
    expect(shortcutFor(key('Enter'))).toBe('roll');
  });

  it('maps Space and Enter to confirm while awaiting confirm, but keeps R as roll', () => {
    expect(shortcutFor(key(' '), { awaitingConfirm: true })).toBe('confirm');
    expect(shortcutFor(key('Enter'), { awaitingConfirm: true })).toBe('confirm');
    expect(shortcutFor(key('r'), { awaitingConfirm: true })).toBe('roll');
    expect(shortcutFor(key(' '), { awaitingConfirm: false })).toBe('roll');
    expect(shortcutFor(key('Enter'), { awaitingConfirm: false })).toBe('roll');
  });

  it('undoes on Z / ⌘Z / Ctrl+Z and redoes on Y / ⇧⌘Z', () => {
    expect(shortcutFor(key('z'))).toBe('undo');
    expect(shortcutFor(key('z', { metaKey: true }))).toBe('undo');
    expect(shortcutFor(key('z', { ctrlKey: true }))).toBe('undo');
    expect(shortcutFor(key('z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(shortcutFor(key('y'))).toBe('redo');
  });

  it('cancels on Escape and ignores browser chords', () => {
    expect(shortcutFor(key('Escape'))).toBe('cancel');
    expect(shortcutFor(key('r', { metaKey: true }))).toBeNull(); // ⌘R = reload
    expect(shortcutFor(key('r', { altKey: true }))).toBeNull();
    expect(shortcutFor(key('q'))).toBeNull();
  });

  it('leaves Alt chords alone, including modifier-Z', () => {
    expect(shortcutFor(key('z', { metaKey: true, altKey: true }))).toBeNull();
    expect(shortcutFor(key('z', { ctrlKey: true, altKey: true }))).toBeNull();
    expect(shortcutFor(key('z', { metaKey: true, shiftKey: true, altKey: true }))).toBeNull();
  });

  it('does not steal Space or Enter from a focused button', () => {
    expect(rollBlockedByFocus(null)).toBe(false);
    expect(rollBlockedByFocus({ closest: () => null })).toBe(false);
    expect(rollBlockedByFocus({ closest: () => ({}) })).toBe(true);
  });

  it('confirms on Enter even when focus stayed on Live', () => {
    const liveButton = {
      closest: (selector: string) => selector.includes('role="button"') ? {} : null,
    };
    expect(shortcutSuppressedByFocus('confirm', key('Enter'), liveButton)).toBe(false);
    expect(shortcutSuppressedByFocus('confirm', key(' '), liveButton)).toBe(true);
    expect(shortcutSuppressedByFocus('roll', key('Enter'), liveButton)).toBe(true);
    expect(shortcutSuppressedByFocus('confirm', key('Enter'), null)).toBe(false);
  });

  it('leaves Enter to a focused dialog button', () => {
    const dialogButton = {
      closest: (selector: string) => (
        selector.includes('role="button"') || selector.includes('role="alert"') ? {} : null
      ),
    };
    expect(shortcutSuppressedByFocus('confirm', key('Enter'), dialogButton)).toBe(true);
  });

  it('ignores key repeat and already-handled events', () => {
    expect(shouldIgnoreShortcutKeydown({
      defaultPrevented: false,
      repeat: true,
      target: null,
    })).toBe(true);
    expect(shouldIgnoreShortcutKeydown({
      defaultPrevented: true,
      repeat: false,
      target: null,
    })).toBe(true);
    expect(shouldIgnoreShortcutKeydown({
      defaultPrevented: false,
      repeat: false,
      target: null,
    })).toBe(false);
  });

  it('ignores keydowns while a text field is focused', () => {
    expect(shouldIgnoreShortcutKeydown({
      defaultPrevented: false,
      repeat: false,
      target: { tagName: 'INPUT' },
    })).toBe(true);
    expect(shouldIgnoreShortcutKeydown({
      defaultPrevented: false,
      repeat: false,
      target: { tagName: 'TEXTAREA' },
    })).toBe(true);
    expect(shouldIgnoreShortcutKeydown({
      defaultPrevented: false,
      repeat: false,
      target: { tagName: 'DIV' },
    })).toBe(false);
  });
});
