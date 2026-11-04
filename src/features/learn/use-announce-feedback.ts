import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { translate } from '@/lib/i18n';

/**
 * Read each new Correct / Try again aloud, on VoiceOver and TalkBack alike
 * (#304). Every tap makes a new feedback object, so the same wrong tap twice
 * is announced twice; a live region would stay silent when the text does not
 * change. Owned by the lesson body, not the caption, so a rotation that
 * remounts the caption does not repeat the same feedback.
 */
export function useAnnounceFeedback(feedback: LessonFeedback | null) {
  useEffect(() => {
    if (!feedback) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(translate(feedback.messageKey, feedback.messageOptions));
  }, [feedback]);
}
