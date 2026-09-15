import type { GameState } from './types';
import { createInitialState } from './constants';
import { performResume } from './resume-game';

describe('performResume queued updater', () => {
  it('returns true and reloads log before a deferred setState runs', () => {
    const saved = createInitialState('vs-computer');
    const queued: GameState[] = [];
    const reloadMoveLog = jest.fn();
    const resetTimeline = jest.fn();
    const clearAITimeout = jest.fn();

    const canResume = performResume({
      current: null,
      setState: (next) => {
        queued.push(next as GameState);
      },
      loadSaved: () => saved,
      reloadMoveLog,
      resetTimeline,
      clearAITimeout,
    });

    expect(canResume).toBe(true);
    expect(reloadMoveLog).toHaveBeenCalledTimes(1);
    expect(resetTimeline).toHaveBeenCalledWith(saved);
    expect(queued).toEqual([saved]);
  });

  it('does not mutate through a functional updater when live state is already resumable', () => {
    const current = createInitialState('vs-human');
    const setState = jest.fn();
    const reloadMoveLog = jest.fn();

    const canResume = performResume({
      current,
      setState,
      loadSaved: () => {
        throw new Error('should not load from disk');
      },
      reloadMoveLog,
      resetTimeline: jest.fn(),
      clearAITimeout: jest.fn(),
    });

    expect(canResume).toBe(true);
    expect(setState).not.toHaveBeenCalled();
    expect(reloadMoveLog).not.toHaveBeenCalled();
  });

  it('returns false without queueing work when nothing is saved', () => {
    const setState = jest.fn();
    const canResume = performResume({
      current: null,
      setState,
      loadSaved: () => null,
      reloadMoveLog: jest.fn(),
      resetTimeline: jest.fn(),
      clearAITimeout: jest.fn(),
    });

    expect(canResume).toBe(false);
    expect(setState).not.toHaveBeenCalled();
  });
});
