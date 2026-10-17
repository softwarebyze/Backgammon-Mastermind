import type { CSSAnimationProperties } from 'react-native-reanimated';
import { cubicBezier, useReducedMotion } from 'react-native-reanimated';

/**
 * Strong ease-out for anything entering the screen. It moves fast at the
 * start, so the element feels like it answered the tap, and settles gently.
 */
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/**
 * - `backdrop`: the dimmed layer behind a dialog. Opacity only.
 * - `dialog`: a centered dialog. Grows from 96% (never from 0), centered.
 * - `card`: an inline card that replaces a button. Rises 6px into place.
 */
type Entrance = 'backdrop' | 'dialog' | 'card';

const SPECS: Record<Entrance, { durationMs: number; scale?: number; translateY?: number }> = {
  backdrop: { durationMs: 200 },
  dialog: { durationMs: 220, scale: 0.96 },
  card: { durationMs: 180, translateY: 6 },
};

function buildEntrance(kind: Entrance, reducedMotion: boolean): CSSAnimationProperties {
  const spec = SPECS[kind];
  // Reduced motion keeps the fade, which still explains that something
  // appeared, and drops the movement.
  const moves = !reducedMotion && (spec.scale !== undefined || spec.translateY !== undefined);
  const fromTransform = spec.scale !== undefined
    ? [{ scale: spec.scale }]
    : [{ translateY: spec.translateY ?? 0 }];
  const toTransform = spec.scale !== undefined ? [{ scale: 1 }] : [{ translateY: 0 }];
  return {
    animationName: moves
      ? {
          from: { opacity: 0, transform: fromTransform },
          to: { opacity: 1, transform: toTransform },
        }
      : { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: `${spec.durationMs}ms`,
    animationTimingFunction: EASE_OUT,
  };
}

// Built once so a re-render never hands Reanimated a new keyframes object.
const ENTRANCES = {
  backdrop: [buildEntrance('backdrop', false), buildEntrance('backdrop', true)],
  dialog: [buildEntrance('dialog', false), buildEntrance('dialog', true)],
  card: [buildEntrance('card', false), buildEntrance('card', true)],
} as const;

/** Mount animation for `kind`, as Reanimated CSS animation style props. */
export function entranceAnimation(kind: Entrance, reducedMotion: boolean): CSSAnimationProperties {
  return ENTRANCES[kind][reducedMotion ? 1 : 0];
}

/** `entranceAnimation` that follows the system Reduce Motion setting. */
export function useEntranceAnimation(kind: Entrance): CSSAnimationProperties {
  return entranceAnimation(kind, useReducedMotion());
}
