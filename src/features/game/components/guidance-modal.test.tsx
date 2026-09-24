import type { GuidanceSession } from '../guidance-store';

import { createInitialState } from '@/lib/game/constants';
import { act, cleanup, fireEvent, render, screen } from '@/lib/test-utils';

import { GuidanceModal } from './guidance-modal';
import { clearGuidance, showGuidance } from '../guidance-store';

jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
}));

const mockTutorRevertTurn = jest.fn();
const mockSetTutorMode = jest.fn();

jest.mock('@/features/game/use-game', () => ({
  useGame: () => ({ tutorRevertTurn: mockTutorRevertTurn }),
}));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({ setTutorMode: mockSetTutorMode }),
}));

function blunderSession(): Omit<GuidanceSession, 'id'> {
  return {
    kind: 'blunder',
    questionState: createInitialState('vs-computer'),
    myMoves: [{ from: 6, to: 5, dieIndex: 1 }],
    engineMoves: [{ from: 13, to: 10, dieIndex: 0 }],
    revealed: false,
    showMine: true,
    showEngine: true,
    verdict: {
      loss: 0.117,
      playedRank: 3,
      candidateCount: 18,
      candidateEquities: [0.5, 0.45, 0.383],
      bestEquity: 0.5,
    },
  };
}

beforeEach(() => {
  mockTutorRevertTurn.mockClear();
  mockSetTutorMode.mockClear();
});

afterEach(() => {
  cleanup();
  clearGuidance();
});

describe('GuidanceModal', () => {
  it('renders nothing without a blunder session', () => {
    render(<GuidanceModal />);
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('question view explains the mistake without revealing the answer', () => {
    act(() => {
      showGuidance(blunderSession());
    });
    render(<GuidanceModal />);

    expect(screen.getByTestId('guidance-modal')).toBeTruthy();
    expect(screen.getByText('Mistake')).toBeTruthy();
    // Plain-language question copy…
    expect(screen.getByText(/3rd-best of 18 ways/)).toBeTruthy();
    // …but no recommended-move notation anywhere in the question view.
    expect(screen.queryByText(/Best:/)).toBeNull();
    expect(screen.queryByText(/13\/10/)).toBeNull();
    // Actions available from the question.
    expect(screen.getByTestId('guidance-take-back')).toBeTruthy();
    expect(screen.getByTestId('guidance-reveal')).toBeTruthy();
    expect(screen.getByTestId('guidance-keep-move')).toBeTruthy();
    expect(screen.getByTestId('guidance-turn-off')).toBeTruthy();
  });

  it('reveal shows both paths side by side, and back returns to the question', () => {
    act(() => {
      showGuidance(blunderSession());
    });
    render(<GuidanceModal />);

    fireEvent.press(screen.getByTestId('guidance-reveal'));
    expect(screen.getByText(/You played:/)).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
    expect(screen.getByText(/6\/5/)).toBeTruthy();
    expect(screen.getByText(/13\/10/)).toBeTruthy();
    // Path toggles for the two arrow sets.
    expect(screen.getByTestId('guidance-toggle-mine')).toBeTruthy();
    expect(screen.getByTestId('guidance-toggle-engine')).toBeTruthy();

    fireEvent.press(screen.getByTestId('guidance-back-to-question'));
    // Back at the question: the answer is hidden again.
    expect(screen.getByText(/3rd-best of 18 ways/)).toBeTruthy();
    expect(screen.queryByText(/Best:/)).toBeNull();
    expect(screen.getByTestId('guidance-reveal')).toBeTruthy();
  });

  it('details are collapsed until the player asks for them', () => {
    act(() => {
      showGuidance(blunderSession());
    });
    render(<GuidanceModal />);
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    expect(screen.queryByTestId('guidance-details')).toBeNull();
    fireEvent.press(screen.getByTestId('guidance-details-toggle'));
    expect(screen.getByTestId('guidance-details')).toBeTruthy();
    expect(screen.getByText(/ranked 3rd of 18/)).toBeTruthy();
    // Labeled candidate rows, not raw numbers alone.
    expect(screen.getByText('Best')).toBeTruthy();
    expect(screen.getByText('3rd (yours)')).toBeTruthy();
  });

  it('take back reverts the turn and closes the modal', () => {
    const session = blunderSession();
    act(() => {
      showGuidance(session);
    });
    render(<GuidanceModal />);

    fireEvent.press(screen.getByTestId('guidance-take-back'));
    expect(mockTutorRevertTurn).toHaveBeenCalledWith(session.questionState, 1);
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('keep my move closes the modal without reverting', () => {
    act(() => {
      showGuidance(blunderSession());
    });
    render(<GuidanceModal />);

    fireEvent.press(screen.getByTestId('guidance-keep-move'));
    expect(mockTutorRevertTurn).not.toHaveBeenCalled();
    expect(mockSetTutorMode).not.toHaveBeenCalled();
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('turn tutor off persists the preference and closes the modal', () => {
    act(() => {
      showGuidance(blunderSession());
    });
    render(<GuidanceModal />);

    fireEvent.press(screen.getByTestId('guidance-turn-off'));
    expect(mockSetTutorMode).toHaveBeenCalledWith(false);
    expect(mockTutorRevertTurn).not.toHaveBeenCalled();
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('path toggles flip arrow visibility', () => {
    act(() => {
      showGuidance(blunderSession());
    });
    render(<GuidanceModal />);
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    const mine = screen.getByTestId('guidance-toggle-mine');
    fireEvent.press(mine);
    // Toggling updates the session; the modal stays open on the solution.
    expect(screen.getByTestId('guidance-modal')).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
  });
});
