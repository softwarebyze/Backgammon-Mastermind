import type { TutorTurnAnalysis } from './tutor';

import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState, Move, Player } from '@/lib/game/types';

import { useEffect, useRef } from 'react';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';

import { cloneGameState } from '@/lib/game/snapshot';
import { primaryEngine } from './engine';
import {
  clearGuidanceKind,
  getGuidance,
  setGuidanceVerdictPending,
  showGuidance,
} from './guidance-store';
import { analyzeTutorTurn, judgeTutorTurn } from './tutor';

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
   * stays paused (see setGuidanceVerdictPending) until the verdict lands.
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

/** True while `live` is still the same moving turn the hint was asked on. */
function isSameMovingTurn(live: GameState, question: GameState): boolean {
  return live.phase === 'moving'
    && live.currentPlayer === question.currentPlayer
    && live.dice[0] === question.dice[0]
    && live.dice[1] === question.dice[1];
}

function openBlunderPrompt(args: {
  entry: TrackedTurn;
  endBoard: number[];
  moveLog: MoveLogEntry[];
  endMoveLogLength: number;
}) {
  const { entry, endBoard, moveLog, endMoveLogLength } = args;
  const analysis = entry.analysis;
  if (!analysis)
    return;
  const verdict = judgeTutorTurn(analysis, endBoard);
  if (!verdict)
    return;
  const movesMade = Math.max(0, endMoveLogLength - entry.startMoveLogLength);
  // The player's own path, for the side-by-side solution view. dieIndex is
  // re-resolved when drawing arrows, so a sentinel is fine.
  const myMoves: Move[] = moveLog
    .slice(Math.max(0, moveLog.length - movesMade))
    .filter(e => e.from >= 0 && e.to >= 0)
    .map(e => ({ from: e.from, to: e.to, dieIndex: -1 }));
  showGuidance({
    kind: 'blunder',
    questionState: entry.startState,
    myMoves,
    engineMoves: analysis.bestMoves,
    // Progressive disclosure: the answer stays hidden until the player
    // asks to see it.
    revealed: false,
    showMine: true,
    showEngine: true,
    verdict: {
      loss: verdict.loss,
      playedRank: verdict.playedRank,
      candidateCount: verdict.candidateCount,
      candidateEquities: analysis.candidates.slice(0, 8).map(c => c.equity),
      bestEquity: analysis.bestEquity,
    },
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
  moveLog: MoveLogEntry[];
  trackedRef: { current: TrackedTurn | null };
  pendingTimeoutRef: { current: ReturnType<typeof setTimeout> | null };
  abandonTurn: (entry: TrackedTurn) => void;
  clearPendingTimeout: () => void;
}): void {
  const {
    liveState,
    tracked,
    moveLog,
    trackedRef,
    pendingTimeoutRef,
    abandonTurn,
    clearPendingTimeout,
  } = args;
  const moveLogLength = moveLog.length;
  if (moveLogLength < tracked.startMoveLogLength) {
    // New game (or rewound past the turn start): the old turn is gone.
    abandonTurn(tracked);
    return;
  }
  const endBoard = primaryEngine.boardAfterTurn({ ...liveState, currentPlayer: tracked.player });
  if (tracked.analysis) {
    trackedRef.current = null;
    openBlunderPrompt({ entry: tracked, endBoard, moveLog, endMoveLogLength: moveLogLength });
    return;
  }
  if (!tracked.analysisPending)
    return; // engine already reported unavailable → stay silent
  tracked.endBoard = endBoard;
  tracked.endMoveLogLength = moveLogLength;
  tracked.holdActive = true;
  setGuidanceVerdictPending(true);
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
 * blunder the game pauses with a guidance session: the question view names
 * the mistake in plain words without revealing the answer, and the player
 * can take back, peek at the best move (both paths side by side), keep the
 * move, or turn the tutor off.
 *
 * The game is held paused while a completed turn waits on its analysis
 * (setGuidanceVerdictPending), so a fast player can never outrun the tutor
 * and watch the game "keep going" past a blunder. Silent when the engine is
 * unavailable, and never judges a turn it couldn't analyze from the start.
 *
 * This hook also owns hint-session lifecycle: a hint belongs to the turn it
 * was asked on, so it is dropped when that turn ends. (Not gated on the
 * tutor preference — hints work with Tutor Mode off.)
 */
export function useTutorMode(liveState: GameState | null, moveLog: MoveLogEntry[]) {
  const { preferences } = useGamePreferences();
  const trackedRef = useRef<TrackedTurn | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveLogRef = useRef(moveLog);
  moveLogRef.current = moveLog;
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
      setGuidanceVerdictPending(false);
    };

    // Hint sessions belong to one turn — drop a stale one before anything
    // else (this runs before a blunder prompt could be shown below, and
    // clearGuidanceKind only touches hint sessions).
    if (liveState) {
      const g = getGuidance();
      if (g?.kind === 'hint' && !isSameMovingTurn(liveState, g.questionState)) {
        clearGuidanceKind('hint');
      }
    }

    if (!tutorOn) {
      const tracked = trackedRef.current;
      if (tracked) {
        abandonTurn(tracked);
      }
      else {
        clearPendingTimeout();
        setGuidanceVerdictPending(false);
      }
      // Hints are tutor-independent — only blunder prompts are gated.
      clearGuidanceKind('blunder');
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
        moveLog: moveLogRef.current,
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
          startMoveLogLength: moveLogRef.current.length,
          holdActive: false,
          endBoard: null,
          endMoveLogLength: 0,
        };
        trackedRef.current = entry;
        void analyzeTutorTurn(liveState, primaryEngine).then((analysis) => {
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
            openBlunderPrompt({ entry, endBoard, moveLog: moveLogRef.current, endMoveLogLength });
            abandonTurn(entry);
          }
        });
      }
    }
  }, [liveState, moveLog, tutorOn]);
}
