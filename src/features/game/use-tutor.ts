import type { TutorTurnAnalysis } from './tutor';

import type { GameState } from '@/lib/game/types';

import { gameStateToSageBoard } from 'expo-bgsage';
import { useEffect, useRef } from 'react';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { analyzeTutorTurn, judgeTutorTurn } from './tutor';
import { clearTutorBlunder, showTutorBlunder } from './tutor-store';

type TrackedTurn = {
  key: string;
  analysis: TutorTurnAnalysis | null;
  startState: GameState;
  startMoveLogLength: number;
};

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

/**
 * Tutor mode: when a fresh human turn starts, the turn-start position is
 * analyzed in the background; when the turn ends, the played resulting
 * board is compared against the engine's candidate equities. On a big
 * blunder the game pauses with a prompt offering to play Sage's move,
 * try again, or see the suggestion — instead of the old passive banner.
 * Silent when the engine is unavailable, and never judges a turn it
 * couldn't analyze from the start.
 */
export function useTutorMode(liveState: GameState | null, moveLogLength: number) {
  const { preferences } = useGamePreferences();
  const trackedRef = useRef<TrackedTurn | null>(null);
  const moveLogLengthRef = useRef(moveLogLength);
  moveLogLengthRef.current = moveLogLength;
  const tutorOn = preferences.tutorMode;

  useEffect(() => {
    if (!tutorOn) {
      trackedRef.current = null;
      clearTutorBlunder();
      return;
    }
    if (!liveState)
      return;

    const key = turnKey(liveState);
    const tracked = trackedRef.current;

    // The tracked turn ended (turn passed, or game over) → judge it.
    if (tracked && (liveState.phase === 'game-over' || key !== tracked.key)) {
      trackedRef.current = null;
      if (tracked.analysis) {
        const endBoard = gameStateToSageBoard({
          ...liveState,
          currentPlayer: tracked.analysis.player,
        });
        const verdict = judgeTutorTurn(tracked.analysis, endBoard);
        if (verdict) {
          const movesMade = Math.max(
            0,
            moveLogLengthRef.current - tracked.startMoveLogLength,
          );
          showTutorBlunder({
            bestNotation: verdict.bestNotation,
            loss: verdict.loss,
            bestMoves: tracked.analysis.bestMoves,
            startState: tracked.startState,
            movesMade,
          });
        }
      }
    }

    // A fresh human turn just started → analyze it in the background.
    if (isHumanTurn(liveState) && liveState.phase === 'moving' && turnJustStarted(liveState)) {
      if (!trackedRef.current || trackedRef.current.key !== key) {
        const entry: TrackedTurn = {
          key,
          analysis: null,
          startState: cloneGameState(liveState),
          startMoveLogLength: moveLogLengthRef.current,
        };
        trackedRef.current = entry;
        void analyzeTutorTurn(liveState).then((analysis) => {
          if (trackedRef.current !== entry)
            return; // turn ended mid-flight
          if (analysis) {
            entry.analysis = analysis;
          }
          else {
            trackedRef.current = null; // engine unavailable → stay silent
          }
        });
      }
    }
  }, [liveState, moveLogLength, tutorOn]);
}
