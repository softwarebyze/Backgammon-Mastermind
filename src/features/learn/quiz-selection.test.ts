import { canAdvanceAfterCorrectFlash, QUIZ_CORRECT_FLASH_MS, resolveQuizTap } from './quiz-selection';

describe('quiz selection', () => {
  it('does not advance before the correct-answer flash', () => {
    expect(canAdvanceAfterCorrectFlash(0)).toBe(false);
    expect(canAdvanceAfterCorrectFlash(QUIZ_CORRECT_FLASH_MS - 1)).toBe(false);
    expect(canAdvanceAfterCorrectFlash(QUIZ_CORRECT_FLASH_MS)).toBe(true);
  });

  it('keeps a wrong tap on the chosen option', () => {
    expect(resolveQuizTap({
      optionId: 'a',
      correct: false,
      isLastQuestion: false,
      locked: false,
      quizPassed: false,
    })).toEqual({ kind: 'wrong', optionId: 'a' });
  });

  it('flashes a correct tap then reports whether the quiz is done', () => {
    expect(resolveQuizTap({
      optionId: 'b',
      correct: true,
      isLastQuestion: false,
      locked: false,
      quizPassed: false,
    })).toEqual({ kind: 'correct', optionId: 'b', complete: false });
    expect(resolveQuizTap({
      optionId: 'c',
      correct: true,
      isLastQuestion: true,
      locked: false,
      quizPassed: false,
    })).toEqual({ kind: 'correct', optionId: 'c', complete: true });
  });

  it('ignores taps while the correct flash is locked', () => {
    expect(resolveQuizTap({
      optionId: 'a',
      correct: true,
      isLastQuestion: false,
      locked: true,
      quizPassed: false,
    })).toEqual({ kind: 'ignore' });
  });
});
