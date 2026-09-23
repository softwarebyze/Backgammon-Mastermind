import type { Dispatch, SetStateAction } from 'react';
import type { GameMode, GameState } from '@/lib/game';
import { useCallback, useState } from 'react';

import { setOpeningCeremonyHandoff, setOpeningCeremonyVisible } from '@/features/game/opening-ceremony-gate';
import { clearTutorBlunder, setTutorVerdictPending } from '@/features/game/tutor-store';
import { createInitialState } from '@/lib/game';
import { clearActiveGame, savePersistedSession } from '@/lib/game/persistence';
import { performResume } from '@/lib/game/resume-game';

type Options = {
  state: GameState | null;
  clearAITimeout: () => void;
  resetAnimation: () => void;
  resetMoveLog: () => void;
  reloadMoveLog: () => void;
  resetTimeline: (initial: GameState) => void;
  clearTimeline: () => void;
  setState: Dispatch<SetStateAction<GameState | null>>;
};

export function useGameLifecycle({
  state,
  clearAITimeout,
  resetAnimation,
  resetMoveLog,
  reloadMoveLog,
  resetTimeline,
  clearTimeline,
  setState,
}: Options) {
  // Remount opening ceremony on each new/reset game (clears stuck exit stage).
  const [ceremonyKey, setCeremonyKey] = useState(0);

  const bumpCeremony = useCallback(() => {
    setOpeningCeremonyVisible(false);
    setOpeningCeremonyHandoff('hidden');
    setCeremonyKey(k => k + 1);
  }, []);

  const beginSession = useCallback((next: GameState) => {
    clearAITimeout();
    resetAnimation();
    clearActiveGame();
    resetMoveLog();
    clearTimeline();
    setTutorVerdictPending(false);
    clearTutorBlunder();
    bumpCeremony();
    savePersistedSession({ state: next, moveLog: [], replayBaseline: null });
    resetTimeline(next);
    setState(next);
  }, [bumpCeremony, clearAITimeout, resetAnimation, resetMoveLog, clearTimeline, resetTimeline, setState]);

  const startGame = useCallback((mode: GameMode) => {
    beginSession(createInitialState(mode));
  }, [beginSession]);

  const startFromPosition = useCallback((next: GameState) => {
    beginSession(next);
  }, [beginSession]);

  const resumeGame = useCallback(() => {
    return performResume({
      current: state,
      setState,
      clearAITimeout,
      reloadMoveLog,
      resetTimeline,
    });
  }, [clearAITimeout, reloadMoveLog, resetTimeline, setState, state]);

  const resetGame = useCallback(() => {
    clearAITimeout();
    resetAnimation();
    resetMoveLog();
    setTutorVerdictPending(false);
    clearTutorBlunder();
    bumpCeremony();
    if (!state) {
      return;
    }
    const next = createInitialState(state.mode);
    savePersistedSession({ state: next, moveLog: [], replayBaseline: null });
    resetTimeline(next);
    setState(next);
  }, [bumpCeremony, clearAITimeout, resetAnimation, resetMoveLog, resetTimeline, setState, state]);

  return { startGame, startFromPosition, resumeGame, resetGame, ceremonyKey };
}
