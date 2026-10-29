import { AccessibilityInfo, Platform } from 'react-native';
import { cleanup, render, screen } from '@/lib/test-utils';
import { CoachCaption } from './coach-caption';

afterEach(cleanup);

describe('coach caption feedback (#304)', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it('announces new feedback to VoiceOver on iOS', () => {
    Platform.OS = 'ios';
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const { rerender } = render(
      <CoachCaption titleKey="learn.title" bodyKey="learn.subtitle" stepLabel="1/3" feedback={null} />,
    );
    expect(announce).not.toHaveBeenCalled();
    rerender(
      <CoachCaption
        titleKey="learn.title"
        bodyKey="learn.subtitle"
        stepLabel="1/3"
        feedback={{ tone: 'soft', messageKey: 'learn.feedback.illegal' }}
      />,
    );
    expect(announce).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('learn-feedback').props.accessibilityLiveRegion).toBe('polite');
  });
});
