export type TimerPlayer = 'white' | 'black';

type TimerStatus = 'idle' | 'running' | 'paused' | 'expired';

export type TimerConfig = {
  /** Main time each player starts with, in milliseconds. */
  initialMs: number;
  /** Free seconds at the start of every turn (simple delay), in milliseconds. */
  delayMs: number;
};

export type TimerState = {
  config: TimerConfig;
  remainingMs: Record<TimerPlayer, number>;
  /** Free delay left for the running player, at `anchorAt`. */
  delayLeftMs: number;
  /** Player whose clock is running; stays set while paused so Resume knows whose clock to restart. */
  active: TimerPlayer | null;
  status: TimerStatus;
  /** Wall-clock instant the current segment is measured from. */
  anchorAt: number | null;
  moves: Record<TimerPlayer, number>;
  expiredPlayer: TimerPlayer | null;
};

export const TIMER_LOW_MS = 10_000;

/** Return the player who receives the next clock handoff. */
function otherPlayer(player: TimerPlayer): TimerPlayer {
  return player === 'white' ? 'black' : 'white';
}

/** Create equal idle clocks without starting either player’s delay. */
export function createTimerState(config: TimerConfig): TimerState {
  return {
    config,
    remainingMs: { white: config.initialMs, black: config.initialMs },
    delayLeftMs: 0,
    active: null,
    status: 'idle',
    anchorAt: null,
    moves: { white: 0, black: 0 },
    expiredPlayer: null,
  };
}

/** Start a game on the given player's clock. Only valid from idle. */
export function startClock(state: TimerState, player: TimerPlayer, now: number): TimerState {
  if (state.status !== 'idle') {
    return state;
  }
  return {
    ...state,
    active: player,
    status: 'running',
    anchorAt: now,
    delayLeftMs: state.config.delayMs,
  };
}

/**
 * Bring a running clock up to `now`, spending the free delay before main time.
 * The returned state is re-anchored so callers can keep it between renders.
 */
export function advanceClock(state: TimerState, now: number): TimerState {
  if (state.status !== 'running' || state.active === null || state.anchorAt === null) {
    return state;
  }
  const elapsed = Math.max(0, now - state.anchorAt);
  if (elapsed === 0) {
    return state;
  }
  const free = Math.min(state.delayLeftMs, elapsed);
  const charged = elapsed - free;
  const remaining = Math.max(0, state.remainingMs[state.active] - charged);
  const next: TimerState = {
    ...state,
    anchorAt: now,
    delayLeftMs: state.delayLeftMs - free,
    remainingMs: { ...state.remainingMs, [state.active]: remaining },
  };
  if (remaining > 0) {
    return next;
  }
  return {
    ...next,
    status: 'expired',
    active: null,
    anchorAt: null,
    expiredPlayer: state.active,
  };
}

/** End the running player's turn and start the other player's delay. */
export function switchClock(state: TimerState, now: number): TimerState {
  const advanced = advanceClock(state, now);
  if (advanced.status !== 'running' || advanced.active === null) {
    return advanced;
  }
  const previous = advanced.active;
  return {
    ...advanced,
    active: otherPlayer(previous),
    delayLeftMs: advanced.config.delayMs,
    moves: { ...advanced.moves, [previous]: advanced.moves[previous] + 1 },
  };
}

/** Charge elapsed time before pausing; preserve unused delay unless the clock has already expired. */
export function pauseClock(state: TimerState, now: number): TimerState {
  const advanced = advanceClock(state, now);
  if (advanced.status !== 'running') {
    return advanced;
  }
  return { ...advanced, status: 'paused', anchorAt: null };
}

/** Restart a paused clock from a new timestamp without granting another delay. */
export function resumeClock(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused' || state.active === null) {
    return state;
  }
  return { ...state, status: 'running', anchorAt: now };
}

/** Restore the selected starting time, clearing moves, active player and expiry. */
export function resetClock(state: TimerState): TimerState {
  return {
    ...createTimerState(state.config),
    moves: { white: 0, black: 0 },
  };
}

/** Apply a new time control only before either clock starts. */
export function setTimerConfig(state: TimerState, config: TimerConfig): TimerState {
  if (state.status !== 'idle') {
    return state;
  }
  return createTimerState(config);
}

/** Read the active player’s time, or zero when neither clock is active. */
export function activeRemainingMs(state: TimerState): number {
  return state.active === null ? 0 : state.remainingMs[state.active];
}

/** Identify positive main-time balances within the audible warning threshold. */
export function isLowTime(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= TIMER_LOW_MS;
}

/** Format a two-digit clock field with a leading zero. */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Clock display. Whole seconds round up, so a clock only reads 0:00 at zero;
 * the final ten seconds include tenths for the same drama as a physical clock.
 */
export function formatClock(ms: number, showTenths = false): string {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  if (showTenths && safe < TIMER_LOW_MS) {
    const tenths = Math.ceil(safe / 100) / 10;
    const whole = Math.floor(tenths);
    const fraction = Math.round((tenths - whole) * 10) % 10;
    return `0:${pad(whole)}.${fraction}`;
  }
  const totalSeconds = Math.ceil(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Remaining share of the starting time, clamped for progress bars. */
export function remainingFraction(state: TimerState, player: TimerPlayer): number {
  if (state.config.initialMs <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, state.remainingMs[player] / state.config.initialMs));
}

/** Round remaining free delay up to whole seconds for display. */
export function formatDelay(ms: number): string {
  return `${Math.ceil(Math.max(0, ms) / 1000)}s`;
}
