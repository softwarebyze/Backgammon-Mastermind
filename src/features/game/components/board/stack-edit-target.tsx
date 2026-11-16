import type { ReactElement } from 'react';
import type { StackEditHandlers } from './use-stack-edit-gesture';
import { useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useStackEditGesture } from './use-stack-edit-gesture';

/** Only setup boards allocate edit gestures; gameplay keeps its existing path. */
export function StackEditTarget({ point, checkerSize, editor, children }: {
  point: number;
  checkerSize: number;
  editor: StackEditHandlers;
  children: ReactElement;
}) {
  const gesture = useStackEditGesture(point, Math.max(12, checkerSize * 0.75), editor);
  // Android's native ScrollView can intercept a Manual gesture even while it
  // is active. A simultaneous native handler owns that touch from DOWN and
  // disallows interception until UP, without toggling scrollEnabled mid-touch.
  const exclusiveTouch = useMemo(() => Gesture.Simultaneous(
    gesture,
    Gesture.Native().shouldActivateOnStart(true).disallowInterruption(true).shouldCancelWhenOutside(false),
  ), [gesture]);
  return <GestureDetector gesture={exclusiveTouch} touchAction="none">{children}</GestureDetector>;
}
