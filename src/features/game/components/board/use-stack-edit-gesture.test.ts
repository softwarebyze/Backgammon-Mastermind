import { renderHook } from '@testing-library/react-native';
import { useStackEditGesture } from './use-stack-edit-gesture';

jest.mock('react-native-reanimated', () => ({
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  useSharedValue: (value: number) => ({ value }),
}));

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => {
      const gesture: { handlers: Record<string, unknown>; [key: string]: unknown } = { handlers: {} };
      for (const name of ['enabled', 'minDistance', 'maxPointers'])
        gesture[name] = () => gesture;
      for (const name of ['onBegin', 'onUpdate', 'onTouchesUp', 'onEnd', 'onFinalize']) {
        gesture[name] = (callback: unknown) => {
          gesture.handlers[name] = callback;
          return gesture;
        };
      }
      return gesture;
    },
  },
}));

type Handlers = ReturnType<typeof useStackEditGesture>['handlers'];
type Begin = Parameters<NonNullable<Handlers['onBegin']>>[0];
type Touches = Parameters<NonNullable<Handlers['onTouchesUp']>>[0];
type Manager = Parameters<NonNullable<Handlers['onTouchesUp']>>[1];

it('uses the release coordinates for a fast drag that crosses a point in a single move', () => {
  const callbacks = { onStart: jest.fn(), onDelta: jest.fn(), onEnd: jest.fn(), onCancel: jest.fn(), onAdjust: jest.fn() };
  const { result } = renderHook(() => useStackEditGesture(6, 20, callbacks));
  result.current.handlers.onBegin!({ absoluteX: 100, absoluteY: 300 } as Begin);
  // RNGH web can retain the last in-bounds pan coordinates on a single jump.
  result.current.handlers.onTouchesUp!({ changedTouches: [{ absoluteX: 100, absoluteY: 100 }] } as Touches, {} as Manager);
  result.current.handlers.onEnd!({ absoluteX: 100, absoluteY: 300, translationY: 0 } as Begin, true);
  expect(callbacks.onEnd).toHaveBeenCalledWith(6, false, -10);
});

it('sends discrete checker changes, preserves a tap, and reports interruption', () => {
  const callbacks = { onStart: jest.fn(), onDelta: jest.fn(), onEnd: jest.fn(), onCancel: jest.fn(), onAdjust: jest.fn() };
  const { result } = renderHook(() => useStackEditGesture(13, 20, callbacks));
  result.current.handlers.onBegin!({ absoluteX: 100, absoluteY: 100 } as Begin);
  result.current.handlers.onUpdate!({ absoluteX: 100, absoluteY: 122 } as Begin);
  result.current.handlers.onUpdate!({ absoluteX: 100, absoluteY: 125 } as Begin);
  expect(callbacks.onDelta).toHaveBeenCalledTimes(1);
  expect(callbacks.onDelta).toHaveBeenCalledWith(13, 1);
  result.current.handlers.onEnd!({} as Begin, false);
  expect(callbacks.onEnd).not.toHaveBeenCalled();
  result.current.handlers.onFinalize!({} as Begin, false);
  expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  result.current.handlers.onBegin!({ absoluteX: 100, absoluteY: 100 } as Begin);
  result.current.handlers.onEnd!({} as Begin, true);
  expect(callbacks.onEnd).toHaveBeenLastCalledWith(13, true, 0);
});
