import type { TutorTurnAnalysis } from './tutor';

import type { GameState, Player } from '@/lib/game/types';

import { gameStateToSageBoard } from 'expo-bgsage';
import { useEffect, useRef } from 'react';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { analyzeTutorTurn, judgeTutorTurn } from './tutor';
import {
  clearTutorBlunder,
  setTutorVerdictPending,
  showTutorBlunder,
} from './tutor-store';

type TrackedTurn = {
  key: string;
  player: Player;
  analysis: TutorTurnAnalysis | null;
  /** True while analyzeTutorTurn is still in flight. */
  analysisPending: boolean;
  startState: GameState;
  startMoveLogLength: number;
  /**
   * True once the turn ended while analysis was still running. The game
   * stays paused (see setTutorVerdictPending) until the verdict lands.
   */
  holdActive: boolean;
  /** Turn-end board + move-log length, stashed when the hold engages. */
  endBoard: number[] | null;
  endMoveLogLength: number;
};

/** Give up waiting on a stuck engine rather than freezing the game. */
const VERDICT_PENDING_TIMEOUT_MS = 10_000;

function isHumanTurn(state: GameState): boolean {
  return !(state.mode === 'vs-computer' && state.currentPlayer === 'black');
}

function turnKey(state: GameState): string {
  return `${state.currentPlayer}|${state.dice[0]},${state.dice[1]}`;
}

function turnJustStarted(state: GameState): boolean {
  const expectedDice = state.dice[0] === state.dice[1] ? 4 : 2;
  return state.remainingDice.length === expectedDice;
}

function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    points: state.points.map(p => ({ ...p })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
    dice: [...state.dice] as [number, number],
    remainingDice: [...state.remainingDice],
    openingRolls: { ...state.openingRolls },
    legalMovesForSelected: [],
    selectedPoint: null,
  };
}

function openBlunderPrompt(entry: TrackedTurn, endBoard: number[], endMoveLogLength: number) {
  const analysis = entry.analysis;
  if (!analysis)
    return;
  const verdict = judgeTutorTurn(analysis, endBoard);
  if (!verdict)
    return;
  const movesMade = Math.max(0, endMoveLogLength - entry.startMoveLogLength);
  showTutorBlunder({
    bestNotation: verdict.bestNotation,
    loss: verdict.loss,
    bestMoves: analysis.bestMoves,
    startState: entry.startState,
    movesMade,
    candidateEquities: analysis.candidates.slice(0, 8).map(c => c.equity),
    playedRank: verdict.playedRank,
    candidateCount: verdict.candidateCount,
  });
}

/**
 * The tracked turn ended (turn passed, or game over): judge it now, or —
 * if the analysis is still in flight — hold the game paused until the
 * verdict lands instead of silently letting play continue.
 */
function finishTrackedTurn(args: {
  liveState: GameState;
  tracked: TrackedTurn;
  moveLogLength: number;
  trackedRef: { current: TrackedTurn | null };
  pendingTimeoutRef: { current: ReturnType<typeof setTimeout> | null };
  abandonTurn: (entry: TrackedTurn) => void;
  clearPendingTimeout: () => void;
}): void {
  const {
    liveState,
    tracked,
    moveLogLength,
    trackedRef,
    pendingTimeoutRef,
    abandonTurn,
    clearPendingTimeout,
  } = args;
  if (moveLogLength < tracked.startMoveLogLength) {
    // New game (or rewound past the turn start): the old turn is gone.
    abandonTurn(tracked);
    return;
  }
  const endBoard = gameStateToSageBoard({ ...liveState, currentPlayer: tracked.player });
  if (tracked.analysis) {
    trackedRef.current = null;
    openBlunderPrompt(tracked, endBoard, moveLogLength);
    return;
  }
  if (!tracked.analysisPending)
    return; // engine already reported unavailable → stay silent
  tracked.endBoard = endBoard;
  tracked.endMoveLogLength = moveLogLength;
  tracked.holdActive = true;
  setTutorVerdictPending(true);
  clearPendingTimeout();
  pendingTimeoutRef.current = setTimeout(() => {
    pendingTimeoutRef.current = null;
    abandonTurn(tracked); // stuck engine → release, stay silent
  }, VERDICT_PENDING_TIMEOUT_MS);
}

/**
 * Tutor mode: when a fresh human turn starts, the turn-start position is
 * analyzed in the background; when the turn ends, the played resulting
 * board is compared against the engine's candidate equities. On a big
 * blunder the game pauses with a prompt offering to take back, see a hint,
 * keep the move, or turn the tutor off — instead of the old passive banner.
 *
 * The game is held paused while a completed turn waits on its analysis
 * (setTutorVerdictPending), so a fast player can never outrun the tutor and
 * watch the game "keep going" past a blunder. Silent when the engine is
 * unavailable, and never judges a turn it couldn't analyze from the start.
 */
export function useTutorMode(liveState: GameState | null, moveLogLength: number) {
  const { preferences } = useGamePreferences();
  const trackedRef = useRef<TrackedTurn | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveLogLengthRef = useRef(moveLogLength);
  moveLogLengthRef.current = moveLogLength;
  const tutorOn = preferences.tutorMode;

  useEffect(() => {
    const clearPendingTimeout = () => {
      if (pendingTimeoutRef.current !== null) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    };
    /** Drop the tracked turn and release any hold without judging. */
    const abandonTurn = (entry: TrackedTurn) => {
      entry.holdActive = false;
      if (trackedRef.current === entry) {
        trackedRef.current = null;
      }
      clearPendingTimeout();
      setTutorVerdictPending(false);
    };

    if (!tutorOn) {
      const tracked = trackedRef.current;
      if (tracked) {
        abandonTurn(tracked);
      }
      else {
        clearPendingTimeout();
        setTutorVerdictPending(false);
      }
      clearTutorBlunder();
      return;
    }
    if (!liveState)
      return;

    const key = turnKey(liveState);
    const tracked = trackedRef.current;

    // The tracked turn ended (turn passed, or game over) → judge it.
    if (tracked && !tracked.holdActive && (liveState.phase === 'game-over' || key !== tracked.key)) {
      finishTrackedTurn({
        liveState,
        tracked,
        moveLogLength: moveLogLengthRef.current,
        trackedRef,
        pendingTimeoutRef,
        abandonTurn,
        clearPendingTimeout,
      });
    }

    // A fresh human turn just started → analyze it in the background.
    if (isHumanTurn(liveState) && liveState.phase === 'moving' && turnJustStarted(liveState)) {
      if (!trackedRef.current || trackedRef.current.key !== key) {
        const entry: TrackedTurn = {
          key,
          player: liveState.currentPlayer,
          analysis: null,
          analysisPending: true,
          startState: cloneGameState(liveState),
          startMoveLogLength: moveLogLengthRef.current,
          holdActive: false,
          endBoard: null,
          endMoveLogLength: 0,
        };
        trackedRef.current = entry;
        void analyzeTutorTurn(liveState).then((analysis) => {
          if (trackedRef.current !== entry)
            return; // turn ended mid-flight (already judged) or abandoned
          entry.analysisPending = false;
          if (!analysis) {
            // Engine unavailable → stay silent, release any hold.
            abandonTurn(entry);
            return;
          }
          entry.analysis = analysis;
          if (entry.holdActive && entry.endBoard) {
            // The turn already ended while we were analyzing → judge now.
            // Open the prompt BEFORE releasing the hold so the game can
            // never observe an unpaused gap between the two.
            const { endBoard, endMoveLogLength } = entry;
            openBlunderPrompt(entry, endBoard, endMoveLogLength);
            abandonTurn(entry);
          }
        });
      }
    }
  }, [liveState, moveLogLength, tutorOn]);
}
