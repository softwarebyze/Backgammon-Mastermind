import { shortcutFor } from '@/features/game/use-game-keyboard-shortcuts';

function key(k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) {
  return {
    key: k,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  };
}

describe('game keyboard shortcuts', () => {
  it('rolls on R, Space, and Enter', () => {
    expect(shortcutFor(key('r'))).toBe('roll');
    expect(shortcutFor(key('R'))).toBe('roll');
    expect(shortcutFor(key(' '))).toBe('roll');
    expect(shortcutFor(key('Enter'))).toBe('roll');
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
});
