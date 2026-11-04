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

  it('keeps the polite live region for Android', () => {
    render(
      <CoachCaption
        titleKey="learn.title"
        bodyKey="learn.subtitle"
        stepLabel="1/3"
        feedback={{ tone: 'soft', messageKey: 'learn.feedback.illegal' }}
      />,
    );
    expect(screen.getByTestId('learn-feedback').props.accessibilityLiveRegion).toBe('polite');
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
