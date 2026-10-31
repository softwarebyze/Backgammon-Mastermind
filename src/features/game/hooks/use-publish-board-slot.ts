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

/** Smallest board share once the player strips are taken out of the slot. */
const MIN_STRIPPED_BOARD_SHARE = 120;

export type PublishBoardSlotOptions = {
  /** Game review strip is 68; Learn has no review strip. */
  reviewHeight?: number;
  /**
   * When set (Learn portrait), cap stacked coach copy so this much leftover
   * stays available for the live board.
   */
  minBoardHeight?: number;
  /**
   * Portrait game: the player strips sit inside the slot, hugging the board.
   * Report them with onTopLayout / onBottomLayout and they are taken out of
   * the board's share of the slot.
   */
  stripsInSlot?: boolean;
};

/**
 * Publish leftover board size from measured chrome + flex slot.
 * Uses the smaller of slot onLayout and window-minus-chrome so a non-shrinking
 * flex child cannot keep the board oversized when text grows.
 */
export function usePublishBoardSlot(options?: PublishBoardSlotOptions) {
  const reviewHeight = options?.reviewHeight ?? REVIEW_SLOT_HEIGHT;
  const minBoardHeight = options?.minBoardHeight ?? 0;
  const stripsInSlot = options?.stripsInSlot ?? false;
  const headerHeight = use(HeaderHeightContext) ?? 0;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const parts = useRef({ top: 0, bottom: 0, controls: 0, slotW: 0, slotH: 0 });
  const [controlsHeight, setControlsHeight] = useState(0);

  const publish = useCallback(() => {
    const { top, bottom, controls, slotW, slotH } = parts.current;
    const sideBySide = isLandscapeLayout(screenWidth, screenHeight);
    if (slotW <= 0 || (!sideBySide && top <= 0)) {
      return;
    }
    const fromChrome = leftoverBoardHeight({
      screenHeight,
      headerHeight,
      topChromeHeight: top + bottom,
      reviewHeight,
      controlsHeight: controls,
      bottomInset: insets.bottom,
      sideBySide,
      minHeight: minBoardHeight > 0 ? minBoardHeight : undefined,
    });
    // Huge text can make the strips fill the slot. Keep a floor so the board
    // shrinks to it (and the page scrolls) instead of keeping a stale size.
    const boardShare = stripsInSlot && !sideBySide ? Math.max(MIN_STRIPPED_BOARD_SHARE, slotH - top - bottom) : slotH;
    const height = slotH > 0 ? Math.min(boardShare, fromChrome) : fromChrome;
    setBoardSlotSize({ width: slotW, height });
  }, [screenWidth, screenHeight, headerHeight, insets.bottom, reviewHeight, minBoardHeight, stripsInSlot]);

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

  const onBottomLayout = useCallback((event: LayoutChangeEvent) => {
    parts.current.bottom = Math.round(event.nativeEvent.layout.height);
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

  return { onTopLayout, onBottomLayout, onControlsLayout, onSlotLayout, captionMaxHeight };
}
