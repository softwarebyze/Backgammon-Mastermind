import { cleanup, fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { FeedbackScreen } from './feedback-screen';

const mockCapture = jest.fn();
const mockOpen = jest.fn(async (_url: string) => {});
const mockBack = jest.fn();

jest.mock('posthog-react-native', () => ({ usePostHog: () => ({ capture: mockCapture }) }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack() }, useIsFocused: () => false }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('@/lib/app-links', () => ({
  APP_LINKS: { supportEmail: 'support@example.test' },
  openExternalUrl: (url: string) => mockOpen(url),
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

it('keeps Send disabled until there is a title or details', () => {
  render(<FeedbackScreen />);
  fireEvent.press(screen.getByTestId('feedback-send'));
  expect(mockOpen).not.toHaveBeenCalled();
  expect(screen.getByTestId('feedback-send').props.accessibilityState).toMatchObject({ disabled: true });
});

it('opens a prefilled mail and records the note', async () => {
  render(<FeedbackScreen />);
  fireEvent.changeText(screen.getByTestId('feedback-title'), 'Resume does nothing');
  fireEvent.changeText(screen.getByTestId('feedback-details'), 'Tapped resume twice.');
  fireEvent.press(screen.getByTestId('feedback-send'));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCapture).toHaveBeenCalledWith('feedback_submitted', {
    title: 'Resume does nothing',
    details: 'Tapped resume twice.',
  });
  const url = mockOpen.mock.calls[0]![0];
  expect(url.startsWith('mailto:support@example.test?subject=')).toBe(true);
  expect(decodeURIComponent(url)).toContain('Tapped resume twice.');
});
