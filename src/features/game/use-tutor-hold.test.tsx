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
  clearTutorBlunder,
  setTutorVerdictPending,
  useTutorBlunder,
  useTutorVerdictPending,
} from './tutor-store';
import { useTutorMode } from './use-tutor';

jest.mock(
  'expo-bgsage',
  () => ({
    planSageTurnFull: jest.fn(),
    gameStateToSageBoard: jest.fn(() => 'END_BOARD'),
  }),
  { virtual: true },
);

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

function blackRollingState(): GameState {
  const s = createInitialState('vs-computer');
  s.currentPlayer = 'black';
  s.phase = 'rolling';
  s.dice = [0, 0];
  s.remainingDice = [];
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

type ProbeSnapshot = { pending: boolean; promptNull: boolean };

function Probe({ onSnapshot }: { onSnapshot: (s: ProbeSnapshot) => void }) {
  const pending = useTutorVerdictPending();
  const promptNull = useTutorBlunder() === null;
  useEffect(() => {
    onSnapshot({ pending, promptNull });
  });
  return null;
}

function Harness({ state, onSnapshot }: { state: GameState; onSnapshot: (s: ProbeSnapshot) => void }) {
  useTutorMode(state, 0);
  return <Probe onSnapshot={onSnapshot} />;
}

function renderHarness(state: GameState) {
  const probe: ProbeSnapshot = { pending: false, promptNull: true };
  const onSnapshot = (s: ProbeSnapshot) => {
    probe.pending = s.pending;
    probe.promptNull = s.promptNull;
  };
  const utils = render(<Harness state={state} onSnapshot={onSnapshot} />);
  return { ...utils, probe, onSnapshot };
}

afterEach(() => {
  cleanup();
  clearTutorBlunder();
  setTutorVerdictPending(false);
  planSageTurnFullMock.mockReset();
});

describe('tutor verdict-pending hold', () => {
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
    expect(probe.promptNull).toBe(true);

    // The verdict lands: a blunder → prompt opens, hold releases.
    await act(async () => {
      resolveAnalysis(blunderPlan() as never);
    });
    expect(probe.promptNull).toBe(false);
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
    expect(probe.promptNull).toBe(true);
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
    expect(probe.promptNull).toBe(true);
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
    expect(probe.promptNull).toBe(true);

    // Passing the turn judges at once — no hold, prompt opens in the same commit.
    rerender(<Harness state={blackRollingState()} onSnapshot={onSnapshot} />);
    expect(probe.pending).toBe(false);
    expect(probe.promptNull).toBe(false);
  });
});
