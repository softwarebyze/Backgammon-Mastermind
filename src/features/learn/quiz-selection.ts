export const QUIZ_CORRECT_FLASH_MS = 400;

export type QuizTapResult
  = | { kind: 'ignore' }
    | { kind: 'wrong'; optionId: string }
    | { kind: 'correct'; optionId: string; complete: boolean };

export function canAdvanceAfterCorrectFlash(
  elapsedMs: number,
  flashMs: number = QUIZ_CORRECT_FLASH_MS,
): boolean {
  return elapsedMs >= flashMs;
}

/** One-tap quiz: wrong stays put; correct flashes then advances. */
export function resolveQuizTap(opts: {
  optionId: string;
  correct: boolean;
  isLastQuestion: boolean;
  locked: boolean;
  quizPassed: boolean;
}): QuizTapResult {
  if (opts.locked || opts.quizPassed) {
    return { kind: 'ignore' };
  }
  if (!opts.correct) {
    return { kind: 'wrong', optionId: opts.optionId };
  }
  return {
    kind: 'correct',
    optionId: opts.optionId,
    complete: opts.isLastQuestion,
  };
}
