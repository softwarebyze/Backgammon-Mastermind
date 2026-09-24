import type { GuidanceSession } from '../guidance-store';

import { createInitialState } from '@/lib/game/constants';
import { act, cleanup, fireEvent, render, screen } from '@/lib/test-utils';

import { clearGuidance, showGuidance } from '../guidance-store';
import { GuidanceModal } from './guidance-modal';

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

/** Opens a blunder prompt and renders the modal, the common test setup. */
function renderQuestion(session: Omit<GuidanceSession, 'id'> = blunderSession()) {
  act(() => {
    showGuidance(session);
  });
  render(<GuidanceModal />);
}

beforeEach(() => {
  mockTutorRevertTurn.mockClear();
  mockSetTutorMode.mockClear();
});

afterEach(() => {
  cleanup();
  clearGuidance();
});

describe('guidance modal question', () => {
  it('renders nothing without a blunder session', () => {
    render(<GuidanceModal />);
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('question view explains the mistake without revealing the answer', () => {
    renderQuestion();

    expect(screen.getByTestId('guidance-modal')).toBeTruthy();
    // Title and meter agree on the severity word.
    expect(screen.getAllByText('Mistake')).toHaveLength(2);
    // Plain-language question copy…
    expect(screen.getByText(/3rd-best of 18 ways/)).toBeTruthy();
    // …a visual blunder scale…
    expect(screen.getByTestId('guidance-blunder-meter')).toBeTruthy();
    // …but no recommended-move notation anywhere in the question view.
    expect(screen.queryByText(/Best:/)).toBeNull();
    expect(screen.queryByText(/13\/10/)).toBeNull();
    // Actions available from the question.
    expect(screen.getByTestId('guidance-take-back')).toBeTruthy();
    expect(screen.getByTestId('guidance-reveal')).toBeTruthy();
    expect(screen.getByTestId('guidance-show-mine')).toBeTruthy();
    expect(screen.getByTestId('guidance-keep-move')).toBeTruthy();
    expect(screen.getByTestId('guidance-turn-off')).toBeTruthy();
  });

  it('show my move reveals only the player path; the best move stays hidden', () => {
    renderQuestion();

    fireEvent.press(screen.getByTestId('guidance-show-mine'));

    expect(screen.getByText('Your move')).toBeTruthy();
    expect(screen.getByText(/You played:/)).toBeTruthy();
    expect(screen.getByText(/6\/5/)).toBeTruthy();
    // The answer is not spoiled: no best-move notation, chips, or details.
    expect(screen.queryByText(/Best:/)).toBeNull();
    expect(screen.queryByText(/13\/10/)).toBeNull();
    expect(screen.queryByTestId('guidance-toggle-mine')).toBeNull();
    expect(screen.queryByTestId('guidance-toggle-engine')).toBeNull();
    expect(screen.queryByTestId('guidance-details-toggle')).toBeNull();

    // From here the player can still reveal the best move…
    fireEvent.press(screen.getByTestId('guidance-reveal'));
    expect(screen.getByText('The best move')).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
    expect(screen.getByText(/13\/10/)).toBeTruthy();

    // …or go back to the unspoiled question.
    fireEvent.press(screen.getByTestId('guidance-back-to-question'));
    expect(screen.getByText(/3rd-best of 18 ways/)).toBeTruthy();
    expect(screen.queryByText(/Best:/)).toBeNull();
    expect(screen.queryByText(/You played:/)).toBeNull();
    expect(screen.getByTestId('guidance-show-mine')).toBeTruthy();
  });
});

describe('guidance modal solution', () => {
  it('reveal shows both paths side by side, and back returns to the question', () => {
    renderQuestion();

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
    renderQuestion();
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
    renderQuestion(session);

    fireEvent.press(screen.getByTestId('guidance-take-back'));
    expect(mockTutorRevertTurn).toHaveBeenCalledWith(session.questionState, 1);
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('keep my move closes the modal without reverting', () => {
    renderQuestion();

    fireEvent.press(screen.getByTestId('guidance-keep-move'));
    expect(mockTutorRevertTurn).not.toHaveBeenCalled();
    expect(mockSetTutorMode).not.toHaveBeenCalled();
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('turn tutor off persists the preference and closes the modal', () => {
    renderQuestion();

    fireEvent.press(screen.getByTestId('guidance-turn-off'));
    expect(mockSetTutorMode).toHaveBeenCalledWith(false);
    expect(mockTutorRevertTurn).not.toHaveBeenCalled();
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('path toggles flip arrow visibility', () => {
    renderQuestion();
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    const mine = screen.getByTestId('guidance-toggle-mine');
    fireEvent.press(mine);
    // Toggling updates the session; the modal stays open on the solution.
    expect(screen.getByTestId('guidance-modal')).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
  });
});
