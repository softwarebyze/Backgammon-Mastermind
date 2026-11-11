import type { LessonFeedback } from './use-lesson-session';
import { renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import { cleanup, render, screen } from '@/lib/test-utils';
import { CoachCaption } from './coach-caption';
import { useAnnounceFeedback } from './use-announce-feedback';

afterEach(cleanup);

describe('coach caption feedback (#304)', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    // React Native's preset already mocks announceForAccessibility, so spyOn
    // returns that mock: clear its calls too, not only restore it.
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('announces new feedback to VoiceOver on iOS, once per feedback', () => {
    Platform.OS = 'ios';
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const feedback: LessonFeedback = { tone: 'soft', messageKey: 'learn.feedback.illegal' };
    const { rerender } = renderHook(({ value }: { value: LessonFeedback | null }) => useAnnounceFeedback(value), { initialProps: { value: null as LessonFeedback | null } });
    expect(announce).not.toHaveBeenCalled();
    rerender({ value: feedback });
    rerender({ value: feedback });
    expect(announce).toHaveBeenCalledTimes(1);
    // A different message is new feedback and is announced too.
    rerender({ value: { tone: 'soft', messageKey: 'learn.feedback.legal_but_wrong' } });
    expect(announce).toHaveBeenCalledTimes(2);
  });

  // A live region stays silent when the text does not change, so TalkBack would
  // say "Not quite" only once however many times the learner taps wrong.
  it('announces the same wrong tap again on Android, with no live region to double it', () => {
    Platform.OS = 'android';
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    // Two wrong taps: two feedback objects with the same text.
    const first: LessonFeedback = { tone: 'soft', messageKey: 'learn.feedback.illegal' };
    const second: LessonFeedback = { tone: 'soft', messageKey: 'learn.feedback.illegal' };
    const { rerender } = renderHook(({ value }: { value: LessonFeedback | null }) => useAnnounceFeedback(value), { initialProps: { value: null as LessonFeedback | null } });
    rerender({ value: first });
    rerender({ value: second });
    expect(announce).toHaveBeenCalledTimes(2);
    render(
      <CoachCaption
        titleKey="learn.title"
        bodyKey="learn.subtitle"
        stepLabel="1/3"
        feedback={{ tone: 'soft', messageKey: 'learn.feedback.illegal' }}
      />,
    );
    expect(screen.getByTestId('learn-feedback').props.accessibilityLiveRegion).toBeUndefined();
    expect(screen.getByTestId('learn-feedback-live').props.accessibilityLiveRegion).toBeUndefined();
  });

  // react-native-web's announceForAccessibility is an empty function.
  it('puts feedback in a polite live region on web, as a new node for each answer', () => {
    Platform.OS = 'web';
    const caption = (feedback: LessonFeedback) => (
      <CoachCaption titleKey="learn.title" bodyKey="learn.subtitle" stepLabel="1/3" feedback={feedback} />
    );
    const { rerender } = render(caption({ tone: 'soft', messageKey: 'learn.feedback.illegal' }));
    expect(screen.getByTestId('learn-feedback-live').props.accessibilityLiveRegion).toBe('polite');
    const first = screen.getByTestId('learn-feedback');
    // The same message again is a new feedback object, so a new node the reader announces.
    rerender(caption({ tone: 'soft', messageKey: 'learn.feedback.illegal' }));
    expect(screen.getByTestId('learn-feedback')).not.toBe(first);
  });
});

describe('coach caption game plan', () => {
  it('shows the in-game plan icon beside a plan step, hidden from screen readers', () => {
    render(<CoachCaption titleKey="game.strategy.label.holding" bodyKey="learn.lessons.strategies.steps.holding.body" stepLabel="5/7" feedback={null} strategy="holding" />);
    const mark = screen.getByTestId('learn-strategy-holding', { includeHiddenElements: true });
    expect(mark.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.getByText('⚓', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('⚓')).toBeNull();
    expect(screen.getByRole('header').props.children).toBe('Holding game');
  });

  it('shows no icon on other steps', () => {
    render(<CoachCaption titleKey="learn.title" bodyKey="learn.subtitle" stepLabel="1/3" feedback={null} />);
    expect(screen.queryByTestId(/^learn-strategy-/, { includeHiddenElements: true })).toBeNull();
  });
});

describe('coach caption cube', () => {
  it('draws the cube a cube step describes, greyed for the Crawford game', () => {
    render(<CoachCaption titleKey="learn.lessons.match_play.steps.crawford.title" bodyKey="learn.lessons.match_play.steps.crawford.body" stepLabel="2/4" feedback={null} cube={{ value: 1, unavailable: true }} />);
    expect(screen.getByTestId('learn-cube', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants');
    // The cube starts at 1 and shows its 64 face, as in a game.
    expect(screen.getByText('64', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('doubling-cube-face', { includeHiddenElements: true })).toHaveStyle({ opacity: 0.45 });
  });
});

describe('coach caption step pips', () => {
  it('draws one pip per step: done, current, then the ones ahead', () => {
    render(<CoachCaption titleKey="learn.title" bodyKey="learn.subtitle" stepLabel="Step 3 of 5" stepIndex={2} totalSteps={5} feedback={null} />);
    const hidden = { includeHiddenElements: true };
    expect(screen.getAllByTestId('learn-step-pip-done', hidden)).toHaveLength(2);
    expect(screen.getAllByTestId('learn-step-pip-current', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('learn-step-pip-ahead', hidden)).toHaveLength(2);
    // The label carries the progress for screen readers; the pips stay out of their way.
    expect(screen.getByText('Step 3 of 5')).toBeTruthy();
    expect(screen.queryByTestId('learn-step-pips')).toBeNull();
  });

  it('draws no pips for a one-step lesson', () => {
    render(<CoachCaption titleKey="learn.title" bodyKey="learn.subtitle" stepLabel="Step 1 of 1" stepIndex={0} totalSteps={1} feedback={null} />);
    expect(screen.queryByTestId('learn-step-pips', { includeHiddenElements: true })).toBeNull();
  });
});
