import type { GuidanceSession } from '../guidance-store';

import { createInitialState } from '@/lib/game/constants';
import { act, cleanup, fireEvent, render, screen, within } from '@/lib/test-utils';

import { clearGuidance, getGuidance, showGuidance } from '../guidance-store';
import { GuidanceModal } from './guidance-modal';

jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
}));

const mockTutorRevertTurn = jest.fn();
const mockDoUndo = jest.fn();
const mockSetTutorMode = jest.fn();
let mockCanUndo = true;

jest.mock('@/features/game/use-game', () => ({
  useGame: () => ({
    tutorRevertTurn: mockTutorRevertTurn,
    doUndo: mockDoUndo,
    canUndo: mockCanUndo,
  }),
}));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({
    setTutorMode: mockSetTutorMode,
    preferences: {
      showMoveHints: false,
      showDirectionOverlay: false,
      showPointNumbers: false,
    },
  }),
}));

function blunderSession(): Omit<GuidanceSession, 'id'> {
  const questionState = createInitialState('vs-computer');
  questionState.dice = [6, 1];
  questionState.remainingDice = [6, 1];
  return {
    kind: 'blunder',
    questionState,
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
  mockDoUndo.mockClear();
  mockSetTutorMode.mockClear();
  mockCanUndo = true;
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
    expect(screen.getByText('Your move vs the best move')).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
    expect(screen.getByText(/13\/10/)).toBeTruthy();

    // …or go back to the unspoiled question.
    fireEvent.press(screen.getByTestId('guidance-back-to-question'));
    expect(screen.getByText(/3rd-best of 18 ways/)).toBeTruthy();
    expect(screen.queryByText(/Best:/)).toBeNull();
    expect(screen.queryByText(/You played:/)).toBeNull();
    expect(screen.getByTestId('guidance-show-mine')).toBeTruthy();
  });

  it('undo last move rewinds a single die move and closes the modal', () => {
    renderQuestion();

    fireEvent.press(screen.getByTestId('guidance-undo-last-move'));

    expect(mockDoUndo).toHaveBeenCalledTimes(1);
    expect(mockTutorRevertTurn).not.toHaveBeenCalled();
    expect(screen.queryByTestId('guidance-modal')).toBeNull();
  });

  it('hides undo last move when there is nothing to undo', () => {
    mockCanUndo = false;
    renderQuestion();

    expect(screen.queryByTestId('guidance-undo-last-move')).toBeNull();
    // The whole-turn take-back is still available.
    expect(screen.getByTestId('guidance-take-back')).toBeTruthy();
  });

  it('show my move renders the animated replay board for the player path', () => {
    renderQuestion();

    fireEvent.press(screen.getByTestId('guidance-show-mine'));

    expect(screen.getByTestId('guidance-compare-mine')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-engine')).toBeNull();
  });
});

describe('guidance modal solution', () => {
  it('reveal opens on the best move; the view toggle switches boards', () => {
    renderQuestion();

    fireEvent.press(screen.getByTestId('guidance-reveal'));
    expect(screen.getByText(/You played:/)).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
    expect(screen.getByText(/6\/5/)).toBeTruthy();
    expect(screen.getByText(/13\/10/)).toBeTruthy();
    // The learner asked to see the best move, so the best board is up first.
    expect(screen.getByTestId('guidance-view-toggle')).toBeTruthy();
    expect(screen.getByTestId('guidance-compare-engine')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-mine')).toBeNull();

    // Mine shows only the player's replay.
    fireEvent.press(screen.getByTestId('guidance-view-mine'));
    expect(screen.getByTestId('guidance-compare-mine')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-engine')).toBeNull();

    // Both stacks the two replays.
    fireEvent.press(screen.getByTestId('guidance-view-both'));
    expect(screen.getByTestId('guidance-compare-mine')).toBeTruthy();
    expect(screen.getByTestId('guidance-compare-engine')).toBeTruthy();

    // Start shows the shared starting position with no replay controls.
    fireEvent.press(screen.getByTestId('guidance-view-start'));
    expect(screen.getByTestId('guidance-compare-start')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-start-play-pause')).toBeNull();
    expect(screen.queryByTestId('guidance-compare-mine')).toBeNull();
    expect(screen.queryByTestId('guidance-compare-engine')).toBeNull();

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
    // Labeled candidate rows, not raw numbers alone. The view toggle also
    // renders a "Best" label, so scope the query to the details section.
    const details = screen.getByTestId('guidance-details');
    expect(within(details).getByText('Best')).toBeTruthy();
    expect(within(details).getByText('3rd (yours)')).toBeTruthy();
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

  it('solution shows the dice rolled on the reviewed turn', () => {
    renderQuestion();

    // Mine-only view shows the roll…
    fireEvent.press(screen.getByTestId('guidance-show-mine'));
    expect(screen.getByTestId('guidance-roll')).toBeTruthy();
    expect(screen.getByText('You rolled 6–1')).toBeTruthy();

    // …and so does the full comparison.
    fireEvent.press(screen.getByTestId('guidance-back-to-question'));
    fireEvent.press(screen.getByTestId('guidance-reveal'));
    expect(screen.getByText('You rolled 6–1')).toBeTruthy();
  });

  it('view toggle switches between mine, best, both, and start boards', () => {
    renderQuestion();
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    // Starts on the best move the learner asked for.
    expect(screen.getByTestId('guidance-compare-engine')).toBeTruthy();

    fireEvent.press(screen.getByTestId('guidance-view-mine'));
    expect(screen.getByTestId('guidance-compare-mine')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-engine')).toBeNull();

    // Toggling boards keeps the modal open on the solution.
    expect(screen.getByTestId('guidance-modal')).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
  });
});

describe('guidance modal reveal state', () => {
  it('mine-only -> back -> full reveal opens on the best move', () => {
    renderQuestion();

    fireEvent.press(screen.getByTestId('guidance-show-mine'));
    // Mine-only: the best move stays hidden.
    expect(screen.queryByText(/Best:/)).toBeNull();
    expect(getGuidance()?.revealMineOnly).toBe(true);
    expect(getGuidance()?.showEngine).toBe(false);

    fireEvent.press(screen.getByTestId('guidance-back-to-question'));
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    const session = getGuidance();
    expect(session?.revealed).toBe(true);
    expect(session?.revealMineOnly).toBe(false);
    expect(session?.showMine).toBe(true);
    expect(session?.showEngine).toBe(true);
    // The full comparison is back, opening on the best move.
    expect(screen.getByText(/You played:/)).toBeTruthy();
    expect(screen.getByText(/Best:/)).toBeTruthy();
    expect(screen.getByTestId('guidance-view-toggle')).toBeTruthy();
    expect(screen.getByTestId('guidance-compare-engine')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-mine')).toBeNull();
  });

  it('switching views -> back -> re-reveal resets to the best move', () => {
    renderQuestion();
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    // The learner picks a different board…
    fireEvent.press(screen.getByTestId('guidance-view-mine'));
    expect(screen.getByTestId('guidance-compare-mine')).toBeTruthy();

    // …goes back and reveals again: the default view is restored.
    fireEvent.press(screen.getByTestId('guidance-back-to-question'));
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    const session = getGuidance();
    expect(session?.revealed).toBe(true);
    expect(screen.getByTestId('guidance-compare-engine')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-mine')).toBeNull();
  });

  it('a fresh blunder session opens on the best move', () => {
    renderQuestion();
    fireEvent.press(screen.getByTestId('guidance-reveal'));
    fireEvent.press(screen.getByTestId('guidance-view-mine'));
    expect(screen.getByTestId('guidance-compare-mine')).toBeTruthy();

    // Next turn's blunder replaces the session wholesale.
    act(() => {
      showGuidance(blunderSession());
    });
    fireEvent.press(screen.getByTestId('guidance-reveal'));

    const session = getGuidance();
    expect(session?.revealed).toBe(true);
    expect(session?.revealMineOnly).toBeFalsy();
    // The new session starts on the best view, not the previous pick.
    expect(screen.getByTestId('guidance-compare-engine')).toBeTruthy();
    expect(screen.queryByTestId('guidance-compare-mine')).toBeNull();
  });
});
