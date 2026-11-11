import { entranceAnimation } from './motion';

type Frame = { opacity: number; transform?: Record<string, number>[] };

function keyframes(kind: Parameters<typeof entranceAnimation>[0], reduced: boolean) {
  const style = entranceAnimation(kind, reduced);
  const frames = style.animationName as { from: Frame; to: Frame };
  return { style, from: frames.from, to: frames.to };
}

const KINDS = ['backdrop', 'dialog', 'card'] as const;

describe('entranceAnimation', () => {
  it.each(KINDS)('%s stays under the 300ms UI budget and eases out', (kind) => {
    const { style } = keyframes(kind, false);
    expect(Number.parseInt(String(style.animationDuration), 10)).toBeLessThanOrEqual(300);
    expect(style.animationTimingFunction).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
  });

  it('dialog grows from 96%, never from nothing', () => {
    const { from, to } = keyframes('dialog', false);
    expect(from).toEqual({ opacity: 0, transform: [{ scale: 0.96 }] });
    expect(to).toEqual({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it('card rises 6px into place', () => {
    const { from, to } = keyframes('card', false);
    expect(from).toEqual({ opacity: 0, transform: [{ translateY: 6 }] });
    expect(to).toEqual({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it.each(KINDS)('%s keeps the fade but drops movement under Reduce Motion', (kind) => {
    const { from, to } = keyframes(kind, true);
    expect(from).toEqual({ opacity: 0 });
    expect(to).toEqual({ opacity: 1 });
  });

  it('returns the same object every time so re-renders do not restart it', () => {
    expect(entranceAnimation('dialog', false)).toBe(entranceAnimation('dialog', false));
    expect(entranceAnimation('dialog', true)).toBe(entranceAnimation('dialog', true));
  });
});
