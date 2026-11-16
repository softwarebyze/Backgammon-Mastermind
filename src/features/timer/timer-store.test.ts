import { getItem, setItem } from '@/lib/storage';

import { DEFAULT_TIMER_PREFERENCES, loadTimerPreferences } from './timer-preferences';
import { advanceTimer, changeTimerControl, getTimerState, pauseTimer, resetTimer, resetTimerStoreForTests, resumeTimer, tapTimer } from './timer-store';

describe('physical clock controls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    resetTimerStoreForTests();
    changeTimerControl({ initialMs: 60_000, delayMs: 12_000 });
  });
  afterEach(() => jest.useRealTimers());

  it('ignores the waiting paddle and only hands off from the active one', () => {
    tapTimer('white');
    jest.setSystemTime(5_000);
    tapTimer('black');
    expect(getTimerState().active).toBe('white');
    tapTimer('white');
    expect(getTimerState().active).toBe('black');
    expect(getTimerState().delayLeftMs).toBe(12_000);
    expect(getTimerState().remainingMs.white).toBe(60_000);
  });

  it('keeps the unused delay through pause and ignores both paddles while paused', () => {
    tapTimer('black');
    jest.setSystemTime(5_000);
    pauseTimer();
    tapTimer('white');
    tapTimer('black');
    jest.setSystemTime(100_000);
    resumeTimer();
    jest.setSystemTime(110_000);
    advanceTimer();
    expect(getTimerState().active).toBe('black');
    expect(getTimerState().remainingMs.black).toBe(57_000);
  });

  it('catches up elapsed background time, expires, then resets both clocks', () => {
    tapTimer('white');
    jest.setSystemTime(80_000);
    advanceTimer();
    expect(getTimerState().expiredPlayer).toBe('white');
    tapTimer('black');
    expect(getTimerState().status).toBe('expired');
    resetTimer();
    expect(getTimerState().remainingMs).toEqual({ white: 60_000, black: 60_000 });
    expect(getTimerState().status).toBe('idle');
  });
});

describe('timer preferences', () => {
  it('rejects invalid saved controls but keeps valid preferences', async () => {
    const saved = getItem('TIMER_PREFERENCES');
    await setItem('TIMER_PREFERENCES', { initialMs: -1, delayMs: '12', soundEnabled: false, facePlayers: true });
    expect(loadTimerPreferences()).toEqual({ ...DEFAULT_TIMER_PREFERENCES, soundEnabled: false, facePlayers: true });
    await setItem('TIMER_PREFERENCES', saved);
  });
});
