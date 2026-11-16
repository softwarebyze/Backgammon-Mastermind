import type { Dispatch, SetStateAction } from 'react';
import type { PointAnchor } from '@/features/game/board-point-layout';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { applyMove, getLegalMoves } from '@/lib/game';
import { shouldDeferTurnEnd } from '@/lib/game-preferences/confirm-move';

/** Revalidate geometry and die identity without substituting another legal die. */
export function resolveLegalMove(snapshot: GameState, move: Move, plannedDice = snapshot.remainingDice): Move | undefined {
  const candidates = getLegalMoves(snapshot).filter(m => m.from === move.from && m.to === move.to);
  if (move.die != null) {
    return candidates.find(m => m.die === move.die);
  }
  // Legacy callers may provide only an index. Prefer the live index, but allow
  // a stored sequence's original index after earlier steps shrink the dice.
  if (!Number.isInteger(move.dieIndex) || move.dieIndex < 0) {
    return undefined;
  }
  const liveDie = snapshot.remainingDice[move.dieIndex];
  const plannedDie = plannedDice[move.dieIndex];
  return candidates.find(m => m.die === liveDie)
    ?? candidates.find(m => m.die === plannedDie);
}

export type PlayMoveOpts = {
  fromAnchor?: PointAnchor;
  onComplete?: (next: GameState) => void;
  durationMs?: number;
  /** Computer slides are paced slower than a human tap. Default is human. */
  pace?: 'human' | 'computer';
};

export function createPlayMove(opts: {
  generationRef: { current: number };
  commitGenRef: { current: number };
  finishOnceRef: { current: (() => void) | null };
  setState: Dispatch<SetStateAction<GameState | null>>;
  setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
  onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
  /**
   * Fires when the move's animation begins (not when it settles). Used for
   * immediate audio feedback — the SFX plays on tap, not ~400ms later at
   * landing. `after` is a preview computed via applyMove; the commit still
   * happens in settle.
   */
  onMoveStarted?: (before: GameState, move: Move, after: GameState) => void;
}) {
  const {
    generationRef,
    commitGenRef,
    finishOnceRef,
    setState,
    setMoveAnimation,
    onMoveApplied,
    onMoveStarted,
  } = opts;

  return (
    snapshot: GameState,
    move: Move,
    playOpts?: PlayMoveOpts,
  ) => {
    const gen = generationRef.current;
    commitGenRef.current = gen;
    let settled = false;
    const settle = () => {
      if (settled || generationRef.current !== gen) {
        return;
      }
      settled = true;
      finishOnceRef.current = null;
      const legal = resolveLegalMove(snapshot, move);
      if (!legal) {
        setMoveAnimation(null);
        playOpts?.onComplete?.(snapshot);
        return;
      }
      // Re-read Confirm move at land time — toggling it mid-slide must not leave
      // a spent-dice turn with no Confirm bar and no auto-pass.
      const applyOpts = shouldDeferTurnEnd(snapshot) ? { deferTurnEnd: true } : undefined;
      const next = applyMove(snapshot, legal, applyOpts);
      onMoveApplied?.(snapshot, legal, next);
      setState(next);
      setMoveAnimation(null);
      playOpts?.onComplete?.(next);
    };
    finishOnceRef.current = settle;
    // Immediate audio feedback: play the move's SFX now, not at landing.
    // applyMove is pure, so the preview matches what settle will commit.
    const legalPreview = resolveLegalMove(snapshot, move);
    if (legalPreview) {
      const previewOpts = shouldDeferTurnEnd(snapshot) ? { deferTurnEnd: true } : undefined;
      onMoveStarted?.(snapshot, legalPreview, applyMove(snapshot, legalPreview, previewOpts));
    }
    setMoveAnimation(buildMoveAnimationFrame(snapshot, move, {
      onFinish: settle,
      fromAnchor: playOpts?.fromAnchor,
      durationMs: playOpts?.durationMs,
      pace: playOpts?.pace,
    }));
  };
}
