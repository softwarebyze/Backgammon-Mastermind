import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export type CheckerPanHandlers = {
  onDragAttempt?: (from: number) => void;
  onDragStart?: (from: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
};

/** Pan a checker stack — one GestureDetector per hook instance (required on web). */
export function useCheckerPan(from: number, enabled: boolean, handlers: CheckerPanHandlers) {
  const { onDragAttempt, onDragStart, onDragMove, onDragEnd, onDragCancel } = handlers;
  return useMemo(() => {
    if (!enabled || !onDragStart || !onDragMove || !onDragEnd) {
      return Gesture.Pan().enabled(false);
    }
    return Gesture.Pan()
      .minDistance(10)
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
  }, [enabled, onDragAttempt, onDragStart, onDragMove, onDragEnd, onDragCancel, from]);
}
