import { renderHook } from '@testing-library/react-native';
import { useColumnTapGesture } from './use-checker-pan';

jest.mock('react-native-reanimated', () => ({ runOnJS: (callback: () => void) => callback }));
jest.mock('react-native-gesture-handler', () => ({ Gesture: { Tap: () => {
  const gesture: { handlers: Record<string, unknown>; [key: string]: unknown } = { handlers: {} };
  gesture.enabled = () => gesture;
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
