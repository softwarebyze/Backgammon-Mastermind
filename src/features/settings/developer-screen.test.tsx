import { fireEvent, render, screen } from '@testing-library/react-native';
import { useGame } from '@/features/game/use-game';
import { DeveloperScreen } from '@/features/settings/developer-screen';
import { POSITION_JSON_EXAMPLE } from '@/lib/game/load-position';

jest.mock('expo-router', () => ({ Redirect: () => null, router: { replace: jest.fn() } }));
jest.mock('@/features/game/use-game', () => ({ useGame: jest.fn() }));
jest.mock('@/features/settings/developer-tools-gate', () => ({ isDeveloperToolsEnabled: () => true }));
// eslint-disable-next-line react/no-unnecessary-use-prefix -- mock preserves public hook name
jest.mock('@/lib/ui/layout-metrics', () => ({ useLayoutMetrics: () => ({ insets: { top: 0, bottom: 0, left: 0, right: 0 } }), contentEdgePadding: () => ({}) }));
jest.mock('@/features/settings/sage-lab-section', () => ({ SageLabSection: () => null }));
jest.mock('@/components/ui', () => {
  const { ScrollView, Text, View } = require('react-native');
  return { FocusAwareStatusBar: () => null, ScrollView, Text: ({ tx, ...props }: { tx?: string }) => <Text {...props}>{tx}</Text>, View };
});

beforeEach(() => {
  jest.mocked(useGame).mockReturnValue({ startFromPosition: jest.fn() } as unknown as ReturnType<typeof useGame>);
});

it('empties the JSON field with Clear, so flows never rely on the text menu', () => {
  render(<DeveloperScreen />);
  const input = screen.getByTestId('developer-json-input');
  expect(input.props.value).toBe(POSITION_JSON_EXAMPLE);
  fireEvent.press(screen.getByTestId('developer-clear-json'));
  expect(screen.getByTestId('developer-json-input').props.value).toBe('');
  fireEvent.changeText(screen.getByTestId('developer-json-input'), '{"mode":"vs-human"}');
  expect(screen.getByTestId('developer-json-input').props.value).toBe('{"mode":"vs-human"}');
});
