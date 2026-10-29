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
