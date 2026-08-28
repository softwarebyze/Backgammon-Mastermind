import { GAME_PALETTE } from '@/features/game/game-palette';
import { GRADUATION_QUIZ } from '@/lib/learn/curriculum';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { QuizCard, quizOptionSelectedStyle } from './quiz-card';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string) => key,
}));

afterEach(cleanup);

describe('QuizCard', () => {
  it('marks the chosen option selected with a filled accent style', () => {
    expect(quizOptionSelectedStyle.backgroundColor).toBe(GAME_PALETTE.accent);
    setup(
      <QuizCard
        question={GRADUATION_QUIZ[0]!}
        questionIndex={0}
        total={3}
        softMessage={null}
        selectedOptionId="b"
        onSelectOption={() => {}}
      />,
    );
    expect(screen.getByTestId('quiz-option-b').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('quiz-option-a').props.accessibilityState.selected).toBe(false);
  });
});
