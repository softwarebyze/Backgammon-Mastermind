import type { Dispatch, SetStateAction } from 'react';
import type { PlayMoveOpts } from '@/features/game/create-play-move';
import type { GameState, Move } from '@/lib/game';
import { useCallback, useEffect, useRef, useState } from 'react';

import { planSageComputerTurn } from '@/features/game/computer-turn';
import { isSageLevel } from '@/features/game/engine/sage-difficulty';
import { nextPlannedMove } from '@/features/game/planned-move';
import { applyDiceRoll, applyOpeningDieRoll, getAIMove, passTurn, rollDice, rollOpeningDie } from '@/lib/game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { playGameSfx } from '@/lib/game-sfx/play-game-sfx';
import {
  computerMoveDelayMs,
  computerThinkDelayMs,
} from '@/lib/game/computer-pace';

type ComputerOpponentOptions = {
  enabled: boolean;
  state: GameState | null;
  setState: Dispatch<SetStateAction<GameState | null>>;
  playMove: (snapshot: GameState, move: Move, playOpts?: PlayMoveOpts) => void;
  isAnimating: boolean;
  /** Moves played so far — 0 means the opening ceremony may still be on screen. */
  moveCount: number;
  /** Undo left a redo stack — don't auto-play or the AI wipes redo. */
  hasRedo: boolean;
  recordNoMove: (before: GameState, after: GameState) => void;
  /** Tutor blunder prompt is open — pause the AI until the user chooses. */
  paused?: boolean;
};

export type ComputerOpponentControls = {
  clearAITimeout: () => void;
  /** Re-arm AI timers after leave-home cancelled them (same state, no effect deps change). */
  resumeAIScheduling: () => void;
};

/* eslint-disable max-lines-per-function -- AI turn orchestration */
export function useComputerOpponent({
  enabled,
  state,
  setState,
  playMove,
  isAnimating,
  moveCount,
  hasRedo,
  recordNoMove,
  paused = false,
}: ComputerOpponentOptions): ComputerOpponentControls {
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // Bumped when returning to the game screen so timers re-schedule without a state change.
  const [scheduleGen, setScheduleGen] = useState(0);
  const { preferences } = useGamePreferences();
  const level = preferences.computerLevel;
  // Remaining steps of the current sage-planned turn, played one per effect run.
  const sagePlanRef = useRef<Move[]>([]);

  const clearAITimeout = useCallback(() => {
    if (aiTimeoutRef.current !== null) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  }, []);

  const resumeAIScheduling = useCallback(() => {
    setScheduleGen(g => g + 1);
  }, []);

  useEffect(() => {
    clearAITimeout();

    if (!enabled || paused || !state)
      return clearAITimeout;
    if (state.mode !== 'vs-computer')
      return clearAITimeout;
    if (state.currentPlayer !== 'black')
      return clearAITimeout;
    if (state.phase === 'game-over')
      return clearAITimeout;
    if (isAnimating)
      return clearAITimeout;
    // User undid into a redoable history — wait for redo or a fresh human move.
    if (hasRedo)
      return clearAITimeout;

    const delay = computerThinkDelayMs(state.phase);
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    if (delay === 0 && state.phase !== 'moving') {
      return clearAITimeout;
    }

    const runAI = () => {
      // Failsafe: a timeout scheduled just before the pause must not fire through it.
      if (pausedRef.current)
        return;
      const prev = stateRef.current;
      if (!prev || prev.currentPlayer !== 'black')
        return;

      if (prev.phase !== 'moving')
        sagePlanRef.current = [];

      if (prev.phase === 'opening-roll' || prev.phase === 'rolling') {
        setState((current) => {
          if (!current || current.currentPlayer !== 'black')
            return current;
          if (current.phase === 'opening-roll') {
            playGameSfx('roll');
            return applyOpeningDieRoll(current, rollOpeningDie());
          }
          playGameSfx('roll');
          return applyDiceRoll(current, rollDice());
        });
        return;
      }

      if (prev.phase === 'no-move') {
        recordNoMove(prev, prev);
        setState(passTurn(prev));
        return;
      }

      if (prev.phase === 'moving') {
        const play = (move: Move | null) => {
          if (!move) {
            recordNoMove(prev, prev);
            setState(passTurn(prev));
            return;
          }
          const moveDelay = computerMoveDelayMs(moveCount);
          moveTimer = setTimeout(() => {
            if (pausedRef.current)
              return;
            const latest = stateRef.current;
            if (!latest || latest.currentPlayer !== 'black' || latest.phase !== 'moving') {
              return;
            }
            playMove(latest, move, { pace: 'computer' });
          }, moveDelay);
          aiTimeoutRef.current = moveTimer;
        };

        if (!isSageLevel(level)) {
          play(getAIMove(prev));
          return;
        }
        const planned = nextPlannedMove(prev, sagePlanRef.current);
        if (planned) {
          sagePlanRef.current = sagePlanRef.current.slice(1);
          play(planned);
          return;
        }
        planSageComputerTurn(prev, level)
          // Engine unavailable (Expo Go, failed WASM load, native budget): keep playing.
          .catch(() => [] as Move[])
          .then((moves) => {
            if (cancelled || stateRef.current !== prev || pausedRef.current)
              return;
            const first = nextPlannedMove(prev, moves);
            sagePlanRef.current = first ? moves.slice(1) : [];
            play(first ?? getAIMove(prev));
          });
      }
    };

    const thinkTimer = delay === 0 ? null : setTimeout(runAI, delay);
    if (thinkTimer === null)
      runAI();
    else
      aiTimeoutRef.current = thinkTimer;

    return () => {
      cancelled = true;
      if (thinkTimer !== null)
        clearTimeout(thinkTimer);
      if (moveTimer !== undefined)
        clearTimeout(moveTimer);
      clearAITimeout();
    };
  }, [
    enabled,
    state,
    setState,
    playMove,
    isAnimating,
    moveCount,
    hasRedo,
    recordNoMove,
    clearAITimeout,
    scheduleGen,
    level,
    paused,
  ]);

  return { clearAITimeout, resumeAIScheduling };
}
