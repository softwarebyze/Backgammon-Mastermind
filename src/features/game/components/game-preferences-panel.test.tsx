import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { cleanup, render, screen } from '@/lib/test-utils';

import { GamePreferencesPanel } from './game-preferences-panel';

jest.mock('@/lib/haptics', () => ({ hapticSelection: jest.fn() }));
// The real icon loads its font asynchronously and updates outside act().
jest.mock('@expo/vector-icons/Feather', () => ({ __esModule: true, default: () => null }));

afterEach(cleanup);

function renderPanel() {
  const noop = jest.fn();
  render(
    <GamePreferencesPanel
      preferences={DEFAULT_GAME_PREFERENCES}
      onShowMoveHintsChange={noop}
      onShowDirectionOverlayChange={noop}
      onShowPointNumbersChange={noop}
      onDiceDisplayStyleChange={noop}
      onAutoRollChange={noop}
      onAutoMoveWhenForcedChange={noop}
      onSoundEnabledChange={noop}
      onTutorModeChange={noop}
      onConfirmMoveChange={noop}
      onMoveInDiceOrderChange={noop}
      onComputerLevelChange={noop}
      showHints
    />,
  );
}

// Replaces the settings-no-fast-mode Maestro flow. Fast computer used to be a
// toggle here; pace is now one default, so the row must not come back.
it('lists the game toggles without the retired Fast computer row', () => {
  renderPanel();
  const switches = screen.getAllByRole('switch').map(row => row.props.accessibilityLabel ?? '');
  expect(switches.join('\n')).not.toMatch(/fast/i);
  expect(screen.queryByText(/fast computer/i)).toBeNull();
  for (const name of ['Move hints', 'Auto-roll dice', 'Auto-move when forced', 'Move in dice order']) {
    expect(screen.getByRole('switch', { name })).toBeTruthy();
  }
  expect(screen.getByText('Dice display')).toBeTruthy();
});
