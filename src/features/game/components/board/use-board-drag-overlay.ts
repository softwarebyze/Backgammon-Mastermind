/* eslint-disable react-hooks/immutability -- Reanimated shared-value writes */
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { DragOverlayRefs } from '@/features/game/components/board/use-drag-overlay';
import { useCallback, useMemo, useRef } from 'react';

import { useSharedValue } from 'react-native-reanimated';

type DragCallbacks = {
  onDragStart?: (from: number, boardX: number, boardY: number) => void;
  onDragMove?: (boardX: number, boardY: number) => void;
  onDragEnd?: (boardX: number, boardY: number) => void;
  onDragCancel?: () => void;
};

/** Owns UI-thread overlay position + board-local drag coordinate conversion. */
export function useBoardDragOverlay(
  surfaceRef: RefObject<View | null>,
  callbacks: DragCallbacks,
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const surfaceOrigin = useRef({ left: 0, top: 0 });

  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);
  const overlayOriginLeft = useSharedValue(0);
  const overlayOriginTop = useSharedValue(0);

  const overlay = useMemo<DragOverlayRefs>(
    () => ({
      x: overlayX,
      y: overlayY,
      originLeft: overlayOriginLeft,
      originTop: overlayOriginTop,
    }),
    [overlayX, overlayY, overlayOriginLeft, overlayOriginTop],
  );

  const syncOrigin = useCallback((left: number, top: number) => {
    surfaceOrigin.current = { left, top };
    overlayOriginLeft.value = left;
    overlayOriginTop.value = top;
  }, [overlayOriginLeft, overlayOriginTop]);

  const measureSurface = useCallback(() => {
    surfaceRef.current?.measureInWindow((left, top) => {
      syncOrigin(left, top);
    });
  }, [surfaceRef, syncOrigin]);

  const handleDragStartAbs = useCallback((from: number, absoluteX: number, absoluteY: number) => {
    surfaceRef.current?.measureInWindow((left, top) => {
      syncOrigin(left, top);
      overlayX.value = absoluteX - left;
      overlayY.value = absoluteY - top;
      callbacksRef.current.onDragStart?.(from, absoluteX - left, absoluteY - top);
    });
  }, [surfaceRef, syncOrigin, overlayX, overlayY]);

  const handleDragMoveAbs = useCallback((absoluteX: number, absoluteY: number) => {
    const { left, top } = surfaceOrigin.current;
    callbacksRef.current.onDragMove?.(absoluteX - left, absoluteY - top);
  }, []);

  const handleDragEndAbs = useCallback((absoluteX: number, absoluteY: number) => {
    const { left, top } = surfaceOrigin.current;
    callbacksRef.current.onDragEnd?.(absoluteX - left, absoluteY - top);
  }, []);

  const handleDragCancel = useCallback(() => {
    callbacksRef.current.onDragCancel?.();
  }, []);

  return {
    overlay,
    measureSurface,
    handleDragStartAbs,
    handleDragMoveAbs,
    handleDragEndAbs,
    handleDragCancel,
  };
}
