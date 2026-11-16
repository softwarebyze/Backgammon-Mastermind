import { renderHook } from '@testing-library/react-native';
import { useColumnTapGesture } from './use-checker-pan';

jest.mock('react-native-reanimated', () => ({ runOnJS: (callback: () => void) => callback }));
jest.mock('react-native-gesture-handler', () => ({ Gesture: { Tap: () => {
  const gesture: { handlers: Record<string, unknown>; maxDurationMs?: number; [key: string]: unknown } = { handlers: {} };
  gesture.enabled = () => gesture;
  gesture.maxDuration = (ms: number) => {
    gesture.maxDurationMs = ms;
    return gesture;
  };
  for (const name of ['onBegin', 'onEnd', 'onFinalize']) {
    gesture[name] = (callback: unknown) => {
      gesture.handlers[name] = callback;
      return gesture;
    };
  }
  return gesture;
} } }));

it.each([false, true])('only successful taps invoke a move (success: %s)', (success) => {
  const onPress = jest.fn();
  const onPressOut = jest.fn();
  const { result } = renderHook(() => useColumnTapGesture(true, { onPress, onPressOut }));
  result.current.handlers.onEnd!({} as never, success);
  result.current.handlers.onFinalize!({} as never, success);
  expect(onPress).toHaveBeenCalledTimes(success ? 1 : 0);
  expect(onPressOut).toHaveBeenCalledTimes(1);
});

it('keeps a long press as a tap (maxDuration well above RNGH\'s 500ms default)', () => {
  const onPress = jest.fn();
  const { result } = renderHook(() => useColumnTapGesture(true, { onPress }));
  const gesture = result.current as typeof result.current & {
    maxDurationMs?: number;
    handlers: { onEnd?: (event: never, success: boolean) => void };
  };
  expect(gesture.maxDurationMs).toBe(10_000);
  // A press held past 500ms still succeeds once the recognizer allows it.
  gesture.handlers.onEnd!({} as never, true);
  expect(onPress).toHaveBeenCalledTimes(1);
});
