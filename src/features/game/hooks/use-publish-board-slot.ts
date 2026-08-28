import type { LayoutChangeEvent } from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { use, useCallback, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clearBoardSlotSize, setBoardSlotSize } from '@/features/game/hooks/board-slot-size';
import { leftoverBoardHeight } from '@/features/game/hooks/use-board-dimensions';

/**
 * Publish leftover board size from measured chrome + flex slot.
 * Uses the smaller of slot onLayout and window-minus-chrome so a non-shrinking
 * flex child cannot keep the board oversized when text grows.
 */
export function usePublishBoardSlot() {
  const headerHeight = use(HeaderHeightContext) ?? 0;
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const parts = useRef({ top: 0, controls: 0, slotW: 0, slotH: 0 });

  const publish = useCallback(() => {
    const { top, controls, slotW, slotH } = parts.current;
    if (slotW <= 0 || top <= 0) {
      return;
    }
    const fromChrome = leftoverBoardHeight({
      screenHeight,
      headerHeight,
      topChromeHeight: top,
      controlsHeight: controls,
      bottomInset: insets.bottom,
    });
    const height = slotH > 0 ? Math.min(slotH, fromChrome) : fromChrome;
    setBoardSlotSize({ width: slotW, height });
  }, [screenHeight, headerHeight, insets.bottom]);

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
    parts.current.controls = Math.round(event.nativeEvent.layout.height);
    publish();
  }, [publish]);

  const onSlotLayout = useCallback((event: LayoutChangeEvent) => {
    parts.current.slotW = Math.round(event.nativeEvent.layout.width);
    parts.current.slotH = Math.round(event.nativeEvent.layout.height);
    publish();
  }, [publish]);

  return { onTopLayout, onControlsLayout, onSlotLayout };
}
