import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, View } from 'react-native';

/**
 * Stable pointer-capture target for GestureDetector on web.
 *
 * RNGH 3's web PointerEventManager calls setPointerCapture on event.target
 * and cancels the gesture on lostpointercapture. Gameplay and editor
 * Pressables use role="button" / "adjustable" and remount inner checkers
 * when a point becomes selected, so capture was landing on a node that
 * disappeared mid-drag. The pan then never reached onEnd, and the drop
 * never committed. This wrapper is the capture target; its children do
 * not receive pointer events. Native is unchanged.
 */
export function GestureHitTarget({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (Platform.OS !== 'web') {
    return children;
  }
  return (
    <View style={style} pointerEvents="box-only" collapsable={false}>
      {children}
    </View>
  );
}
