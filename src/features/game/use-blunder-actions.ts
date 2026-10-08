import type { GuidanceSession } from '@/features/game/guidance-store';

import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef } from 'react';

import { clearGuidance, updateGuidance } from '@/features/game/guidance-store';
import { useGame } from '@/features/game/use-game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';

type TutorBlunderAction = 'take_back' | 'peek' | 'keep_move' | 'turn_off' | 'play_best' | 'nudge_opened';

/** One `tutor_blunder_shown` per guidance session, plus named actions. */
function useTutorBlunderAnalytics(session: GuidanceSession | null) {
  const posthog = usePostHog();
  const shownId = useRef<number | null>(null);

  useEffect(() => {
    if (!session || session.kind !== 'blunder' || !session.verdict)
      return;
    if (shownId.current === session.id)
      return;
    shownId.current = session.id;
    posthog.capture('tutor_blunder_shown', {
      loss: session.verdict.loss,
      played_rank: session.verdict.playedRank,
      candidate_count: session.verdict.candidateCount,
      mode: session.questionState.mode,
    });
  }, [posthog, session]);

  return useCallback((action: TutorBlunderAction) => {
    posthog.capture('tutor_blunder_action', { action });
    if (action === 'turn_off') {
      posthog.capture('game_preference_changed', {
        preference: 'tutor_mode',
        value: false,
        source: 'blunder_modal',
      });
    }
  }, [posthog]);
}

/**
 * The actions every blunder surface shares (modal, nudge sheet, inline
 * card): take back, play best, keep, turn off, and the reveal toggles.
 */
export function useBlunderActions(session: GuidanceSession | null) {
  const game = useGame();
  const { setTutorMode } = useGamePreferences();
  const capture = useTutorBlunderAnalytics(session);

  const takeBack = () => {
    if (!session || session.kind !== 'blunder')
      return;
    capture('take_back');
    clearGuidance();
    game.tutorRevertTurn(session.questionState, session.myMoves.length);
  };
  const revealFull = () => {
    capture('peek');
    updateGuidance({ revealed: true, revealMineOnly: false, showMine: true, showEngine: true });
  };
  const keepMove = () => {
    capture('keep_move');
    clearGuidance();
  };
  const turnOff = () => {
    capture('turn_off');
    clearGuidance();
    setTutorMode(false);
  };
  /**
   * Revert the player's turn, then animate the engine's best move in its
   * place. Dismiss first; the sequence starts on the next frame so the board
   * has settled before the replay runs.
   */
  const playBest = () => {
    if (!session || session.kind !== 'blunder')
      return;
    const moves = session.engineMoves;
    if (moves.length === 0)
      return;
    capture('play_best');
    hapticLight();
    clearGuidance();
    game.tutorRevertTurn(session.questionState, session.myMoves.length, () => {
      requestAnimationFrame(() => {
        game.doMoveSequence(moves);
      });
    });
  };
  /** Which arrow sets the board draws; at least one stays on. */
  const setShown = (showMine: boolean, showEngine: boolean) => {
    if (!showMine && !showEngine)
      return;
    updateGuidance({ revealed: true, revealMineOnly: false, showMine, showEngine });
  };

  return { takeBack, revealFull, keepMove, turnOff, playBest, setShown, capture };
}
