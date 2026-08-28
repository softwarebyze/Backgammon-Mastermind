import type { LayoutChangeEvent } from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clearBoardSlotSize, setBoardSlotSize } from '@/features/game/hooks/board-slot-size';
import {
  learnCaptionMaxHeight,
  leftoverBoardHeight,
  REVIEW_SLOT_HEIGHT,
} from '@/features/game/hooks/use-board-dimensions';
import { isLandscapeLayout } from '@/lib/ui/game-chrome';

export type PublishBoardSlotOptions = {
  /** Game review strip is 68; Learn has no review strip. */
  reviewHeight?: number;
  /**
   * When set (Learn portrait), cap stacked coach copy so this much leftover
   * stays available for the live board.
   */
  minBoardHeight?: number;
};

/**
 * Publish leftover board size from measured chrome + flex slot.
 * Uses the smaller of slot onLayout and window-minus-chrome so a non-shrinking
 * flex child cannot keep the board oversized when text grows.
 */
export function usePublishBoardSlot(options?: PublishBoardSlotOptions) {
  const reviewHeight = options?.reviewHeight ?? REVIEW_SLOT_HEIGHT;
  const minBoardHeight = options?.minBoardHeight ?? 0;
  const headerHeight = use(HeaderHeightContext) ?? 0;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const parts = useRef({ top: 0, controls: 0, slotW: 0, slotH: 0 });
  const [controlsHeight, setControlsHeight] = useState(0);

  const publish = useCallback(() => {
    const { top, controls, slotW, slotH } = parts.current;
    const sideBySide = isLandscapeLayout(screenWidth, screenHeight);
    if (slotW <= 0 || (!sideBySide && top <= 0)) {
      return;
    }
    const fromChrome = leftoverBoardHeight({
      screenHeight,
      headerHeight,
      topChromeHeight: top,
      reviewHeight,
      controlsHeight: controls,
      bottomInset: insets.bottom,
      sideBySide,
      minHeight: minBoardHeight > 0 ? minBoardHeight : undefined,
    });
    const height = slotH > 0 ? Math.min(slotH, fromChrome) : fromChrome;
    setBoardSlotSize({ width: slotW, height });
  }, [screenWidth, screenHeight, headerHeight, insets.bottom, reviewHeight, minBoardHeight]);

  useEffect(() => {
    publish();
  }, [publish]);

  useEffect(() => () => {
    clearBoardSlotSize();
  }, []);

  const onTopLayout = useCallback((event: LayoutChangeEvent) => {
    parts.current.top = Math.round(event.nativeEvent.layout.height);
    publish();
  }, [publish]);

  const onControlsLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    parts.current.controls = next;
    setControlsHeight(current => (current === next ? current : next));
    publish();
  }, [publish]);

  const onSlotLayout = useCallback((event: LayoutChangeEvent) => {
    parts.current.slotW = Math.round(event.nativeEvent.layout.width);
    parts.current.slotH = Math.round(event.nativeEvent.layout.height);
    publish();
  }, [publish]);

  const captionMaxHeight = useMemo(() => {
    if (minBoardHeight <= 0 || isLandscapeLayout(screenWidth, screenHeight)) {
      return undefined;
    }
    return learnCaptionMaxHeight({
      screenHeight,
      headerHeight,
      footerHeight: controlsHeight,
      bottomInset: insets.bottom,
      minBoardHeight,
    });
  }, [minBoardHeight, screenWidth, screenHeight, headerHeight, controlsHeight, insets.bottom]);

  return { onTopLayout, onControlsLayout, onSlotLayout, captionMaxHeight };
}
