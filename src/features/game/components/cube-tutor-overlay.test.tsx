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
afterEach(cleanup);

function show(session: CubeTutorSession, canTakeBack: boolean) {
  Object.assign(mockGame, { cubeTutorSession: session, dismissCubeTutor: jest.fn(), takeBackCubeDecision: jest.fn(), canTakeBackCubeDecision: canTakeBack });
  setup(<CubeTutorOverlay />);
}
const state = createPositionState({ useStandardSetup: true, match: createMatch(0) });

it('names the mistake, shows both choices and how costly it was', () => {
  show({ state, phase: 'mistake', attempted: 'roll', loss: 0.12, analysis: { actor: 'white', best: 'offer', values: { roll: 0.3, offer: 0.42 } } }, false);
  expect(screen.getByTestId('cube-tutor-title')).toHaveTextContent('Missed double');
  expect(screen.getByTestId('cube-tutor-yours')).toHaveTextContent('You chose: No double');
  expect(screen.getByTestId('cube-tutor-recommendation')).toHaveTextContent('Best: Double');
  expect(screen.getByTestId('guidance-blunder-meter')).toBeTruthy();
  expect(screen.queryByTestId('cube-tutor-take-back')).toBeNull();
  fireEvent.press(screen.getByTestId('cube-tutor-dismiss'));
  expect(mockGame.dismissCubeTutor).toHaveBeenCalledTimes(1);
});

it('offers Take back when no dice were seen', () => {
  show({ state, phase: 'mistake', attempted: 'accept', loss: 0.3, analysis: { actor: 'white', best: 'drop', values: { accept: -1.3, drop: -1 } } }, true);
  fireEvent.press(screen.getByTestId('cube-tutor-take-back'));
  expect(mockGame.takeBackCubeDecision).toHaveBeenCalledTimes(1);
});

it('shows nothing while the choice is being checked', () => {
  show({ state, phase: 'checking', attempted: 'roll' }, false);
  expect(screen.queryByTestId('cube-tutor')).toBeNull();
});

it.each([
  ['offer', 'roll', 'Too soon to double'],
  ['accept', 'drop', 'That was a pass'],
  ['drop', 'accept', 'That was a take'],
  ['beaver', 'accept', 'There was a better cube choice'],
] as const)('titles %s against %s', (attempted, best, title) => {
  expect(cubeMistakeTitle(attempted, best)).toBe(title);
});
