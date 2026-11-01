import type { LessonFeedback } from '@/features/learn/use-lesson-session';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { translate } from '@/lib/i18n';

/**
 * Read each new Correct / Try again aloud. Android does it from the caption's
 * live region; iOS has no live regions, so VoiceOver needs an announcement
 * (#304). Owned by the lesson body, not the caption, so a rotation that
 * remounts the caption does not repeat the same feedback.
 */
export function useAnnounceFeedback(feedback: LessonFeedback | null) {
  useEffect(() => {
    if (!feedback || Platform.OS !== 'ios') {
      return;
    }
    AccessibilityInfo.announceForAccessibility(translate(feedback.messageKey, feedback.messageOptions));
  }, [feedback]);
}
