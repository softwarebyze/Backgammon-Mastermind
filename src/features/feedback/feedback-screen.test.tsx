import { cleanup, fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { FeedbackScreen } from './feedback-screen';

const mockCapture = jest.fn();
const mockFlush = jest.fn(async () => {});
const mockPostHog = { capture: mockCapture, flush: mockFlush, isDisabled: false, optedOut: false };
const mockOpen = jest.fn(async (_url: string) => {});
const mockBack = jest.fn();

jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn(() => mockPostHog) }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack() }, useIsFocused: jest.fn(() => false) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('@/lib/app-links', () => ({
  APP_LINKS: { supportEmail: 'support@example.test' },
  openExternalUrl: (url: string) => mockOpen(url),
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockPostHog.isDisabled = false;
});

it('keeps Send disabled until there is a title or details', () => {
  render(<FeedbackScreen />);
  fireEvent.press(screen.getByTestId('feedback-send'));
  expect(mockOpen).not.toHaveBeenCalled();
  expect(screen.getByTestId('feedback-send').props.accessibilityState).toMatchObject({ disabled: true });
});

it('sends the note to PostHog, delivers it right away and closes', async () => {
  render(<FeedbackScreen />);
  fireEvent.changeText(screen.getByTestId('feedback-title'), 'Resume does nothing');
  fireEvent.changeText(screen.getByTestId('feedback-details'), 'Tapped resume twice.');
  fireEvent.press(screen.getByTestId('feedback-send'));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCapture).toHaveBeenCalledWith('feedback_submitted', expect.objectContaining({ title: 'Resume does nothing', details: 'Tapped resume twice.' }));
  expect(mockFlush).toHaveBeenCalledTimes(1);
  expect(mockOpen).not.toHaveBeenCalled();
});

it('falls back to email when analytics is off', async () => {
  mockPostHog.isDisabled = true;
  render(<FeedbackScreen />);
  fireEvent.changeText(screen.getByTestId('feedback-details'), 'Tapped resume twice.');
  fireEvent.press(screen.getByTestId('feedback-send'));
  await waitFor(() => expect(mockOpen).toHaveBeenCalledTimes(1));
  expect(mockCapture).not.toHaveBeenCalled();
  expect(decodeURIComponent(mockOpen.mock.calls[0]![0])).toContain('Tapped resume twice.');
});

it('still offers email, for attaching a screenshot', async () => {
  render(<FeedbackScreen />);
  fireEvent.changeText(screen.getByTestId('feedback-title'), 'Look at this');
  fireEvent.press(screen.getByTestId('feedback-email'));
  await waitFor(() => expect(mockOpen).toHaveBeenCalledTimes(1));
  expect(mockOpen.mock.calls[0]![0].startsWith('mailto:support@example.test?subject=')).toBe(true);
});

it('ignores a second tap while the note is being sent', async () => {
  let finish = () => {};
  mockFlush.mockImplementationOnce(() => new Promise<void>((resolve) => {
    finish = resolve;
  }));
  render(<FeedbackScreen />);
  fireEvent.changeText(screen.getByTestId('feedback-title'), 'Twice');
  fireEvent.press(screen.getByTestId('feedback-send'));
  fireEvent.press(screen.getByTestId('feedback-send'));
  expect(mockCapture).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});
