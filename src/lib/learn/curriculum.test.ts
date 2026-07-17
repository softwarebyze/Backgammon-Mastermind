import { createPositionState } from '@/lib/game/create-position';
import { getLegalMoves } from '@/lib/game/moves';

import {
  getNextLessonId,
  isLessonUnlocked,
  LESSONS,
} from './curriculum';

describe('curriculum', () => {
  it('unlocks lessons in order', () => {
    expect(isLessonUnlocked('goal-board', [])).toBe(true);
    expect(isLessonUnlocked('direction-setup', [])).toBe(false);
    expect(isLessonUnlocked('direction-setup', ['goal-board'])).toBe(true);
  });

  it('routes the last lesson to graduation', () => {
    expect(getNextLessonId('bearing-off')).toBe('graduation');
    expect(getNextLessonId('goal-board')).toBe('direction-setup');
  });

  it('ensures every tryMove accepted path is legal from its position', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.kind !== 'tryMove') {
          continue;
        }
        const state = createPositionState(step.position);
        for (const move of step.acceptedMoves) {
          const legal = getLegalMoves(state).some(
            candidate => candidate.from === move.from && candidate.to === move.to,
          );
          expect({
            lesson: lesson.id,
            step: step.id,
            move,
            legal,
          }).toEqual({
            lesson: lesson.id,
            step: step.id,
            move,
            legal: true,
          });
        }
      }
    }
  });
});
