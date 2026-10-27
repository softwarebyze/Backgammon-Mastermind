import { useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

export type StackEditHandlers = {
  onStart: (point: number, localY: number) => void;
  onDelta: (point: number, steps: number) => void;
  onEnd: (point: number, tap: boolean, steps?: number) => void;
  onCancel: () => void;
  onAdjust: (point: number, delta: number) => void;
};

/** Quantize on the UI thread: React only updates when a checker count changes. */
export function useStackEditGesture(point: number, step: number, handlers?: StackEditHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;
  const quantum = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const finalX = useSharedValue(0);
  const finalY = useSharedValue(0);
  const callbacks = useMemo(() => ({
    start: (y: number) => latest.current?.onStart(point, y),
    move: (value: number) => latest.current?.onDelta(point, value),
    end: (tap: boolean, steps: number) => latest.current?.onEnd(point, tap, steps),
    cancel: () => latest.current?.onCancel(),
  }), [point]);
  const enabled = !!handlers;
  return useMemo(() => Gesture.Pan()
    .enabled(enabled)
    .minDistance(0)
    .maxPointers(1)
    .onBegin((event) => {
      quantum.value = 0;
      originX.value = event.absoluteX;
      originY.value = event.absoluteY;
      finalX.value = event.absoluteX;
      finalY.value = event.absoluteY;
      runOnJS(callbacks.start)(event.y);
    })
    .onUpdate((event) => {
      finalX.value = event.absoluteX;
      finalY.value = event.absoluteY;
      const value = Math.trunc((event.absoluteY - originY.value) / step);
      if (value !== quantum.value) {
        quantum.value = value;
        runOnJS(callbacks.move)(value);
      }
    })
    .onTouchesUp((event) => {
      const touch = event.changedTouches[0];
      if (touch) {
        finalX.value = touch.absoluteX;
        finalY.value = touch.absoluteY;
      }
    })
    .onEnd((_event, success) => {
      if (!success)
        return;
      const dy = finalY.value - originY.value;
      const dx = finalX.value - originX.value;
      runOnJS(callbacks.end)(Math.abs(dy) < 5 && Math.abs(dx) < 5, Math.trunc(dy / step));
    })
    .onFinalize((_event, success) => {
      if (!success)
        runOnJS(callbacks.cancel)();
    }), [enabled, step, callbacks, quantum, originX, originY, finalX, finalY]);
}
