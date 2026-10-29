import type { GameState } from '@/lib/game';
import { useState } from 'react';
import { createPositionState } from '@/lib/game/create-position';
import { playGameSfx } from '@/lib/game-sfx/play-game-sfx';
import { act, renderHook } from '@/lib/test-utils';
import { BLOCKED_SFX_DELAY_MS, useGameDiceActions } from './use-game-dice-actions';

jest.mock('@/lib/game-sfx/play-game-sfx', () => ({ playGameSfx: jest.fn() }));
jest.mock('@/lib/game', () => ({
  ...jest.requireActual('@/lib/game'),
  rollDice: () => [3, 5],
}));

const play = jest.mocked(playGameSfx);

function renderDice(initial: GameState) {
  return renderHook(() => {
    const [state, setState] = useState<GameState | null>(initial);
    const actions = useGameDiceActions({ state, setState, isAnimating: false, recordNoMove: jest.fn() });
    return { state, ...actions };
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  play.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

it('plays the blocked cue after the dice land when the roll has no legal move', () => {
  // White on the bar facing a closed black home board: 3-5 cannot enter.
  const closed = [19, 20, 21, 22, 23, 24].map(point => ({ point, player: 'black' as const, count: 2 }));
  const { result } = renderDice(createPositionState({ placements: closed, bar: { white: 1 }, mode: 'vs-human' }));

  act(() => result.current.doRollDice());
  expect(result.current.state?.phase).toBe('no-move');
  expect(play).toHaveBeenCalledWith('roll');
  expect(play).not.toHaveBeenCalledWith('blocked');

  act(() => jest.advanceTimersByTime(BLOCKED_SFX_DELAY_MS));
  expect(play).toHaveBeenCalledWith('blocked');
});

it('stays quiet when the roll can be played', () => {
  const { result } = renderDice(createPositionState({ useStandardSetup: true, mode: 'vs-human' }));

  act(() => result.current.doRollDice());
  act(() => jest.advanceTimersByTime(BLOCKED_SFX_DELAY_MS));
  expect(result.current.state?.phase).toBe('moving');
  expect(play).not.toHaveBeenCalledWith('blocked');
});
