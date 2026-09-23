/**
 * Focused tests for the XG-style tutor blunder modal: the blundered
 * position stays on the board, the modal reports rank + candidate
 * equities, and each action does exactly what it promises — nothing is
 * auto-replaced.
 */
import type { GameState } from '@/lib/game/types';

import { fireEvent } from '@testing-library/react-native';

import { createInitialState } from '@/lib/game/constants';
import { act, cleanup, render, screen } from '@/lib/test-utils';

import { setHintArrows } from '../hint-arrows-store';
import { clearTutorBlunder, showTutorBlunder } from '../tutor-store';
import { TutorBlunderModal } from './tutor-blunder-modal';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

const mockRevert = jest.fn();
const mockSetTutorMode = jest.fn();

jest.mock('@/features/game/use-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGame: () => ({ tutorRevertTurn: mockRevert }),
}));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({ setTutorMode: mockSetTutorMode }),
}));

jest.mock('../hint-arrows-store', () => ({
  setHintArrows: jest.fn(),
}));

const setHintArrowsMock = jest.mocked(setHintArrows);

function blunderState(): GameState {
  const s = createInitialState('vs-computer');
  s.currentPlayer = 'white';
  s.phase = 'moving';
  return s;
}

function openPrompt() {
  showTutorBlunder({
    bestNotation: '13/11 · 8/5',
    loss: 0.12,
    bestMoves: [],
    startState: blunderState(),
    movesMade: 2,
    candidateEquities: [0.5, 0.38, 0.3],
    playedRank: 3,
    candidateCount: 8,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockRevert.mockClear();
  mockSetTutorMode.mockClear();
  setHintArrowsMock.mockClear();
});

afterEach(() => {
  cleanup();
  clearTutorBlunder();
  jest.useRealTimers();
});

describe('tutor blunder modal', () => {
  it('reports the best move, candidate equities, and all four actions', () => {
    openPrompt();
    render(<TutorBlunderModal />);
    expect(screen.getByTestId('tutor-blunder-modal')).toBeTruthy();
    expect(screen.getByText('Big blunder!')).toBeTruthy();
    // Best-move notation is its own text node.
    expect(screen.getByText(/13\/11/)).toBeTruthy();
    expect(screen.getByTestId('tutor-candidates')).toBeTruthy();
    expect(screen.getByTestId('tutor-take-back')).toBeTruthy();
    expect(screen.getByTestId('tutor-hint')).toBeTruthy();
    expect(screen.getByTestId('tutor-keep-move')).toBeTruthy();
    expect(screen.getByTestId('tutor-turn-off')).toBeTruthy();
  });

  it('take back dismisses and reverts to the turn start', () => {
    openPrompt();
    render(<TutorBlunderModal />);
    fireEvent.press(screen.getByTestId('tutor-take-back'));
    expect(mockRevert).toHaveBeenCalledTimes(1);
    const [startState, movesMade] = mockRevert.mock.calls[0];
    expect((startState as GameState).currentPlayer).toBe('white');
    expect(movesMade).toBe(2);
    // Prompt cleared → modal renders nothing.
    expect(screen.queryByTestId('tutor-blunder-modal')).toBeNull();
  });

  it('keep my move dismisses without reverting', () => {
    openPrompt();
    render(<TutorBlunderModal />);
    fireEvent.press(screen.getByTestId('tutor-keep-move'));
    expect(mockRevert).not.toHaveBeenCalled();
    expect(screen.queryByTestId('tutor-blunder-modal')).toBeNull();
  });

  it('turn tutor off disables the preference and dismisses', () => {
    openPrompt();
    render(<TutorBlunderModal />);
    fireEvent.press(screen.getByTestId('tutor-turn-off'));
    expect(mockSetTutorMode).toHaveBeenCalledWith(false);
    expect(mockRevert).not.toHaveBeenCalled();
    expect(screen.queryByTestId('tutor-blunder-modal')).toBeNull();
  });

  it('hint reverts to the turn start and draws the suggestion arrows', () => {
    openPrompt();
    render(<TutorBlunderModal />);
    fireEvent.press(screen.getByTestId('tutor-hint'));
    expect(mockRevert).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('tutor-blunder-modal')).toBeNull();
    // The arrows are drawn on a tick so the revert's setState lands first.
    expect(setHintArrowsMock).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(setHintArrowsMock).toHaveBeenCalledTimes(1);
  });
});
