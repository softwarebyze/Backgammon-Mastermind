/* eslint-disable react-compiler/react-compiler -- Reanimated shared-value writes on UI thread */
import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import { useCallback, useMemo, useRef } from 'react';
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
  const attemptRef = useRef(config.onDragAttempt);
  const startRef = useRef(config.onDragStart);
  const moveRef = useRef(config.onDragMove);
  const endRef = useRef(config.onDragEnd);
  const cancelRef = useRef(config.onDragCancel);
  attemptRef.current = config.onDragAttempt;
  startRef.current = config.onDragStart;
  moveRef.current = config.onDragMove;
  endRef.current = config.onDragEnd;
  cancelRef.current = config.onDragCancel;

  const invokeAttempt = useCallback(() => {
    attemptRef.current?.(from);
  }, [from]);
  const invokeStart = useCallback((absoluteX: number, absoluteY: number) => {
    startRef.current?.(from, absoluteX, absoluteY);
  }, [from]);
  const invokeMove = useCallback((absoluteX: number, absoluteY: number) => {
    moveRef.current?.(absoluteX, absoluteY);
  }, []);
  const invokeEnd = useCallback((absoluteX: number, absoluteY: number) => {
    endRef.current?.(absoluteX, absoluteY);
  }, []);
  const invokeCancel = useCallback(() => {
    cancelRef.current?.();
  }, []);

  const overlayX = config.overlay?.x;
  const overlayY = config.overlay?.y;
  const overlayOriginLeft = config.overlay?.originLeft;
  const overlayOriginTop = config.overlay?.originTop;
  // ponytail: never read *.current inside useMemo — refs in that closure get serialized to the UI thread.
  const panEnabled = enabled
    && !!config.onDragStart
    && !!config.onDragMove
    && !!config.onDragEnd;

  return useMemo(() => {
    if (!panEnabled) {
      return Gesture.Pan().enabled(false);
    }
    return Gesture.Pan()
      .minDistance(8)
      .onBegin(() => {
        runOnJS(invokeAttempt)();
      })
      .onStart((e) => {
        runOnJS(invokeStart)(e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => {
        'worklet';
        if (overlayX && overlayY && overlayOriginLeft && overlayOriginTop) {
          overlayX.value = e.absoluteX - overlayOriginLeft.value;
          overlayY.value = e.absoluteY - overlayOriginTop.value;
        }
        runOnJS(invokeMove)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        runOnJS(invokeEnd)(e.absoluteX, e.absoluteY);
      })
      .onFinalize((_e, success) => {
        if (!success) {
          runOnJS(invokeCancel)();
        }
      });
  }, [panEnabled, invokeAttempt, invokeCancel, invokeEnd, invokeMove, invokeStart, overlayOriginLeft, overlayOriginTop, overlayX, overlayY]);
}

/** Tap that coexists with pan — pan wins once minDistance is exceeded. */
export type ColumnTapHandlers = {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
};

export function useColumnTapGesture(enabled: boolean, handlers: ColumnTapHandlers) {
  const pressRef = useRef(handlers.onPress);
  const pressInRef = useRef(handlers.onPressIn);
  const pressOutRef = useRef(handlers.onPressOut);
  pressRef.current = handlers.onPress;
  pressInRef.current = handlers.onPressIn;
  pressOutRef.current = handlers.onPressOut;

  const invokePress = useCallback(() => {
    pressRef.current();
  }, []);
  const invokePressIn = useCallback(() => {
    pressInRef.current?.();
  }, []);
  const invokePressOut = useCallback(() => {
    pressOutRef.current?.();
  }, []);

  return useMemo(() => {
    if (!enabled) {
      return Gesture.Tap().enabled(false);
    }
    return Gesture.Tap()
      .onBegin(() => {
        runOnJS(invokePressIn)();
      })
      .onEnd(() => {
        runOnJS(invokePress)();
      })
      .onFinalize(() => {
        runOnJS(invokePressOut)();
      });
  }, [enabled, invokePress, invokePressIn, invokePressOut]);
}

export function composeColumnGestures(pan: ReturnType<typeof useCheckerPan>, tap: ReturnType<typeof useColumnTapGesture>) {
  return Gesture.Exclusive(pan, tap);
}
