import type { Insets } from 'react-native';
import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export type CheckerPanConfig = {
  onDragAttempt?: (from: number) => void;
  onDragStart?: (from: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
  /** Extra touch margin beyond the stack bounds (helps single-checker grabs). */
  hitSlop?: number | Insets;
};

/** Pan a checker stack — one GestureDetector per hook instance (required on web). */
export function useCheckerPan(from: number, enabled: boolean, config: CheckerPanConfig) {
  const { onDragAttempt, onDragStart, onDragMove, onDragEnd, onDragCancel, hitSlop } = config;
  return useMemo(() => {
    if (!enabled || !onDragStart || !onDragMove || !onDragEnd) {
      return Gesture.Pan().enabled(false);
    }
    const pan = Gesture.Pan()
      .minDistance(8)
      .onBegin(() => {
        if (onDragAttempt) {
          runOnJS(onDragAttempt)(from);
        }
      })
      .onStart((e) => {
        runOnJS(onDragStart)(from, e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => {
        runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        runOnJS(onDragEnd)(e.absoluteX, e.absoluteY);
      })
      .onFinalize((_e, success) => {
        if (!success && onDragCancel) {
          runOnJS(onDragCancel)();
        }
      });
    if (hitSlop !== undefined) {
      pan.hitSlop(hitSlop);
    }
    return pan;
  }, [enabled, hitSlop, onDragAttempt, onDragStart, onDragMove, onDragEnd, onDragCancel, from]);
}
