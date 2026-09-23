import type { TutorTurnAnalysis } from './tutor';

import type { GameState } from '@/lib/game/types';

import { gameStateToSageBoard } from 'expo-bgsage';
import { useEffect, useRef } from 'react';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { analyzeTutorTurn, judgeTutorTurn } from './tutor';
import { clearTutorNotice, showTutorNotice } from './tutor-store';

type TrackedTurn = {
  key: string;
  analysis: TutorTurnAnalysis | null;
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

/**
 * Tutor mode: when a fresh human turn starts, the turn-start position is
 * analyzed in the background; when the turn ends, the played resulting
 * board is compared against the engine's candidate equities and big
 * blunders get flagged with the better move. Silent when the engine is
 * unavailable, and never judges a turn it couldn't analyze from the start.
 */
export function useTutorMode(liveState: GameState | null) {
  const { preferences } = useGamePreferences();
  const trackedRef = useRef<TrackedTurn | null>(null);
  const tutorOn = preferences.tutorMode;

  useEffect(() => {
    if (!tutorOn) {
      trackedRef.current = null;
      clearTutorNotice();
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
          showTutorNotice({
            title: 'Big blunder!',
            body: `Sage preferred ${verdict.bestNotation} (−${verdict.loss.toFixed(2)}).`,
          });
        }
      }
    }

    // A fresh human turn just started → analyze it in the background.
    if (isHumanTurn(liveState) && liveState.phase === 'moving' && turnJustStarted(liveState)) {
      if (!trackedRef.current || trackedRef.current.key !== key) {
        const entry: TrackedTurn = { key, analysis: null };
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
  }, [liveState, tutorOn]);
}
