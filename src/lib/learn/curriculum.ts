import type { CreatePositionOptions } from '@/lib/game/create-position';
import type { AcceptedMove } from '@/lib/learn/validate-step';

import { BEAR_OFF } from '@/lib/game/constants';

export const LESSON_IDS = [
  'goal-board',
  'direction-setup',
  'moving-dice',
  'hitting-bar',
  'bearing-off',
] as const;

export type LessonId = (typeof LESSON_IDS)[number];

export type LessonAids = {
  showMoveHints?: boolean;
  showDirectionOverlay?: boolean;
  showPointNumbers?: boolean;
};

type LessonStepBase = {
  id: string;
  titleKey: string;
  bodyKey: string;
  aids?: LessonAids;
  position: CreatePositionOptions;
  /** Points to emphasize on the board (green target style). */
  emphasisPoints?: number[];
  emphasisBar?: boolean;
};

export type ExplainStep = LessonStepBase & {
  kind: 'explain';
};

export type IdentifyStep = LessonStepBase & {
  kind: 'identify';
  hintKey: string;
  praiseKey: string;
  /** Accepted tap targets (0 = bar, 1–24 = points). */
  targets: number[];
};

export type TryMoveStep = LessonStepBase & {
  kind: 'tryMove';
  hintKey: string;
  praiseKey: string;
  legalButWrongKey: string;
  acceptedMoves: AcceptedMove[];
  /** How many accepted moves must succeed before the step completes. Default 1. */
  requiredMoveCount?: number;
};

export type LessonStep = ExplainStep | IdentifyStep | TryMoveStep;

export type LessonDefinition = {
  id: LessonId;
  order: number;
  titleKey: string;
  subtitleKey: string;
  steps: LessonStep[];
};

const HOME_POINTS = [1, 2, 3, 4, 5, 6] as const;

export const LESSONS: LessonDefinition[] = [
  {
    id: 'goal-board',
    order: 1,
    titleKey: 'learn.lessons.goal_board.title',
    subtitleKey: 'learn.lessons.goal_board.subtitle',
    steps: [
      {
        id: 'goal-explain',
        kind: 'explain',
        titleKey: 'learn.lessons.goal_board.steps.explain.title',
        bodyKey: 'learn.lessons.goal_board.steps.explain.body',
        aids: { showPointNumbers: true },
        position: { useStandardSetup: true },
        emphasisPoints: [...HOME_POINTS],
      },
      {
        id: 'goal-home',
        kind: 'identify',
        titleKey: 'learn.lessons.goal_board.steps.home.title',
        bodyKey: 'learn.lessons.goal_board.steps.home.body',
        hintKey: 'learn.lessons.goal_board.steps.home.hint',
        praiseKey: 'learn.lessons.goal_board.steps.home.praise',
        aids: { showPointNumbers: true },
        position: { useStandardSetup: true },
        targets: [...HOME_POINTS],
        emphasisPoints: [...HOME_POINTS],
      },
      {
        id: 'goal-bar',
        kind: 'identify',
        titleKey: 'learn.lessons.goal_board.steps.bar.title',
        bodyKey: 'learn.lessons.goal_board.steps.bar.body',
        hintKey: 'learn.lessons.goal_board.steps.bar.hint',
        praiseKey: 'learn.lessons.goal_board.steps.bar.praise',
        aids: { showPointNumbers: true },
        position: { useStandardSetup: true },
        targets: [0],
        emphasisBar: true,
      },
    ],
  },
  {
    id: 'direction-setup',
    order: 2,
    titleKey: 'learn.lessons.direction_setup.title',
    subtitleKey: 'learn.lessons.direction_setup.subtitle',
    steps: [
      {
        id: 'dir-explain',
        kind: 'explain',
        titleKey: 'learn.lessons.direction_setup.steps.explain.title',
        bodyKey: 'learn.lessons.direction_setup.steps.explain.body',
        aids: { showDirectionOverlay: true, showPointNumbers: true },
        position: { useStandardSetup: true },
      },
      {
        id: 'dir-far',
        kind: 'identify',
        titleKey: 'learn.lessons.direction_setup.steps.far.title',
        bodyKey: 'learn.lessons.direction_setup.steps.far.body',
        hintKey: 'learn.lessons.direction_setup.steps.far.hint',
        praiseKey: 'learn.lessons.direction_setup.steps.far.praise',
        aids: { showDirectionOverlay: true, showPointNumbers: true },
        position: { useStandardSetup: true },
        targets: [24],
        emphasisPoints: [24],
      },
      {
        id: 'dir-home-stack',
        kind: 'identify',
        titleKey: 'learn.lessons.direction_setup.steps.home_stack.title',
        bodyKey: 'learn.lessons.direction_setup.steps.home_stack.body',
        hintKey: 'learn.lessons.direction_setup.steps.home_stack.hint',
        praiseKey: 'learn.lessons.direction_setup.steps.home_stack.praise',
        aids: { showDirectionOverlay: true, showPointNumbers: true },
        position: { useStandardSetup: true },
        targets: [6],
        emphasisPoints: [6],
      },
    ],
  },
  {
    id: 'moving-dice',
    order: 3,
    titleKey: 'learn.lessons.moving_dice.title',
    subtitleKey: 'learn.lessons.moving_dice.subtitle',
    steps: [
      {
        id: 'move-explain',
        kind: 'explain',
        titleKey: 'learn.lessons.moving_dice.steps.explain.title',
        bodyKey: 'learn.lessons.moving_dice.steps.explain.body',
        aids: { showPointNumbers: true, showMoveHints: true },
        position: {
          placements: [
            { point: 8, player: 'white', count: 1 },
            { point: 6, player: 'white', count: 1 },
          ],
          dice: [3, 1],
        },
      },
      {
        id: 'move-blocked',
        kind: 'identify',
        titleKey: 'learn.lessons.moving_dice.steps.blocked.title',
        bodyKey: 'learn.lessons.moving_dice.steps.blocked.body',
        hintKey: 'learn.lessons.moving_dice.steps.blocked.hint',
        praiseKey: 'learn.lessons.moving_dice.steps.blocked.praise',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 8, player: 'white', count: 1 },
            { point: 5, player: 'black', count: 2 },
          ],
          dice: [3, 1],
        },
        targets: [5],
        emphasisPoints: [5],
      },
      {
        id: 'move-two-dice',
        kind: 'tryMove',
        titleKey: 'learn.lessons.moving_dice.steps.two_dice.title',
        bodyKey: 'learn.lessons.moving_dice.steps.two_dice.body',
        hintKey: 'learn.lessons.moving_dice.steps.two_dice.hint',
        praiseKey: 'learn.lessons.moving_dice.steps.two_dice.praise',
        legalButWrongKey: 'learn.feedback.legal_but_wrong',
        aids: { showPointNumbers: true, showMoveHints: true },
        position: {
          placements: [
            { point: 8, player: 'white', count: 1 },
            { point: 6, player: 'white', count: 1 },
          ],
          dice: [3, 1],
        },
        acceptedMoves: [
          { from: 8, to: 5 },
          { from: 6, to: 5 },
        ],
        requiredMoveCount: 2,
      },
      {
        id: 'move-doubles',
        kind: 'tryMove',
        titleKey: 'learn.lessons.moving_dice.steps.doubles.title',
        bodyKey: 'learn.lessons.moving_dice.steps.doubles.body',
        hintKey: 'learn.lessons.moving_dice.steps.doubles.hint',
        praiseKey: 'learn.lessons.moving_dice.steps.doubles.praise',
        legalButWrongKey: 'learn.feedback.legal_but_wrong',
        aids: { showPointNumbers: true, showMoveHints: true },
        position: {
          placements: [{ point: 8, player: 'white', count: 4 }],
          dice: [2, 2],
        },
        acceptedMoves: [{ from: 8, to: 6 }],
        requiredMoveCount: 4,
      },
    ],
  },
  {
    id: 'hitting-bar',
    order: 4,
    titleKey: 'learn.lessons.hitting_bar.title',
    subtitleKey: 'learn.lessons.hitting_bar.subtitle',
    steps: [
      {
        id: 'hit-blot',
        kind: 'tryMove',
        titleKey: 'learn.lessons.hitting_bar.steps.hit.title',
        bodyKey: 'learn.lessons.hitting_bar.steps.hit.body',
        hintKey: 'learn.lessons.hitting_bar.steps.hit.hint',
        praiseKey: 'learn.lessons.hitting_bar.steps.hit.praise',
        legalButWrongKey: 'learn.feedback.legal_but_wrong',
        aids: { showPointNumbers: true, showMoveHints: true },
        position: {
          placements: [
            { point: 8, player: 'white', count: 1 },
            { point: 5, player: 'black', count: 1 },
          ],
          dice: [3, 1],
        },
        acceptedMoves: [{ from: 8, to: 5 }],
        emphasisPoints: [5],
      },
      {
        id: 'hit-enter',
        kind: 'tryMove',
        titleKey: 'learn.lessons.hitting_bar.steps.enter.title',
        bodyKey: 'learn.lessons.hitting_bar.steps.enter.body',
        hintKey: 'learn.lessons.hitting_bar.steps.enter.hint',
        praiseKey: 'learn.lessons.hitting_bar.steps.enter.praise',
        legalButWrongKey: 'learn.lessons.hitting_bar.steps.enter.wrong',
        aids: { showPointNumbers: true, showMoveHints: true },
        position: {
          bar: { white: 1 },
          dice: [4, 2],
        },
        acceptedMoves: [{ from: 0, to: 21 }],
        emphasisBar: true,
        emphasisPoints: [21],
      },
    ],
  },
  {
    id: 'bearing-off',
    order: 5,
    titleKey: 'learn.lessons.bearing_off.title',
    subtitleKey: 'learn.lessons.bearing_off.subtitle',
    steps: [
      {
        id: 'bear-off',
        kind: 'tryMove',
        titleKey: 'learn.lessons.bearing_off.steps.try.title',
        bodyKey: 'learn.lessons.bearing_off.steps.try.body',
        hintKey: 'learn.lessons.bearing_off.steps.try.hint',
        praiseKey: 'learn.lessons.bearing_off.steps.try.praise',
        legalButWrongKey: 'learn.feedback.legal_but_wrong',
        aids: { showPointNumbers: true, showMoveHints: true },
        position: {
          placements: [
            { point: 6, player: 'white', count: 2 },
            { point: 3, player: 'white', count: 1 },
          ],
          borneOff: { white: 12 },
          dice: [3, 1],
        },
        acceptedMoves: [{ from: 3, to: BEAR_OFF }],
        emphasisPoints: [...HOME_POINTS],
      },
      {
        id: 'bear-overshoot',
        kind: 'tryMove',
        titleKey: 'learn.lessons.bearing_off.steps.overshoot.title',
        bodyKey: 'learn.lessons.bearing_off.steps.overshoot.body',
        hintKey: 'learn.lessons.bearing_off.steps.overshoot.hint',
        praiseKey: 'learn.lessons.bearing_off.steps.overshoot.praise',
        legalButWrongKey: 'learn.feedback.legal_but_wrong',
        aids: { showPointNumbers: true, showMoveHints: true },
        position: {
          placements: [
            { point: 3, player: 'white', count: 1 },
            { point: 2, player: 'white', count: 1 },
          ],
          borneOff: { white: 13 },
          dice: [5, 1],
        },
        acceptedMoves: [{ from: 3, to: BEAR_OFF }],
        emphasisPoints: [3],
      },
    ],
  },
];

export type QuizOption = {
  id: string;
  labelKey: string;
  correct: boolean;
};

export type QuizQuestion = {
  id: string;
  promptKey: string;
  options: QuizOption[];
};

export const GRADUATION_QUIZ: QuizQuestion[] = [
  {
    id: 'bar',
    promptKey: 'learn.quiz.bar.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.bar.a', correct: false },
      { id: 'b', labelKey: 'learn.quiz.bar.b', correct: true },
      { id: 'c', labelKey: 'learn.quiz.bar.c', correct: false },
    ],
  },
  {
    id: 'blot',
    promptKey: 'learn.quiz.blot.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.blot.a', correct: false },
      { id: 'b', labelKey: 'learn.quiz.blot.b', correct: true },
      { id: 'c', labelKey: 'learn.quiz.blot.c', correct: false },
    ],
  },
  {
    id: 'bear',
    promptKey: 'learn.quiz.bear.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.bear.a', correct: false },
      { id: 'b', labelKey: 'learn.quiz.bear.b', correct: false },
      { id: 'c', labelKey: 'learn.quiz.bear.c', correct: true },
    ],
  },
];

export function getLesson(id: string): LessonDefinition | undefined {
  return LESSONS.find(lesson => lesson.id === id);
}

export function isLessonId(id: string): id is LessonId {
  return (LESSON_IDS as readonly string[]).includes(id);
}

export function getNextLessonId(id: LessonId): LessonId | 'graduation' | null {
  const index = LESSON_IDS.indexOf(id);
  if (index < 0) {
    return null;
  }
  if (index >= LESSON_IDS.length - 1) {
    return 'graduation';
  }
  return LESSON_IDS[index + 1]!;
}

export function isLessonUnlocked(
  lessonId: LessonId,
  completedLessons: readonly string[],
): boolean {
  const index = LESSON_IDS.indexOf(lessonId);
  if (index <= 0) {
    return true;
  }
  const previous = LESSON_IDS[index - 1]!;
  return completedLessons.includes(previous);
}
