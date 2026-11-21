import type { CubeTutorSession } from '@/features/game/use-cube-tutor';
import { createPositionState } from '@/lib/game/create-position';
import { createMatch } from '@/lib/game/match';
import { cleanup, fireEvent, screen, setup } from '@/lib/test-utils';
import { cubeMistakeTitle } from './cube-tutor-copy';
import { CubeTutorOverlay } from './cube-tutor-overlay';

const mockGame: Record<string, unknown> = {};
jest.mock('@/features/game/use-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock preserves public hook name
  useGame: () => mockGame,
}));
jest.mock('@/features/game/use-leave-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock preserves public hook name
  useLeaveGame: () => ({ leaveGame: jest.fn() }),
}));
const mockSetTutorMode = jest.fn();
jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock preserves public hook name
  useGamePreferences: () => ({ setTutorMode: mockSetTutorMode }),
}));
afterEach(() => {
  cleanup();
  mockSetTutorMode.mockReset();
});

function show(session: CubeTutorSession) {
  Object.assign(mockGame, { cubeTutorSession: session, keepCubeDecision: jest.fn(), takeBackCubeDecision: jest.fn() });
  setup(<CubeTutorOverlay />);
}
const state = createPositionState({ useStandardSetup: true, match: createMatch(0) });

it('names the mistake, shows both choices and how costly it was', () => {
  show({ state, phase: 'mistake', attempted: 'roll', loss: 0.12, analysis: { actor: 'white', best: 'offer', values: { roll: 0.3, offer: 0.42 } } });
  expect(screen.getByTestId('cube-tutor-title')).toHaveTextContent('Missed double');
  expect(screen.getByTestId('cube-tutor-yours')).toHaveTextContent('You chose: No double');
  expect(screen.getByTestId('cube-tutor-recommendation')).toHaveTextContent('Best: Double');
  expect(screen.getByTestId('guidance-blunder-meter')).toBeTruthy();
  // A missed double can be taken back too: the retry keeps the same dice.
  fireEvent.press(screen.getByTestId('cube-tutor-take-back'));
  expect(mockGame.takeBackCubeDecision).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByTestId('cube-tutor-keep'));
  expect(mockGame.keepCubeDecision).toHaveBeenCalledTimes(1);
});

describe('a decision still waiting on the card', () => {
  const take: CubeTutorSession = { state, phase: 'mistake', attempted: 'accept', loss: 0.3, analysis: { actor: 'white', best: 'drop', values: { accept: -1.3, drop: -1 } } };

  it('can be taken back to choose again', () => {
    show(take);
    expect(screen.getByTestId('cube-tutor-take-back')).toHaveTextContent('Take back & retry');
    fireEvent.press(screen.getByTestId('cube-tutor-take-back'));
    expect(mockGame.takeBackCubeDecision).toHaveBeenCalledTimes(1);
    expect(mockGame.keepCubeDecision).not.toHaveBeenCalled();
  });

  it('can be kept', () => {
    show(take);
    fireEvent.press(screen.getByTestId('cube-tutor-keep'));
    expect(mockGame.keepCubeDecision).toHaveBeenCalledTimes(1);
  });

  it('keeps the decision when the Tutor is turned off', () => {
    show(take);
    fireEvent.press(screen.getByTestId('cube-tutor-turn-off'));
    expect(mockSetTutorMode).toHaveBeenCalledWith(false);
    expect(mockGame.keepCubeDecision).toHaveBeenCalledTimes(1);
  });
});

it('shows nothing while the choice is being checked', () => {
  show({ state, phase: 'checking', attempted: 'roll' });
  expect(screen.queryByTestId('cube-tutor')).toBeNull();
});

it('explains a failed computer cube analysis without borrowing the hint copy', () => {
  Object.assign(mockGame, {
    cubeTutorSession: null,
    computerCubeError: true,
    retryCubeAnalysis: jest.fn(),
  });
  setup(<CubeTutorOverlay />);
  expect(screen.getByText('Computer is waiting')).toBeTruthy();
  expect(screen.getByText('Couldn\'t analyze the cube — tap to retry')).toBeTruthy();
  expect(screen.queryByText('Couldn\'t find a hint — tap to retry')).toBeNull();
});

it.each([
  ['offer', 'roll', 'Too soon to double'],
  ['accept', 'drop', 'That was a pass'],
  ['drop', 'accept', 'That was a take'],
  ['beaver', 'accept', 'There was a better cube choice'],
] as const)('titles %s against %s', (attempted, best, title) => {
  expect(cubeMistakeTitle(attempted, best)).toBe(title);
});
