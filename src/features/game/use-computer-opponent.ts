import type { Dispatch, SetStateAction } from 'react';
import type { PlayMoveOpts } from '@/features/game/create-play-move';
import type { ComputerLevel, GameState, Move } from '@/lib/game';
import type { CubeHistoryEvent } from '@/lib/game/cube-history';
import { useCallback, useEffect, useRef, useState } from 'react';

import { chooseComputerCubeAction, planComputerTurn } from '@/features/game/computer-turn';
import { analyzeCubeDecision } from '@/features/game/cube-analysis';
import { applyDiceRoll, applyOpeningDieRoll, DEFAULT_COMPUTER_LEVEL, getAIMove, getLegalMoves, passTurn, rollDice, rollOpeningDie } from '@/lib/game';
import { playGameSfx } from '@/lib/game-sfx/play-game-sfx';
import {
  computerMoveDelayMs,
  computerThinkDelayMs,
} from '@/lib/game/computer-pace';
import { acceptDouble, beaverDouble, canOfferDouble, dropDouble, offerDouble } from '@/lib/game/match';

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
  recordCubeEvent?: (kind: CubeHistoryEvent['kind'], before: GameState, after: GameState) => void;
  /** How strong the computer plays. Read when it decides, so a change applies from its next decision. */
  level?: ComputerLevel;
};

/** The legal move in `state` that plays this planned step, or null when the plan no longer fits. */
function livePlannedMove(state: GameState, planned: Move): Move | null {
  return getLegalMoves(state).find(m => m.from === planned.from && m.to === planned.to
    && (planned.die === undefined || state.remainingDice[m.dieIndex] === planned.die)) ?? null;
}

function atTurnStart(state: GameState): boolean {
  return state.remainingDice.length === (state.dice[0] === state.dice[1] ? 4 : 2);
}

export type ComputerOpponentControls = {
  clearAITimeout: () => void;
  /** Re-arm AI timers after leave-home cancelled them (same state, no effect deps change). */
  resumeAIScheduling: () => void;
  computerCubeError: boolean;
  retryCubeAnalysis: () => void;
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
  recordCubeEvent,
  level = DEFAULT_COMPUTER_LEVEL,
}: ComputerOpponentOptions): ComputerOpponentControls {
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const levelRef = useRef(level);
  levelRef.current = level;
  /** The rest of the turn the engine chose, played one checker at a time. */
  const plannedTurnRef = useRef<Move[]>([]);
  // Bumped when returning to the game screen so timers re-schedule without a state change.
  const [scheduleGen, setScheduleGen] = useState(0);
  const [failedState, setFailedState] = useState<GameState | null>(null);
  const retryCubeAnalysis = useCallback(() => {
    setFailedState(null);
    setScheduleGen(g => g + 1);
  }, []);

  const clearAITimeout = useCallback(() => {
    generationRef.current++;
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
    if ((state.match?.pendingOffer ? state.match.pendingOffer !== 'white' : state.currentPlayer !== 'black'))
      return clearAITimeout;
    if (state.phase === 'game-over')
      return clearAITimeout;
    if (isAnimating)
      return clearAITimeout;
    // User undid into a redoable history — wait for redo or a fresh human move.
    if (hasRedo)
      return clearAITimeout;

    const generation = generationRef.current;
    const delay = computerThinkDelayMs(state.phase);
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    if (delay === 0 && state.phase !== 'moving') {
      return clearAITimeout;
    }

    const runAI = async () => {
      // Failsafe: a timeout scheduled just before the pause must not fire through it.
      if (pausedRef.current || generationRef.current !== generation)
        return;
      const prev = stateRef.current;
      if (prev !== state || !prev || (prev.match?.pendingOffer ? prev.match.pendingOffer !== 'white' : prev.currentPlayer !== 'black'))
        return;

      if (prev.phase === 'rolling' && prev.match && (prev.match.pendingOffer || canOfferDouble(prev))) {
        try {
          const analysis = await analyzeCubeDecision(prev);
          if (pausedRef.current || generationRef.current !== generation || stateRef.current !== prev)
            return;
          const best = chooseComputerCubeAction(analysis, levelRef.current);
          if (best !== 'roll') {
            const next = best === 'offer'
              ? offerDouble(prev, moveCount)
              : best === 'accept' ? acceptDouble(prev) : best === 'beaver' ? beaverDouble(prev) : dropDouble(prev);
            if (next !== prev) {
              recordCubeEvent?.(best, prev, next);
              setState(next);
            }
            return;
          }
        }
        catch {
          if (generationRef.current === generation && stateRef.current === prev)
            setFailedState(prev);
          return;
        }
      }
      // Wait for the human to answer the computer's offer.
      if (prev.match?.pendingOffer)
        return;

      if (prev.phase === 'opening-roll' || prev.phase === 'rolling') {
        setState((current) => {
          if (current !== prev || current.currentPlayer !== 'black')
            return current;
          if (current.phase === 'opening-roll') {
            playGameSfx('roll');
            return applyOpeningDieRoll(current, rollOpeningDie());
          }
          playGameSfx('roll');
          const rolled = applyDiceRoll(current, rollDice());
          return rolled.match ? { ...rolled, match: { ...rolled.match, undoFloor: moveCount } } : rolled;
        });
        return;
      }

      if (prev.phase === 'no-move') {
        recordNoMove(prev, prev);
        setState(passTurn(prev));
        return;
      }

      if (prev.phase === 'moving') {
        if (atTurnStart(prev)) {
          plannedTurnRef.current = [];
          try {
            const planned = await planComputerTurn(prev, levelRef.current);
            if (pausedRef.current || generationRef.current !== generation || stateRef.current !== prev)
              return;
            plannedTurnRef.current = planned;
          }
          catch {
            // No engine: the built-in heuristic plays this turn.
            if (pausedRef.current || generationRef.current !== generation || stateRef.current !== prev)
              return;
          }
        }
        const [next, ...rest] = plannedTurnRef.current;
        const plannedMove = next ? livePlannedMove(prev, next) : null;
        const move = plannedMove ?? getAIMove(prev);
        if (!move) {
          recordNoMove(prev, prev);
          setState(passTurn(prev));
          return;
        }
        const moveDelay = computerMoveDelayMs(moveCount);
        moveTimer = setTimeout(() => {
          if (pausedRef.current || generationRef.current !== generation)
            return;
          const latest = stateRef.current;
          if (latest !== prev || latest.currentPlayer !== 'black' || latest.phase !== 'moving') {
            return;
          }
          if (!plannedMove)
            plannedTurnRef.current = [];
          // A step leaves the plan only once its move lands: a cancelled timer
          // or an interrupted slide keeps it for the next pass.
          playMove(latest, move, {
            pace: 'computer',
            onComplete: (next) => {
              if (plannedMove && next !== latest)
                plannedTurnRef.current = rest;
            },
          });
        }, moveDelay);
        aiTimeoutRef.current = moveTimer;
      }
    };

    const thinkTimer = delay === 0 ? null : setTimeout(runAI, delay);
    if (thinkTimer === null)
      runAI();
    else
      aiTimeoutRef.current = thinkTimer;

    return () => {
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
    recordCubeEvent,
    clearAITimeout,
    scheduleGen,
    paused,
  ]);

  return { clearAITimeout, resumeAIScheduling, computerCubeError: failedState !== null && failedState === state, retryCubeAnalysis };
}
