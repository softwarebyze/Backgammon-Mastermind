import { cleanup, fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { FeedbackScreen } from './feedback-screen';

const mockCapture = jest.fn();
const mockOpen = jest.fn(async (_url: string) => {});
const mockBack = jest.fn();

jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn(() => ({ capture: mockCapture })) }));
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

it('opens a prefilled mail and records only the size of the note', async () => {
  render(<FeedbackScreen />);
  fireEvent.changeText(screen.getByTestId('feedback-title'), 'Resume does nothing');
  fireEvent.changeText(screen.getByTestId('feedback-details'), 'Tapped resume twice.');
  fireEvent.press(screen.getByTestId('feedback-send'));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCapture).toHaveBeenCalledWith('feedback_submitted', { title_length: 19, details_length: 20 });
  expect(JSON.stringify(mockCapture.mock.calls)).not.toContain('Tapped resume');
  const url = mockOpen.mock.calls[0]![0];
  expect(url.startsWith('mailto:support@example.test?subject=')).toBe(true);
  expect(decodeURIComponent(url)).toContain('Tapped resume twice.');
});

it('ignores a second tap while the mail app is opening', async () => {
  let finish = () => {};
  mockOpen.mockImplementationOnce(() => new Promise<void>((resolve) => {
    finish = resolve;
  }));
  render(<FeedbackScreen />);
  fireEvent.changeText(screen.getByTestId('feedback-title'), 'Twice');
  fireEvent.press(screen.getByTestId('feedback-send'));
  fireEvent.press(screen.getByTestId('feedback-send'));
  expect(mockOpen).toHaveBeenCalledTimes(1);
  expect(mockCapture).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});
