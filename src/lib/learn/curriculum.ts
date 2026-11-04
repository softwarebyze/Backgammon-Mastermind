import type { StrategyKey } from '@/features/game/strategy';
import type { CreatePositionOptions } from '@/lib/game/create-position';
import type { AcceptedMove } from '@/lib/learn/validate-step';

import { BEAR_OFF } from '@/lib/game/constants';

export const LESSON_IDS = [
  'goal-board',
  'direction-setup',
  'moving-dice',
  'hitting-bar',
  'bearing-off',
  'pip-count',
  'strategies',
  'doubling-cube',
  'match-play',
  'app-tools',
] as const;

export type LessonId = (typeof LESSON_IDS)[number];

type LessonAids = {
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
  /** The game plan this step shows: the caption carries the same icon as the in-game plan chip. */
  strategy?: StrategyKey;
  /** The doubling cube as this step describes it, drawn like the cube in a game. */
  cube?: { value: number; unavailable?: boolean };
};

type ExplainStep = LessonStepBase & {
  kind: 'explain';
};

type IdentifyStep = LessonStepBase & {
  kind: 'identify';
  hintKey: string;
  praiseKey: string;
  /** Accepted tap targets (0 = bar, 1–24 = points). */
  targets: number[];
};

type TryMoveStep = LessonStepBase & {
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

/** White has a big racing lead and no contact: a position worth doubling. */
const RACE_WHITE_AHEAD: CreatePositionOptions = {
  placements: [
    { point: 6, player: 'white', count: 4 },
    { point: 5, player: 'white', count: 4 },
    { point: 4, player: 'white', count: 3 },
    { point: 3, player: 'white', count: 2 },
    { point: 2, player: 'white', count: 2 },
    { point: 12, player: 'black', count: 5 },
    { point: 17, player: 'black', count: 5 },
    { point: 19, player: 'black', count: 5 },
  ],
};

/** White is bearing off; black has borne off nothing and still has checkers in white's home board. */
const GAMMON_IN_SIGHT: CreatePositionOptions = {
  placements: [
    { point: 6, player: 'white', count: 2 },
    { point: 5, player: 'white', count: 2 },
    { point: 4, player: 'white', count: 1 },
    { point: 1, player: 'black', count: 5 },
    { point: 7, player: 'black', count: 5 },
    { point: 12, player: 'black', count: 5 },
  ],
  borneOff: { white: 10 },
};

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
  {
    id: 'pip-count',
    order: 6,
    titleKey: 'learn.lessons.pip_count.title',
    subtitleKey: 'learn.lessons.pip_count.subtitle',
    steps: [
      {
        id: 'pip-explain',
        kind: 'explain',
        titleKey: 'learn.lessons.pip_count.steps.explain.title',
        bodyKey: 'learn.lessons.pip_count.steps.explain.body',
        aids: { showPointNumbers: true },
        position: { useStandardSetup: true },
      },
      {
        id: 'pip-ahead',
        kind: 'identify',
        titleKey: 'learn.lessons.pip_count.steps.ahead.title',
        bodyKey: 'learn.lessons.pip_count.steps.ahead.body',
        hintKey: 'learn.lessons.pip_count.steps.ahead.hint',
        praiseKey: 'learn.lessons.pip_count.steps.ahead.praise',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 6, player: 'white', count: 5 },
            { point: 5, player: 'white', count: 3 },
            { point: 13, player: 'white', count: 2 },
            { point: 1, player: 'black', count: 2 },
            { point: 12, player: 'black', count: 5 },
            { point: 17, player: 'black', count: 3 },
            { point: 19, player: 'black', count: 5 },
          ],
          borneOff: { white: 5 },
        },
        // White is ahead in the race (fewer pips) — tap any white checker.
        targets: [6, 5, 13],
        emphasisPoints: [6, 5, 13],
      },
      {
        id: 'pip-behind',
        kind: 'identify',
        titleKey: 'learn.lessons.pip_count.steps.behind.title',
        bodyKey: 'learn.lessons.pip_count.steps.behind.body',
        hintKey: 'learn.lessons.pip_count.steps.behind.hint',
        praiseKey: 'learn.lessons.pip_count.steps.behind.praise',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 6, player: 'white', count: 5 },
            { point: 5, player: 'white', count: 3 },
            { point: 13, player: 'white', count: 2 },
            { point: 1, player: 'black', count: 2 },
            { point: 12, player: 'black', count: 5 },
            { point: 17, player: 'black', count: 3 },
            { point: 19, player: 'black', count: 5 },
          ],
          borneOff: { white: 5 },
        },
        // Black is behind in the race (more pips) — tap any black checker.
        targets: [1, 12, 17, 19],
        emphasisPoints: [1, 12, 17, 19],
      },
    ],
  },
  {
    id: 'strategies',
    order: 7,
    titleKey: 'learn.lessons.strategies.title',
    subtitleKey: 'learn.lessons.strategies.subtitle',
    steps: [
      {
        id: 'strat-opening',
        kind: 'explain',
        titleKey: 'game.strategy.label.developing',
        bodyKey: 'learn.lessons.strategies.steps.opening.body',
        strategy: 'developing',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 24, player: 'white', count: 2 },
            { point: 13, player: 'white', count: 5 },
            { point: 8, player: 'white', count: 2 },
            { point: 6, player: 'white', count: 4 },
            { point: 5, player: 'white', count: 2 },
            { point: 1, player: 'black', count: 2 },
            { point: 12, player: 'black', count: 5 },
            { point: 17, player: 'black', count: 3 },
            { point: 19, player: 'black', count: 5 },
          ],
        },
        emphasisPoints: [5],
      },
      {
        id: 'strat-running',
        kind: 'explain',
        titleKey: 'game.strategy.label.running',
        strategy: 'running',
        bodyKey: 'learn.lessons.strategies.steps.running.body',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 6, player: 'white', count: 4 },
            { point: 5, player: 'white', count: 3 },
            { point: 8, player: 'white', count: 2 },
            { point: 13, player: 'white', count: 2 },
            { point: 1, player: 'black', count: 2 },
            { point: 12, player: 'black', count: 4 },
            { point: 17, player: 'black', count: 3 },
            { point: 19, player: 'black', count: 3 },
            { point: 20, player: 'black', count: 3 },
          ],
          borneOff: { white: 4 },
        },
        emphasisPoints: [6, 5, 8],
      },
      {
        id: 'strat-blitz',
        kind: 'explain',
        titleKey: 'game.strategy.label.blitz',
        strategy: 'blitz',
        bodyKey: 'learn.lessons.strategies.steps.blitz.body',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 6, player: 'white', count: 2 },
            { point: 5, player: 'white', count: 2 },
            { point: 4, player: 'white', count: 2 },
            { point: 8, player: 'white', count: 2 },
            { point: 13, player: 'white', count: 5 },
            { point: 24, player: 'white', count: 2 },
            { point: 7, player: 'black', count: 1 },
            { point: 12, player: 'black', count: 5 },
            { point: 17, player: 'black', count: 3 },
            { point: 19, player: 'black', count: 3 },
            { point: 21, player: 'black', count: 2 },
          ],
          bar: { black: 1 },
        },
        emphasisPoints: [6, 5, 4],
        emphasisBar: true,
      },
      {
        id: 'strat-prime',
        kind: 'explain',
        titleKey: 'game.strategy.label.priming',
        strategy: 'priming',
        bodyKey: 'learn.lessons.strategies.steps.prime.body',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 6, player: 'white', count: 2 },
            { point: 5, player: 'white', count: 2 },
            { point: 4, player: 'white', count: 2 },
            { point: 3, player: 'white', count: 2 },
            { point: 8, player: 'white', count: 3 },
            { point: 13, player: 'white', count: 4 },
            { point: 24, player: 'black', count: 2 },
            { point: 23, player: 'black', count: 2 },
            { point: 20, player: 'black', count: 3 },
            { point: 19, player: 'black', count: 3 },
            { point: 12, player: 'black', count: 3 },
            { point: 1, player: 'black', count: 2 },
          ],
        },
        emphasisPoints: [6, 5, 4, 3],
      },
      {
        id: 'strat-holding',
        kind: 'explain',
        titleKey: 'game.strategy.label.holding',
        bodyKey: 'learn.lessons.strategies.steps.holding.body',
        strategy: 'holding',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 20, player: 'white', count: 2 },
            { point: 13, player: 'white', count: 4 },
            { point: 8, player: 'white', count: 3 },
            { point: 6, player: 'white', count: 4 },
            { point: 5, player: 'white', count: 2 },
            { point: 19, player: 'black', count: 3 },
            { point: 21, player: 'black', count: 2 },
            { point: 22, player: 'black', count: 2 },
            { point: 18, player: 'black', count: 3 },
            { point: 12, player: 'black', count: 3 },
            { point: 7, player: 'black', count: 2 },
          ],
        },
        emphasisPoints: [20],
      },
      {
        id: 'strat-backgame',
        kind: 'explain',
        titleKey: 'game.strategy.label.backgame',
        bodyKey: 'learn.lessons.strategies.steps.backgame.body',
        strategy: 'backgame',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 24, player: 'white', count: 2 },
            { point: 22, player: 'white', count: 2 },
            { point: 13, player: 'white', count: 3 },
            { point: 8, player: 'white', count: 2 },
            { point: 6, player: 'white', count: 3 },
            { point: 5, player: 'white', count: 3 },
            { point: 19, player: 'black', count: 3 },
            { point: 20, player: 'black', count: 3 },
            { point: 21, player: 'black', count: 2 },
            { point: 18, player: 'black', count: 2 },
            { point: 17, player: 'black', count: 2 },
            { point: 7, player: 'black', count: 3 },
          ],
        },
        emphasisPoints: [24, 22],
      },
      {
        id: 'strat-identify',
        kind: 'identify',
        strategy: 'priming',
        titleKey: 'learn.lessons.strategies.steps.identify.title',
        bodyKey: 'learn.lessons.strategies.steps.identify.body',
        hintKey: 'learn.lessons.strategies.steps.identify.hint',
        praiseKey: 'learn.lessons.strategies.steps.identify.praise',
        aids: { showPointNumbers: true },
        position: {
          placements: [
            { point: 6, player: 'white', count: 2 },
            { point: 5, player: 'white', count: 2 },
            { point: 4, player: 'white', count: 2 },
            { point: 3, player: 'white', count: 2 },
            { point: 8, player: 'white', count: 3 },
            { point: 13, player: 'white', count: 4 },
            { point: 24, player: 'black', count: 2 },
            { point: 23, player: 'black', count: 2 },
            { point: 20, player: 'black', count: 3 },
            { point: 19, player: 'black', count: 3 },
            { point: 12, player: 'black', count: 3 },
            { point: 1, player: 'black', count: 2 },
          ],
        },
        // Tap any point of the prime (4-point prime on 3-6).
        targets: [6, 5, 4, 3],
        emphasisPoints: [6, 5, 4, 3],
      },
    ],
  },
  {
    id: 'doubling-cube',
    order: 8,
    titleKey: 'learn.lessons.doubling_cube.title',
    subtitleKey: 'learn.lessons.doubling_cube.subtitle',
    steps: [
      {
        id: 'cube-what',
        kind: 'explain',
        titleKey: 'learn.lessons.doubling_cube.steps.what.title',
        bodyKey: 'learn.lessons.doubling_cube.steps.what.body',
        cube: { value: 1 },
        position: { useStandardSetup: true },
      },
      {
        id: 'cube-offer',
        kind: 'explain',
        titleKey: 'learn.lessons.doubling_cube.steps.offer.title',
        bodyKey: 'learn.lessons.doubling_cube.steps.offer.body',
        cube: { value: 2 },
        position: RACE_WHITE_AHEAD,
      },
      {
        id: 'cube-take-pass',
        kind: 'explain',
        titleKey: 'learn.lessons.doubling_cube.steps.take_pass.title',
        bodyKey: 'learn.lessons.doubling_cube.steps.take_pass.body',
        cube: { value: 2 },
        position: RACE_WHITE_AHEAD,
      },
      {
        id: 'cube-own',
        kind: 'explain',
        titleKey: 'learn.lessons.doubling_cube.steps.own.title',
        bodyKey: 'learn.lessons.doubling_cube.steps.own.body',
        cube: { value: 4 },
        position: RACE_WHITE_AHEAD,
      },
      {
        id: 'cube-gammon',
        kind: 'explain',
        titleKey: 'learn.lessons.doubling_cube.steps.gammon.title',
        bodyKey: 'learn.lessons.doubling_cube.steps.gammon.body',
        cube: { value: 2 },
        emphasisPoints: [1],
        position: GAMMON_IN_SIGHT,
      },
    ],
  },
  {
    id: 'match-play',
    order: 9,
    titleKey: 'learn.lessons.match_play.title',
    subtitleKey: 'learn.lessons.match_play.subtitle',
    steps: [
      {
        id: 'match-what',
        kind: 'explain',
        titleKey: 'learn.lessons.match_play.steps.what.title',
        bodyKey: 'learn.lessons.match_play.steps.what.body',
        position: { useStandardSetup: true },
      },
      {
        id: 'match-crawford',
        kind: 'explain',
        titleKey: 'learn.lessons.match_play.steps.crawford.title',
        bodyKey: 'learn.lessons.match_play.steps.crawford.body',
        cube: { value: 1, unavailable: true },
        position: { useStandardSetup: true },
      },
      {
        id: 'match-dead-cube',
        kind: 'explain',
        titleKey: 'learn.lessons.match_play.steps.dead_cube.title',
        bodyKey: 'learn.lessons.match_play.steps.dead_cube.body',
        cube: { value: 2 },
        position: RACE_WHITE_AHEAD,
      },
      {
        id: 'match-start',
        kind: 'explain',
        titleKey: 'learn.lessons.match_play.steps.start.title',
        bodyKey: 'learn.lessons.match_play.steps.start.body',
        position: { useStandardSetup: true },
      },
    ],
  },
  {
    id: 'app-tools',
    order: 10,
    titleKey: 'learn.lessons.app_tools.title',
    subtitleKey: 'learn.lessons.app_tools.subtitle',
    steps: [
      {
        id: 'tools-hint',
        kind: 'explain',
        titleKey: 'learn.lessons.app_tools.steps.hint.title',
        bodyKey: 'learn.lessons.app_tools.steps.hint.body',
        position: { useStandardSetup: true },
      },
      {
        id: 'tools-tutor',
        kind: 'explain',
        titleKey: 'learn.lessons.app_tools.steps.tutor.title',
        bodyKey: 'learn.lessons.app_tools.steps.tutor.body',
        position: { useStandardSetup: true },
      },
      {
        id: 'tools-history',
        kind: 'explain',
        titleKey: 'learn.lessons.app_tools.steps.history.title',
        bodyKey: 'learn.lessons.app_tools.steps.history.body',
        position: { useStandardSetup: true },
      },
      {
        id: 'tools-levels',
        kind: 'explain',
        titleKey: 'learn.lessons.app_tools.steps.levels.title',
        bodyKey: 'learn.lessons.app_tools.steps.levels.body',
        position: { useStandardSetup: true },
      },
    ],
  },
];

type QuizOption = {
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
  {
    id: 'pip-ahead',
    promptKey: 'learn.quiz.pip_ahead.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.pip_ahead.a', correct: false },
      { id: 'b', labelKey: 'learn.quiz.pip_ahead.b', correct: true },
      { id: 'c', labelKey: 'learn.quiz.pip_ahead.c', correct: false },
    ],
  },
  {
    id: 'pip-meaning',
    promptKey: 'learn.quiz.pip_meaning.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.pip_meaning.a', correct: true },
      { id: 'b', labelKey: 'learn.quiz.pip_meaning.b', correct: false },
      { id: 'c', labelKey: 'learn.quiz.pip_meaning.c', correct: false },
    ],
  },
  {
    id: 'strat-prime',
    promptKey: 'learn.quiz.strat_prime.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.strat_prime.a', correct: false },
      { id: 'b', labelKey: 'learn.quiz.strat_prime.b', correct: true },
      { id: 'c', labelKey: 'learn.quiz.strat_prime.c', correct: false },
    ],
  },
  {
    id: 'strat-blitz',
    promptKey: 'learn.quiz.strat_blitz.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.strat_blitz.a', correct: true },
      { id: 'b', labelKey: 'learn.quiz.strat_blitz.b', correct: false },
      { id: 'c', labelKey: 'learn.quiz.strat_blitz.c', correct: false },
    ],
  },
  {
    id: 'cube-pass',
    promptKey: 'learn.quiz.cube_pass.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.cube_pass.a', correct: false },
      { id: 'b', labelKey: 'learn.quiz.cube_pass.b', correct: true },
      { id: 'c', labelKey: 'learn.quiz.cube_pass.c', correct: false },
    ],
  },
  {
    id: 'crawford',
    promptKey: 'learn.quiz.crawford.prompt',
    options: [
      { id: 'a', labelKey: 'learn.quiz.crawford.a', correct: true },
      { id: 'b', labelKey: 'learn.quiz.crawford.b', correct: false },
      { id: 'c', labelKey: 'learn.quiz.crawford.c', correct: false },
    ],
  },
];

export function getLesson(id: string): LessonDefinition | undefined {
  return LESSONS.find(lesson => lesson.id === id);
}

export function isLessonId(id: string): id is LessonId {
  return (LESSON_IDS as readonly string[]).includes(id);
}
