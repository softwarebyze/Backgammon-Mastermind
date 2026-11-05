import type { FeedbackContext } from './feedback-mail';

/**
 * PostHog survey that collects in-app feedback (an "API" survey with two open
 * text questions: title, then details). Create it in PostHog → Surveys and
 * paste its id here; until then notes arrive as `feedback_submitted` events.
 */
const FEEDBACK_SURVEY_ID = '';

type FeedbackEvent = { event: string; properties: Record<string, string | number> };

/** The note and its device context as one PostHog event. */
export function feedbackEvent({ title, details }: { title: string; details: string }, context: FeedbackContext, surveyId = FEEDBACK_SURVEY_ID): FeedbackEvent {
  const device = {
    app_version: context.version,
    os: `${context.platform} ${context.osVersion}`.trim(),
    language: context.language,
    screen: `${Math.round(context.screen.width)}x${Math.round(context.screen.height)}`,
  };
  if (surveyId) {
    return {
      event: 'survey sent',
      properties: {
        $survey_id: surveyId,
        $survey_response: title.trim(),
        $survey_response_1: details.trim(),
        ...device,
      },
    };
  }
  return { event: 'feedback_submitted', properties: { title: title.trim(), details: details.trim(), ...device } };
}
