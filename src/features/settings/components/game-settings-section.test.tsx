import type { GameContextType } from '@/features/game/game-context';

import { GameContext } from '@/features/game/game-context';
import { setS1VariantsForTests } from '@/features/game/s1-prototype';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, render, screen } from '@/lib/test-utils';

import { GameSettingsSection } from './game-settings-section';

jest.mock('posthog-react-native', () => ({
  usePostHog: function postHogApi() {
    return { capture: jest.fn() };
  },
}));

afterEach(() => {
  cleanup();
  setS1VariantsForTests(null);
});

describe('game settings section without a game', () => {
  it('renders standalone settings when the prototype header is off', () => {
    setS1VariantsForTests(null);
    expect(() => render(<GameSettingsSection />)).not.toThrow();
    expect(screen.queryByTestId('settings-new-game')).toBeNull();
  });

  it('renders the slim header outside GameProvider and hides New game', () => {
    setS1VariantsForTests({ header: 'slim' });
    expect(() => render(<GameSettingsSection />)).not.toThrow();
    expect(screen.queryByTestId('settings-new-game')).toBeNull();
  });

  it('shows New game only when the slim header has a game in progress', () => {
    setS1VariantsForTests({ header: 'slim' });
    const value = {
      state: createInitialState('vs-computer'),
      resetGame: jest.fn(),
    } as unknown as GameContextType;
    render(
      <GameContext value={value}>
        <GameSettingsSection />
      </GameContext>,
    );
    expect(screen.getByTestId('settings-new-game')).toBeTruthy();
  });
});
