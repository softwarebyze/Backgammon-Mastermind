import type { ReactElement } from 'react';
import type { StackEditHandlers } from './use-stack-edit-gesture';
import { GestureDetector } from 'react-native-gesture-handler';
import { useStackEditGesture } from './use-stack-edit-gesture';

/** Only setup boards allocate edit gestures; gameplay keeps its existing path. */
export function StackEditTarget({ point, checkerSize, editor, children }: {
  point: number;
  checkerSize: number;
  editor: StackEditHandlers;
  children: ReactElement;
}) {
  const gesture = useStackEditGesture(point, Math.max(12, checkerSize * 0.75), editor);
  return <GestureDetector gesture={gesture} touchAction="none">{children}</GestureDetector>;
}
