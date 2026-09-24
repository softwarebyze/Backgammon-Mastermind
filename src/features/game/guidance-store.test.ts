import type { GuidanceSession } from './guidance-store';

import { createInitialState } from '@/lib/game/constants';
import { act, renderHook } from '@/lib/test-utils';

import {
  clearGuidance,
  clearGuidanceKind,
  getGuidance,
  setGuidanceVerdictPending,
  showGuidance,
  updateGuidance,
  useGuidance,
  useGuidanceVerdictPending,
} from './guidance-store';

function blunderSession(): Omit<GuidanceSession, 'id'> {
  const questionState = createInitialState('vs-computer');
  return {
    kind: 'blunder',
    questionState,
    myMoves: [{ from: 13, to: 11, dieIndex: 0 }],
    engineMoves: [{ from: 13, to: 10, dieIndex: 0 }],
    revealed: false,
    showMine: true,
    showEngine: true,
    verdict: {
      loss: 0.12,
      playedRank: 2,
      candidateCount: 8,
      candidateEquities: [0.5, 0.38],
      bestEquity: 0.5,
    },
  };
}

function hintSession(): Omit<GuidanceSession, 'id'> {
  return {
    kind: 'hint',
    questionState: createInitialState('vs-computer'),
    myMoves: [],
    engineMoves: [{ from: 8, to: 5, dieIndex: 0 }],
    revealed: true,
    showMine: false,
    showEngine: true,
    engineId: 'bgsage',
    hintMoveLogLength: 4,
  };
}

afterEach(() => {
  clearGuidance();
  setGuidanceVerdictPending(false);
});

describe('guidance store', () => {
  it('shows a blunder session and clears it', () => {
    const { result } = renderHook(() => useGuidance());
    expect(result.current).toBeNull();

    act(() => {
      showGuidance(blunderSession());
    });
    expect(result.current?.kind).toBe('blunder');
    expect(result.current?.revealed).toBe(false);
    expect(getGuidance()?.verdict?.playedRank).toBe(2);

    act(() => {
      clearGuidance();
    });
    expect(result.current).toBeNull();
  });

  it('updates reveal state without touching the rest of the session', () => {
    const { result } = renderHook(() => useGuidance());
    act(() => {
      showGuidance(blunderSession());
    });
    const before = getGuidance()!;
    act(() => {
      updateGuidance({ revealed: true, showMine: false });
    });
    expect(result.current?.revealed).toBe(true);
    expect(result.current?.showMine).toBe(false);
    // Untouched fields survive the update.
    expect(result.current?.engineMoves).toBe(before.engineMoves);
    expect(result.current?.verdict).toBe(before.verdict);
  });

  it('replaces the session when a new one is shown', () => {
    act(() => {
      showGuidance(blunderSession());
    });
    act(() => {
      showGuidance(hintSession());
    });
    expect(getGuidance()?.kind).toBe('hint');
    expect(getGuidance()?.engineId).toBe('bgsage');
  });

  it('clearGuidanceKind only clears the named kind', () => {
    act(() => {
      showGuidance(hintSession());
    });
    act(() => {
      clearGuidanceKind('blunder');
    });
    expect(getGuidance()?.kind).toBe('hint');
    act(() => {
      clearGuidanceKind('hint');
    });
    expect(getGuidance()).toBeNull();
  });

  it('tracks verdict-pending independently of the session', () => {
    const { result } = renderHook(() => useGuidanceVerdictPending());
    expect(result.current).toBe(false);
    act(() => {
      setGuidanceVerdictPending(true);
    });
    expect(result.current).toBe(true);
    // A blunder session can be shown while the hold releases.
    act(() => {
      showGuidance(blunderSession());
      setGuidanceVerdictPending(false);
    });
    expect(result.current).toBe(false);
    expect(getGuidance()?.kind).toBe('blunder');
  });

  it('hint sessions carry their engine and move-log watermark', () => {
    act(() => {
      showGuidance(hintSession());
    });
    const session = getGuidance();
    expect(session?.kind).toBe('hint');
    if (session?.kind === 'hint') {
      expect(session.engineId).toBe('bgsage');
      expect(session.hintMoveLogLength).toBe(4);
    }
  });

  it('updateGuidance is a no-op with no open session', () => {
    expect(() => {
      act(() => {
        updateGuidance({ revealed: true });
      });
    }).not.toThrow();
    expect(getGuidance()).toBeNull();
  });
});
