import type { ViewStyle } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  gameStageMaxWidth,
  isDesktopLayout,
  isLandscapeLayout,
  landscapeChromeColumnWidth,
} from '@/lib/ui/game-chrome';

export type EdgePaddingInsets = {
  left: number;
  right: number;
  bottom: number;
};

/**
 * Content padding below a native header. Header owns the top inset; this
 * covers the landscape notch / home-indicator (left, right, bottom).
 */
export function contentEdgePadding(
  insets: EdgePaddingInsets,
  extra: { left?: number; right?: number; bottom?: number } = {},
): ViewStyle {
  return {
    paddingLeft: insets.left + (extra.left ?? 0),
    paddingRight: insets.right + (extra.right ?? 0),
    paddingBottom: insets.bottom + (extra.bottom ?? 0),
  };
}

/** Window width minus landscape left/right safe-area insets. */
export function innerLayoutWidth(
  screenWidth: number,
  leftInset: number,
  rightInset: number,
): number {
  return Math.max(0, Math.round(screenWidth - leftInset - rightInset));
}

/**
 * Shared breakpoint + inset metrics for game, Learn, home, and settings.
 * Prefer this over one-off `width > height` checks and bottom-only insets.
 */
export function useLayoutMetrics() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = isLandscapeLayout(width, height);
  const desktop = isDesktopLayout(width);
  const innerWidth = innerLayoutWidth(width, insets.left, insets.right);

  return {
    width,
    height,
    insets,
    landscape,
    desktop,
    innerWidth,
    chromeWidth: landscapeChromeColumnWidth(innerWidth),
    stageMaxWidth: landscape ? gameStageMaxWidth(innerWidth) : undefined,
    contentInsets: contentEdgePadding(insets),
  };
}
