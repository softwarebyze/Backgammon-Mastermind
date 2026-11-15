import type { TimerConfig } from './timer-clock';
import {
  activeRemainingMs,
  advanceClock,
  createTimerState,
  formatClock,
  formatDelay,
  isLowTime,
  pauseClock,
  remainingFraction,
  resetClock,
  resumeClock,
  setTimerConfig,
  startClock,
  switchClock,
} from './timer-clock';

const FIVE_MINUTES: TimerConfig = { initialMs: 5 * 60_000, delayMs: 12_000 };

describe('formatClock', () => {
  it('shows whole seconds and only reaches 0:00 at zero', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(4_999)).toBe('0:05');
    expect(formatClock(5 * 60_000)).toBe('5:00');
    expect(formatClock(59_999)).toBe('1:00');
    expect(formatClock(60_000)).toBe('1:00');
  });

  it('adds hours when a control runs past an hour', () => {
    expect(formatClock(3_600_000)).toBe('1:00:00');
    expect(formatClock(3_661_000)).toBe('1:01:01');
  });

  it('shows tenths under ten seconds when asked', () => {
    expect(formatClock(9_400, true)).toBe('0:09.4');
    expect(formatClock(1_200, true)).toBe('0:01.2');
    expect(formatClock(10_000, true)).toBe('0:10');
    expect(formatClock(0, true)).toBe('0:00.0');
  });

  it('treats broken values as zero', () => {
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(-5_000)).toBe('0:00');
  });
});

describe('timer clock', () => {
  it('starts idle with equal clocks and no active player', () => {
    const state = createTimerState(FIVE_MINUTES);
    expect(state.status).toBe('idle');
    expect(state.active).toBeNull();
    expect(state.remainingMs).toEqual({ white: 300_000, black: 300_000 });
  });

  it('spends the free delay before main time', () => {
    const started = startClock(createTimerState(FIVE_MINUTES), 'white', 1_000);
    expect(started.status).toBe('running');
    expect(started.active).toBe('white');

    const afterDelay = advanceClock(started, 6_000);
    expect(afterDelay.remainingMs.white).toBe(300_000);
    expect(afterDelay.delayLeftMs).toBe(7_000);

    const afterDelayAndTime = advanceClock(started, 16_000);
    expect(afterDelayAndTime.remainingMs.white).toBe(297_000);
    expect(afterDelayAndTime.delayLeftMs).toBe(0);
  });

  it('moves time to the other player and resets their delay on switch', () => {
    const started = startClock(createTimerState(FIVE_MINUTES), 'white', 0);
    const switched = switchClock(started, 20_000);
    expect(switched.active).toBe('black');
    expect(switched.remainingMs.white).toBe(292_000);
    expect(switched.remainingMs.black).toBe(300_000);
    expect(switched.delayLeftMs).toBe(12_000);
    expect(switched.moves).toEqual({ white: 1, black: 0 });
  });

  it('pauses and resumes without losing the turn', () => {
    const started = startClock(createTimerState(FIVE_MINUTES), 'black', 0);
    const paused = pauseClock(started, 5_000);
    expect(paused.status).toBe('paused');
    expect(paused.remainingMs.black).toBe(300_000);
    expect(paused.delayLeftMs).toBe(7_000);

    const stillPaused = advanceClock(paused, 60_000);
    expect(stillPaused).toBe(paused);

    const resumed = resumeClock(paused, 60_000);
    expect(resumed.status).toBe('running');
    expect(resumed.anchorAt).toBe(60_000);
  });

  it('expires the running player when main time hits zero', () => {
    const started = startClock(createTimerState({ initialMs: 10_000, delayMs: 2_000 }), 'white', 0);
    const expired = advanceClock(started, 20_000);
    expect(expired.status).toBe('expired');
    expect(expired.expiredPlayer).toBe('white');
    expect(expired.active).toBeNull();
    expect(expired.remainingMs.white).toBe(0);
    expect(expired.remainingMs.black).toBe(10_000);
  });

  it('does not switch after time has run out', () => {
    const started = startClock(createTimerState({ initialMs: 5_000, delayMs: 0 }), 'white', 0);
    const expired = switchClock(started, 9_000);
    expect(expired.status).toBe('expired');
    expect(expired.expiredPlayer).toBe('white');
  });

  it('resets both clocks and move counts', () => {
    const started = startClock(createTimerState(FIVE_MINUTES), 'white', 0);
    const switched = switchClock(started, 60_000);
    const reset = resetClock(switched);
    expect(reset.status).toBe('idle');
    expect(reset.remainingMs).toEqual({ white: 300_000, black: 300_000 });
    expect(reset.moves).toEqual({ white: 0, black: 0 });
  });

  it('only changes the control while idle', () => {
    const started = startClock(createTimerState(FIVE_MINUTES), 'white', 0);
    expect(setTimerConfig(started, { initialMs: 60_000, delayMs: 0 })).toBe(started);
    const changed = setTimerConfig(createTimerState(FIVE_MINUTES), { initialMs: 60_000, delayMs: 0 });
    expect(changed.remainingMs.white).toBe(60_000);
  });

  it('reports low time, remaining share and active time', () => {
    const state = startClock(createTimerState(FIVE_MINUTES), 'white', 0);
    expect(isLowTime(10_000)).toBe(true);
    expect(isLowTime(10_001)).toBe(false);
    expect(isLowTime(0)).toBe(false);
    expect(activeRemainingMs(state)).toBe(300_000);
    expect(remainingFraction(state, 'white')).toBe(1);
    expect(formatDelay(12_000)).toBe('12s');
  });
});
