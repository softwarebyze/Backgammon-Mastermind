import type { EngineHint } from '@/features/game/engine-hint';

import { getEngineHint } from '@/features/game/engine-hint';
import { clearGuidance, getGuidance } from '@/features/game/guidance-store';
import { createInitialState } from '@/lib/game/constants';
import { act, fireEvent, render, screen } from '@/lib/test-utils';
import { HintButton } from './hint-button';

jest.mock('@/features/game/engine-hint', () => ({ getEngineHint: jest.fn() }));
jest.mock('@/features/game/use-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the hook's export name
  useGame: () => ({ isAnimating: false, doMoveSequence: jest.fn() }),
}));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const getEngineHintMock = jest.mocked(getEngineHint);

afterEach(() => {
  clearGuidance();
  getEngineHintMock.mockReset();
});

it('drops an engine answer that arrives after the hint screen unmounts', async () => {
  let resolveHint!: (hint: EngineHint) => void;
  getEngineHintMock.mockImplementation(() => new Promise((resolve) => {
    resolveHint = resolve;
  }));
  const state = createInitialState('vs-computer');
  state.phase = 'moving';
  state.dice = [3, 1];
  state.remainingDice = [3, 1];

  const { unmount } = render(<HintButton state={state} moveLogLength={0} />);
  fireEvent.press(screen.getByTestId('hint-button'));
  expect(screen.getByTestId('hint-loading')).toBeTruthy();
  unmount();

  await act(async () => {
    resolveHint({
      moves: [{ from: 8, to: 5, dieIndex: 0 }],
      notation: '8/5',
      ms: 1,
      engineId: 'bgsage',
    });
  });
  expect(getGuidance()).toBeNull();
});
