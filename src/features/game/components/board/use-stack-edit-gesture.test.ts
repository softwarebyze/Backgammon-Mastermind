import { renderHook } from '@testing-library/react-native';
import { useStackEditGesture } from './use-stack-edit-gesture';

jest.mock('react-native-reanimated', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- module mock retains the library API
  useSharedValue: (value: number) => ({ value }),
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
}));
jest.mock('react-native-gesture-handler', () => ({ Gesture: { Manual: () => {
  const gesture: { handlers: Record<string, unknown>; [key: string]: unknown } = { handlers: {} };
  for (const name of ['enabled', 'shouldCancelWhenOutside'])
    gesture[name] = () => gesture;
  for (const name of ['onTouchesDown', 'onTouchesMove', 'onTouchesUp', 'onEnd', 'onFinalize']) {
    gesture[name] = (callback: unknown) => {
      gesture.handlers[name] = callback;
      return gesture;
    };
  }
  return gesture;
} } }));

type Handlers = ReturnType<typeof useStackEditGesture>['handlers'];
type Touches = Parameters<NonNullable<Handlers['onTouchesDown']>>[0];
type Manager = Parameters<NonNullable<Handlers['onTouchesDown']>>[1];
type End = Parameters<NonNullable<Handlers['onEnd']>>[0];
const callbacks = () => ({ onStart: jest.fn(), onDelta: jest.fn(), onEnd: jest.fn(), onCancel: jest.fn(), onAdjust: jest.fn() });
const touch = (absoluteY: number, y = 27) => ({ numberOfTouches: 1, changedTouches: [{ absoluteX: 100, absoluteY, y }] }) as Touches;
const manager = () => ({ activate: jest.fn(), end: jest.fn(), fail: jest.fn() });

it('activates immediately and commits a stationary native tap instead of cancelling its placement', () => {
  const cb = callbacks();
  const state = manager();
  const { result } = renderHook(() => useStackEditGesture(6, 20, cb));
  result.current.handlers.onTouchesDown!(touch(300), state as unknown as Manager);
  expect(state.activate).toHaveBeenCalledTimes(1);
  expect(cb.onStart).toHaveBeenCalledWith(6, 27);
  result.current.handlers.onTouchesUp!(touch(300), state as unknown as Manager);
  expect(state.end).toHaveBeenCalledTimes(1);
  result.current.handlers.onEnd!({} as End, true);
  result.current.handlers.onFinalize!({} as End, true);
  expect(cb.onEnd).toHaveBeenCalledWith(6, true, 0);
  expect(cb.onCancel).not.toHaveBeenCalled();
});

it('uses final touch coordinates for a fast drag crossing a point in one move', () => {
  const cb = callbacks();
  const state = manager();
  const { result } = renderHook(() => useStackEditGesture(6, 20, cb));
  result.current.handlers.onTouchesDown!(touch(300), state as unknown as Manager);
  result.current.handlers.onTouchesUp!(touch(100), state as unknown as Manager);
  result.current.handlers.onEnd!({} as End, true);
  expect(cb.onEnd).toHaveBeenCalledWith(6, false, -10);
});

it('quantizes moves and restores an interrupted or multi-touch stroke', () => {
  const cb = callbacks();
  const state = manager();
  const { result } = renderHook(() => useStackEditGesture(13, 20, cb));
  result.current.handlers.onTouchesDown!(touch(100), state as unknown as Manager);
  result.current.handlers.onTouchesMove!(touch(122), state as unknown as Manager);
  result.current.handlers.onTouchesMove!(touch(125), state as unknown as Manager);
  expect(cb.onDelta).toHaveBeenCalledTimes(1);
  expect(cb.onDelta).toHaveBeenCalledWith(13, 1);
  result.current.handlers.onTouchesDown!({ numberOfTouches: 2 } as Touches, state as unknown as Manager);
  expect(state.fail).toHaveBeenCalledTimes(1);
  result.current.handlers.onEnd!({} as End, false);
  result.current.handlers.onFinalize!({} as End, false);
  expect(cb.onEnd).not.toHaveBeenCalled();
  expect(cb.onCancel).toHaveBeenCalledTimes(1);
});
