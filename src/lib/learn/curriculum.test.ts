import { classifyStrategy } from '@/features/game/strategy';
import { createPositionState } from '@/lib/game/create-position';
import { getLegalMoves } from '@/lib/game/moves';
import en from '@/translations/en.json';

import {
  GRADUATION_QUIZ,
  LESSONS,
} from './curriculum';

describe('curriculum', () => {
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

  it('keeps blot quiz distractors in taught concepts, not the doubling cube', () => {
    const blot = GRADUATION_QUIZ.find(question => question.id === 'blot');
    expect(blot?.options.find(option => option.id === 'c')?.labelKey).toBe('learn.quiz.blot.c');
    expect(en.learn.quiz.blot.c.toLowerCase()).not.toMatch(/doubl/);
    expect(en.learn.quiz.blot.c.toLowerCase()).toMatch(/made point|two or more/);
  });

  it('praises home-stack in teacher language, not a pip dump', () => {
    const praise = en.learn.lessons.direction_setup.steps.home_stack.praise;
    expect(praise).not.toMatch(/2-5-3-5/);
    expect(praise.toLowerCase()).toContain('home stack');
  });

  it('explains bar entry in board language, not 25−N arithmetic', () => {
    const enter = en.learn.lessons.hitting_bar.steps.enter;
    expect(enter.wrong).not.toMatch(/25/);
    expect(enter.body).not.toMatch(/25/);
    expect(enter.wrong.toLowerCase()).toContain('point 21');
  });

  it('explains the single route as matching the current player', () => {
    const body = en.learn.lessons.direction_setup.steps.explain.body;
    expect(body.toLowerCase()).toContain('player whose turn it is');
    expect(body.toLowerCase()).toContain('player\'s route');
    expect(body.toLowerCase()).not.toMatch(/dashed|cooler|opposite/);
  });
});

describe('strategy lesson boards (#300)', () => {
  const strategies = LESSONS.find(lesson => lesson.id === 'strategies')!;

  it.each(strategies.steps.map(step => [step.id, step] as const))('%s has 15 checkers per side', (_id, step) => {
    const state = createPositionState(step.position);
    for (const player of ['white', 'black'] as const) {
      const onBoard = state.points.reduce((sum, point) => sum + (point.player === player ? point.count : 0), 0);
      expect(onBoard + state.bar[player] + state.borneOff[player]).toBe(15);
    }
  });
});

it('sums up every lesson on the graduation screen, pip count and plans included (#301)', () => {
  const { graduation } = en.learn;
  expect(graduation.body).toMatch(/pip count/);
  expect(graduation.body).toMatch(/game plans/);
  expect(graduation.recap_6).toMatch(/Pip count/);
  expect(graduation.recap_7).toMatch(/plan/);
});

describe('game plan steps', () => {
  const planSteps = LESSONS.flatMap(lesson => lesson.steps).filter(step => step.strategy);

  // The five core plans. The game's early "Opening" chip means no plan has formed yet, so it is not taught as one.
  it('cover the five core game plans', () => {
    expect(new Set(planSteps.map(step => step.strategy))).toEqual(
      new Set(['running', 'blitz', 'priming', 'holding', 'backgame']),
    );
  });

  // The lesson and the in-game plan chip must agree, or the icon teaches the wrong thing.
  it.each(planSteps.map(step => [step.id, step] as const))('%s shows the plan the game would name', (_id, step) => {
    const state = createPositionState({ currentPlayer: 'white', ...step.position });
    expect(classifyStrategy(state, 'white').key).toBe(step.strategy);
  });
});
