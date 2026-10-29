import { canSendFeedback, feedbackMailUrl } from './feedback-mail';

const CONTEXT = {
  appName: 'Backgammon Mastermind',
  version: '1.1.0',
  platform: 'ios',
  osVersion: '26.5',
  language: 'en',
  screen: { width: 428, height: 926 },
};

describe('feedback mail', () => {
  it('needs a title or some details', () => {
    expect(canSendFeedback('', '  ')).toBe(false);
    expect(canSendFeedback('Resume does nothing', '')).toBe(true);
    expect(canSendFeedback('', 'The computer moves too fast')).toBe(true);
  });

  it('prefills the subject and adds the device context under the details', () => {
    const url = feedbackMailUrl(' Lost my game ', 'It vanished mid-game.', CONTEXT);
    expect(url.startsWith('mailto:')).toBe(true);
    const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(query.get('subject')).toBe('Backgammon Mastermind feedback: Lost my game');
    const body = query.get('body')!;
    expect(body.startsWith('It vanished mid-game.')).toBe(true);
    expect(body).toContain('Backgammon Mastermind 1.1.0');
    expect(body).toContain('ios 26.5');
    expect(body).toContain('Screen: 428×926');
  });
});
