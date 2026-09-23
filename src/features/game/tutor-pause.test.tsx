/**
 * Reproduction for: "It didn't really pause, the game kept going."
 *
 * Mounts the REAL useComputerOpponent (as owned by the game provider) with a
 * child component (standing in for GameScreen) whose effect opens the REAL
 * tutor-blunder prompt in the same commit the turn passes to the computer —
 * mirroring the production effect ordering (child effects flush before the
 * provider's AI effect). With fake timers we then advance well past every AI
 * delay and assert the computer never rolls or moves while paused.
 */
import type { SetStateAction } from 'react';
import type { GameState } from '@/lib/game/types';

import { useEffect, useRef, useState } from 'react';

import { createInitialState } from '@/lib/game/constants';
import { act, cleanup, render } from '@/lib/test-utils';

import {
  clearTutorBlunder,
  showTutorBlunder,
  useTutorBlunder,
} from './tutor-store';
import { useComputerOpponent } from './use-computer-opponent';

jest.mock('@/lib/game-sfx/play-game-sfx', () => ({
  playGameSfx: jest.fn(),
  playGameSfxSequence: jest.fn(),
}));

jest.useFakeTimers();

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

const FAKE_PROMPT = {
  bestNotation: '13/11 · 8/5',
  loss: 0.12,
  bestMoves: [],
  startState: whiteMovingState(),
  movesMade: 2,
  candidateEquities: [0.5, 0.38],
  playedRank: 2,
  candidateCount: 8,
};

/** Stands in for GameScreen: opens the tutor prompt when the turn passes. */
function TutorChild({ state }: { state: GameState | null }) {
  useEffect(() => {
    if (state && state.currentPlayer === 'black') {
      showTutorBlunder(FAKE_PROMPT);
    }
  }, [state]);
  return null;
}

afterEach(() => {
  cleanup();
  clearTutorBlunder();
  jest.clearAllTimers();
});

describe('tutor pause vs the computer opponent', () => {
  it('never lets the computer roll or move after the prompt opens in the turn-pass commit', () => {
    const apiRef: { current: { passTurn: () => void } | null } = { current: null };
    const playMove = jest.fn();
    const setStates: GameState[] = [];
    const promptSeen: boolean[] = [];

    function Harness() {
      const [state, setState] = useState<GameState | null>(whiteMovingState);
      const prompt = useTutorBlunder();
      const setStateRef = useRef(setState);
      setStateRef.current = setState;

      useEffect(() => {
        promptSeen.push(prompt !== null);
      }, [prompt]);

      const setStateSpy = useRef((u: SetStateAction<GameState | null>) => {
        setStates.push(
          (typeof u === 'function'
            ? (u as (p: GameState | null) => GameState | null)(null)
            : u) as GameState,
        );
        setStateRef.current(u);
      });

      // NOTE: TutorChild is rendered BEFORE this hook's effect runs, so the
      // child's effect (opening the prompt) flushes first — exactly like
      // GameScreen's effects flushing before the provider's AI effect.
      useComputerOpponent({
        state,
        setState: setStateSpy.current,
        playMove,
        isAnimating: false,
        moveCount: 10,
        hasRedo: false,
        recordNoMove: jest.fn(),
        paused: prompt !== null,
      });

      useEffect(() => {
        apiRef.current = { passTurn: () => setStateRef.current(blackRollingState()) };
      }, []);

      return <TutorChild state={state} />;
    }

    render(<Harness />);
    expect(promptSeen).toEqual([false]);

    // The human's turn passes to the computer — the tutor child opens the
    // prompt in the same commit the AI effect sees black's turn.
    act(() => {
      apiRef.current!.passTurn();
    });
    expect(promptSeen).toContain(true);

    // Advance well past every computer delay (roll 1400 + think 600 + move 1100).
    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    // The AI must never roll the dice (no transition to nonzero dice for
    // black) and never play a checker move while the prompt is open.
    const rolled = setStates.some(
      s => s && s.currentPlayer === 'black' && (s.dice[0] !== 0 || s.dice[1] !== 0),
    );
    expect(rolled).toBe(false);
    expect(playMove).not.toHaveBeenCalled();
  });
});
