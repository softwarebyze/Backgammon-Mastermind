import { feedbackEvent } from './feedback-event';

const context = { appName: 'BM', version: '1.1.0', platform: 'ios', osVersion: '26.1', language: 'de', screen: { width: 390.4, height: 844 } };

it('sends the note as a plain event until a PostHog survey is set up', () => {
  expect(feedbackEvent({ title: ' Dice ', details: ' The 6 looks odd ' }, context, '')).toEqual({
    event: 'feedback_submitted',
    properties: { title: 'Dice', details: 'The 6 looks odd', app_version: '1.1.0', os: 'ios 26.1', language: 'de', screen: '390x844' },
  });
});

it('answers the feedback survey when one is configured', () => {
  const { event, properties } = feedbackEvent({ title: 'Dice', details: 'The 6 looks odd' }, context, 'survey-123');
  expect(event).toBe('survey sent');
  expect(properties).toMatchObject({ $survey_id: 'survey-123', $survey_response: 'Dice', $survey_response_1: 'The 6 looks odd', app_version: '1.1.0' });
});
