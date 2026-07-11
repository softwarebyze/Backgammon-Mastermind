import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import { useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export type CheckerPanConfig = {
  onDragAttempt?: (from: number) => void;
  onDragStart?: (from: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (absoluteX: number, absoluteY: number) => void;
  onDragCancel?: () => void;
  overlay?: DragOverlayRefs;
};

/** Pan a checker stack — one GestureDetector per hook instance (required on web). */
export function useCheckerPan(from: number, enabled: boolean, config: CheckerPanConfig) {
  const configRef = useRef(config);
  configRef.current = config;
  const overlay = config.overlay;

  return useMemo(() => {
    if (!enabled || !config.onDragStart || !config.onDragMove || !config.onDragEnd) {
      return Gesture.Pan().enabled(false);
    }
    return Gesture.Pan()
      .minDistance(8)
      .onBegin(() => {
        const { onDragAttempt } = configRef.current;
        if (onDragAttempt) {
          runOnJS(onDragAttempt)(from);
        }
      })
      .onStart((e) => {
        runOnJS(configRef.current.onDragStart!)(from, e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => {
        'worklet';
        const o = configRef.current.overlay;
        if (o) {
          o.x.value = e.absoluteX - o.originLeft.value;
          o.y.value = e.absoluteY - o.originTop.value;
        }
        runOnJS(configRef.current.onDragMove!)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        runOnJS(configRef.current.onDragEnd!)(e.absoluteX, e.absoluteY);
      })
      .onFinalize((_e, success) => {
        if (!success && configRef.current.onDragCancel) {
          runOnJS(configRef.current.onDragCancel)();
        }
      });
  }, [enabled, from, overlay]);
}
