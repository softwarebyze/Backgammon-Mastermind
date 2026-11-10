import { act, renderHook } from '@testing-library/react-native';

import { playTimerSfx } from './timer-sfx';
import { advanceTimer, changeTimerControl, resetTimerStoreForTests, tapTimer } from './timer-store';
import { useTimerClock } from './use-timer-clock';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('./timer-sfx', () => ({ ensureTimerSfxReady: jest.fn(), playTimerSfx: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(0);
  jest.clearAllMocks();
  resetTimerStoreForTests();
  changeTimerControl({ initialMs: 1_000, delayMs: 0 });
});
afterEach(() => jest.useRealTimers());

it('does not announce a previous timeout when opening an already expired clock', () => {
  tapTimer('white');
  jest.setSystemTime(2_000);
  advanceTimer();

  const { result } = renderHook(() => useTimerClock());
  expect(result.current.clock.status).toBe('expired');
  expect(playTimerSfx).not.toHaveBeenCalledWith('timeout');
});

it('announces a fresh timeout discovered by mount-time catch-up, but not again on reopening', () => {
  tapTimer('white');
  jest.setSystemTime(2_000);

  const { result, unmount } = renderHook(() => useTimerClock());
  expect(result.current.clock.status).toBe('expired');
  expect(playTimerSfx).toHaveBeenCalledWith('timeout');
  unmount();
  jest.mocked(playTimerSfx).mockClear();

  const { result: reopenedResult } = renderHook(() => useTimerClock());
  expect(reopenedResult.current.clock.status).toBe('expired');
  expect(playTimerSfx).not.toHaveBeenCalledWith('timeout');
});

it('still announces a timeout reached while the clock screen is open', () => {
  tapTimer('white');
  const { result } = renderHook(() => useTimerClock());
  act(() => jest.advanceTimersByTime(1_000));
  expect(result.current.clock.status).toBe('expired');
  expect(jest.mocked(playTimerSfx).mock.calls.filter(([kind]) => kind === 'timeout')).toHaveLength(1);
});
