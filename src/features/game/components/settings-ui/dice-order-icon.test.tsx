import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { useLayoutIsRTL } from '@/lib/i18n';
import { cleanup, fireEvent, render, screen, within } from '@/lib/test-utils';

import { GamePreferencesPanel } from '../game-preferences-panel';
import { AutoMoveIcon } from './auto-move-icon';
import { DiceOrderIcon } from './dice-order-icon';

jest.mock('@/lib/i18n', () => ({
  ...jest.requireActual('@/lib/i18n'),
  useLayoutIsRTL: jest.fn(() => false),
}));
jest.mock('@/lib/haptics', () => ({ hapticSelection: jest.fn() }));

const layoutRTL = jest.mocked(useLayoutIsRTL);
beforeEach(() => layoutRTL.mockReturnValue(false));
afterEach(cleanup);

it.each([false, true])('renders ordered dice in reading direction with RTL=%s', (rtl) => {
  layoutRTL.mockReturnValue(rtl);
  render(<DiceOrderIcon />);
  const svg = screen.UNSAFE_getByType(Svg);
  expect(svg.props).toMatchObject({ width: 32, height: 32 });
  expect(screen.UNSAFE_getByType(View).props.accessible).toBe(false);
  expect(screen.UNSAFE_getAllByType(Rect)).toHaveLength(2);
  const pips = screen.UNSAFE_getAllByType(Circle);
  // First face has one pip, second face two; the complete sequence mirrors.
  expect(pips.filter(pip => pip.props.cx < 16)).toHaveLength(1);
  expect(pips.filter(pip => pip.props.cx > 16)).toHaveLength(2);
  const mirroredGroups = screen.UNSAFE_getAllByType(G)
    .filter(group => group.props.transform === 'translate(32 0) scale(-1 1)');
  expect(mirroredGroups).toHaveLength(rtl ? 1 : 0);
  expect(screen.UNSAFE_getByType(Path)).toBeTruthy();
});

it.each([false, true])('uses the existing setting palette with active=%s', (active) => {
  render(<DiceOrderIcon active={active} />);
  const color = active ? GAME_PALETTE.accent : GAME_PALETTE.textMuted;
  expect(screen.UNSAFE_getAllByType(G).find(group => group.props.fill === 'none')?.props.stroke).toBe(color);
  expect(screen.UNSAFE_getAllByType(G).find(group => group.props.fill === color)?.props.fill).toBe(color);
});

it('wires the dedicated glyph and toggle while retaining the forced-move icon', () => {
  const onChange = jest.fn();
  const noop = jest.fn();
  render(
    <GamePreferencesPanel
      preferences={{ ...DEFAULT_GAME_PREFERENCES, moveInDiceOrder: true }}
      onShowMoveHintsChange={noop}
      onShowDirectionOverlayChange={noop}
      onShowPointNumbersChange={noop}
      onDiceDisplayStyleChange={noop}
      onAutoRollChange={noop}
      onAutoMoveWhenForcedChange={noop}
      onSoundEnabledChange={noop}
      onTutorModeChange={noop}
      onConfirmMoveChange={noop}
      onMoveInDiceOrderChange={onChange}
    />,
  );
  const row = screen.getByRole('switch', { name: 'Move in dice order' });
  expect(within(row).UNSAFE_getByType(DiceOrderIcon).props.active).toBe(true);
  expect(screen.UNSAFE_getAllByType(AutoMoveIcon)).toHaveLength(1);
  fireEvent.press(row);
  expect(onChange).toHaveBeenCalledWith(false);
});
