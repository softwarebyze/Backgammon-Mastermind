/**
 * Pausing during the replay's end hold must keep the final position on
 * screen. Resetting as soon as the 1.5s timer fires snaps the board back
 * to the start while the player still has pause pressed.
 */
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game/types';

import { createInitialState } from '@/lib/game/constants';
import { getLegalMoves } from '@/lib/game/moves';
import { act, cleanup, fireEvent, render, screen } from '@/lib/test-utils';

import { AnimatedPathBoard } from './animated-path-board';

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({ preferences: { showPointNumbers: false } }),
}));

let shown: GameState | null = null;
let frame: MoveAnimationFrame | null = null;

jest.mock('@/features/game/components/board/board-view', () => ({
  BoardView: ({
    state,
    moveAnimation,
  }: {
    state: GameState;
    moveAnimation: MoveAnimationFrame | null;
  }) => {
    shown = state;
    frame = moveAnimation;
    return null;
  },
}));

function boardKey(state: GameState): string {
  return state.points.map(p => `${p.player ?? '-'}:${p.count}`).join('|');
}

function movingWhite(): GameState {
  const s = createInitialState('vs-computer');
  s.phase = 'moving';
  s.currentPlayer = 'white';
  s.dice = [3, 1];
  s.remainingDice = [3, 1];
  return s;
}

jest.useFakeTimers();

afterEach(() => {
  cleanup();
  shown = null;
  frame = null;
  jest.clearAllTimers();
});

describe('path replay pause', () => {
  it('does not snap back to the start when paused during the end hold', async () => {
    const base = movingWhite();
    const move = getLegalMoves(base)[0]!;
    render(
      <AnimatedPathBoard
        baseState={base}
        moves={[move]}
        label="Your move"
        tone="mine"
        boardWidth={320}
        testID="path-replay"
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    expect(frame?.onFinish).toEqual(expect.any(Function));

    await act(async () => {
      frame!.onFinish();
    });
    await act(async () => {
      jest.advanceTimersByTime(280);
    });

    const played = boardKey(shown!);
    expect(played).not.toBe(boardKey(base));

    // Partway through the 1.5s end hold, the player pauses.
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(screen.getByTestId('path-replay-play-pause'));

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(boardKey(shown!)).toBe(played);

    fireEvent.press(screen.getByTestId('path-replay-play-pause'));
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(boardKey(shown!)).toBe(boardKey(base));
  });
});
