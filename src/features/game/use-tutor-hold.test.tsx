/**
 * Regression tests for the tutor verdict-pending hold:
 * "It didn't really pause, the game kept going."
 *
 * Root cause: when the human finished their turn before Sage's background
 * analysis resolved, the tracked turn was silently dropped and play
 * continued — no prompt ever opened. Now the game holds paused until the
 * verdict lands (or the engine fails), then judges exactly once.
 */
import type { GameState } from '@/lib/game/types';

import { planSageTurnFull } from 'expo-bgsage';
import { useEffect } from 'react';

import { createInitialState } from '@/lib/game/constants';
import { act, cleanup, render } from '@/lib/test-utils';

import {
  clearGuidance,
  getGuidance,
  setGuidanceVerdictPending,
  useGuidance,
  useGuidanceVerdictPending,
} from './guidance-store';
import { bumpTutorGameGeneration, resetTutorGameGenerationForTests, useTutorMode } from './use-tutor';

// Path-based (not virtual) mock: this is the same module instance that
// src/features/game/engine/bgsage-engine.ts imports, so the mock reliably
// intercepts it. A virtual bare-package mock proved order-sensitive and
// flaky under parallel workers.
jest.mock('../../../expo-bgsage/src/index', () => ({
  planSageTurnFull: jest.fn(),
  gameStateToSageBoard: jest.fn(() => 'END_BOARD'),
}));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({ preferences: { tutorMode: true } }),
}));

const planSageTurnFullMock = jest.mocked(planSageTurnFull);

const BEST_BOARD = 'BEST_BOARD';
const END_BOARD = 'END_BOARD';

function whiteMovingState(): GameState {
  const s = createInitialState('vs-computer');
  s.currentPlayer = 'white';
  s.phase = 'moving';
  s.dice = [3, 1];
  s.remainingDice = [3, 1];
  return s;
}

/** Dice spent but turn not handed off yet (confirm-move hold). */
function whiteAwaitingConfirmState(): GameState {
  const s = whiteMovingState();
  s.remainingDice = [];
  return s;
}
/** One die still to play — "undo last move" does not restart the turn. */
function whiteMidTurnState(): GameState {
  const s = whiteMovingState();
  s.remainingDice = [1];
  return s;
}

function blackRollingState(): GameState {
  const s = createInitialState('vs-computer');
  s.currentPlayer = 'black';
  s.phase = 'rolling';
  s.dice = [0, 0];
  s.remainingDice = [];
  return s;
}

/** Pass-and-play state: both sides are human, so both turns get analyzed. */
function passAndPlayState(
  phase: GameState['phase'],
  player: 'white' | 'black',
  dice: [number, number],
): GameState {
  const s = createInitialState('vs-human');
  s.currentPlayer = player;
  s.phase = phase;
  s.dice = dice;
  s.remainingDice = dice[0] === 0 ? [] : [...dice];
  return s;
}

/** Plan whose played board (END_BOARD) loses 0.20 vs the best. */
function blunderPlan() {
  return {
    moves: [],
    equity: 0.5,
    candidates: [
      { board: BEST_BOARD, equity: 0.5 },
      { board: END_BOARD, equity: 0.3 },
    ],
  };
}

/** Plan whose played board matches the best — no blunder. */
function cleanPlan() {
  return {
    moves: [],
    equity: 0.5,
    candidates: [{ board: END_BOARD, equity: 0.5 }],
  };
}

type ProbeSnapshot = { pending: boolean; blunderNull: boolean };

function Probe({ onSnapshot }: { onSnapshot: (s: ProbeSnapshot) => void }) {
  const pending = useGuidanceVerdictPending();
  const guidance = useGuidance();
  useEffect(() => {
    onSnapshot({ pending, blunderNull: guidance?.kind !== 'blunder' });
  });
  return null;
}

function Harness({ state, onSnapshot }: { state: GameState; onSnapshot: (s: ProbeSnapshot) => void }) {
  useTutorMode(state, []);
  return <Probe onSnapshot={onSnapshot} />;
}

function renderHarness(state: GameState) {
  const probe: ProbeSnapshot = { pending: false, blunderNull: true };
  const onSnapshot = (s: ProbeSnapshot) => {
    probe.pending = s.pending;
    probe.blunderNull = s.blunderNull;
  };
  const utils = render(<Harness state={state} onSnapshot={onSnapshot} />);
  return { ...utils, probe, onSnapshot };
}

afterEach(() => {
  cleanup();
  clearGuidance();
  setGuidanceVerdictPending(false);
  resetTutorGameGenerationForTests();
  planSageTurnFullMock.mockReset();
});

describe('tutor verdict-pending hold', () => {
  it('discards a late verdict after leaving the game screen', async () => {
    let resolveAnalysis!: (plan: never) => void;
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolveAnalysis = resolve as (plan: never) => void; }),
    );

    const { rerender, unmount, onSnapshot, probe } = renderHarness(whiteMovingState());
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.pending).toBe(true);
    unmount();

    await act(async () => {
      resolveAnalysis(blunderPlan() as never);
    });
    expect(getGuidance()).toBeNull();
  });

  it('holds the game paused when the turn ends before analysis resolves, then opens the prompt on a blunder', async () => {
    let resolveAnalysis!: (plan: never) => void;
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolveAnalysis = resolve as (plan: never) => void; }),
    );

    const { rerender, probe, onSnapshot } = renderHarness(whiteMovingState());
    expect(planSageTurnFullMock).toHaveBeenCalledTimes(1);
    expect(probe.pending).toBe(false);

    // The human finishes the turn while Sage is still thinking.
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.pending).toBe(true);
    expect(probe.blunderNull).toBe(true);

    // The verdict lands: a blunder → prompt opens, hold releases.
    await act(async () => {
      resolveAnalysis(blunderPlan() as never);
    });
    expect(probe.blunderNull).toBe(false);
    expect(probe.pending).toBe(false);
  });

  it('releases the hold silently when the verdict is clean', async () => {
    let resolveAnalysis!: (plan: never) => void;
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolveAnalysis = resolve as (plan: never) => void; }),
    );

    const { rerender, probe, onSnapshot } = renderHarness(whiteMovingState());
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.pending).toBe(true);

    await act(async () => {
      resolveAnalysis(cleanPlan() as never);
    });
    expect(probe.blunderNull).toBe(true);
    expect(probe.pending).toBe(false);
  });

  it('releases the hold silently when the engine is unavailable', async () => {
    let resolveAnalysis!: (plan: never) => void;
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolveAnalysis = resolve as (plan: never) => void; }),
    );

    const { rerender, probe, onSnapshot } = renderHarness(whiteMovingState());
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.pending).toBe(true);

    await act(async () => {
      resolveAnalysis(null as never);
    });
    expect(probe.blunderNull).toBe(true);
    expect(probe.pending).toBe(false);
  });

  it('judges immediately with no hold when analysis already resolved', async () => {
    let resolveAnalysis!: (plan: never) => void;
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolveAnalysis = resolve as (plan: never) => void; }),
    );

    const { rerender, probe, onSnapshot } = renderHarness(whiteMovingState());
    // The verdict lands while the human is still moving: stored, no prompt, no hold.
    await act(async () => {
      resolveAnalysis(blunderPlan() as never);
    });
    expect(probe.pending).toBe(false);
    expect(probe.blunderNull).toBe(true);

    // Passing the turn judges at once — no hold, prompt opens in the same commit.
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.pending).toBe(false);
    expect(probe.blunderNull).toBe(false);
  });

  it('does not leave a verdict pending when New Game replaces a first turn still awaiting analysis', () => {
    planSageTurnFullMock.mockImplementation(() => new Promise(() => {}));

    const { rerender, probe, onSnapshot } = renderHarness(whiteMovingState());
    expect(planSageTurnFullMock).toHaveBeenCalledTimes(1);
    expect(probe.pending).toBe(false);

    // First turn: startMoveLogLength is 0 and the log is still empty. New Game
    // keeps the log empty and changes the turn key, so a shorter log cannot
    // signal the reset. The session generation can.
    bumpTutorGameGeneration();
    rerender(<Harness state={createInitialState('vs-computer')} onSnapshot={onSnapshot} />);
    expect(probe.pending).toBe(false);
  });
});

describe('tutor undo last move', () => {
  it('catches the same blunder again after undo last move', async () => {
    let resolveAnalysis!: (plan: never) => void;
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolveAnalysis = resolve as (plan: never) => void; }),
    );

    const { rerender, probe, onSnapshot } = renderHarness(whiteMovingState());
    await act(async () => {
      resolveAnalysis(blunderPlan() as never);
    });
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.blunderNull).toBe(false);

    // The player undoes one checker and is mid-turn, not at a fresh turn start.
    act(() => {
      clearGuidance();
    });
    rerender(<Harness state={whiteMidTurnState()} onSnapshot={onSnapshot} />);
    expect(probe.blunderNull).toBe(true);
    expect(planSageTurnFullMock).toHaveBeenCalledTimes(1);

    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.blunderNull).toBe(false);
  });
});

describe('tutor verdict-pending hold in pass-and-play', () => {
  it('still judges the held turn when the opponent starts a new turn before analysis resolves', async () => {
    // In pass-and-play the opponent is human too, so their turn starts a second
    // analysis. That must not orphan the turn we are already holding for.
    const resolvers: Array<(plan: never) => void> = [];
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolvers.push(resolve as (plan: never) => void); }),
    );

    const { rerender, probe, onSnapshot } = renderHarness(
      passAndPlayState('moving', 'white', [3, 1]),
    );
    expect(planSageTurnFullMock).toHaveBeenCalledTimes(1);

    // White passes the turn while Sage is still thinking → the hold engages.
    rerender(
      <Harness state={passAndPlayState('rolling', 'black', [0, 0])} onSnapshot={onSnapshot} />,
    );
    expect(probe.pending).toBe(true);
    expect(probe.blunderNull).toBe(true);

    // Black rolls and starts their own turn while the hold is still active.
    rerender(
      <Harness state={passAndPlayState('moving', 'black', [5, 2])} onSnapshot={onSnapshot} />,
    );

    // White's analysis lands: the blunder must still be reported.
    await act(async () => {
      resolvers[0](blunderPlan() as never);
    });

    expect(probe.blunderNull).toBe(false);
    expect(probe.pending).toBe(false);
  });
});

describe('tutor with confirm-move hold', () => {
  it('does not judge while dice are spent but the turn is still held for Confirm', async () => {
    let resolveAnalysis!: (plan: never) => void;
    planSageTurnFullMock.mockImplementation(
      () => new Promise((resolve) => { resolveAnalysis = resolve as (plan: never) => void; }),
    );

    const { rerender, probe, onSnapshot } = renderHarness(whiteMovingState());
    await act(async () => {
      resolveAnalysis(blunderPlan() as never);
    });
    expect(probe.blunderNull).toBe(true);

    // Confirm move: last die spent, same player/dice — turn key unchanged.
    rerender(<Harness state={whiteAwaitingConfirmState()} onSnapshot={onSnapshot} />);
    expect(probe.blunderNull).toBe(true);
    expect(probe.pending).toBe(false);

    // Player taps Confirm → opponent to roll → tutor judges now.
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.blunderNull).toBe(false);
  });
});
