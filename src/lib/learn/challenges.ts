import type { CreatePositionOptions } from '@/lib/game/create-position';
import type { AcceptedMove } from '@/lib/learn/validate-step';

import { BEAR_OFF } from '@/lib/game/constants';

export const CHALLENGE_IDS = [
  'roll-move',
  'find-home',
  'your-direction',
  'play-both-dice',
  'blocked-points',
  'doubles',
  'hit-blot',
  'enter-bar',
  'the-bar',
  'bear-off',
  'overshoot',
  'opening-roll',
] as const;

export type ChallengeId = (typeof CHALLENGE_IDS)[number];

export const TIERS = [
  { number: 1, titleKey: 'learn.tiers.tier1' },
  { number: 2, titleKey: 'learn.tiers.tier2' },
  { number: 3, titleKey: 'learn.tiers.tier3' },
  { number: 4, titleKey: 'learn.tiers.tier4' },
  { number: 5, titleKey: 'learn.tiers.tier5' },
] as const;

type ChallengeAids = {
  showMoveHints?: boolean;
  showDirectionOverlay?: boolean;
  showPointNumbers?: boolean;
};

type IdentifyStep = {
  kind: 'identify';
  targets: number[];
  hintKey: string;
  praiseKey: string;
};

type TryMoveStep = {
  kind: 'tryMove';
  acceptedMoves: AcceptedMove[];
  requiredMoveCount?: number;
  hintKey: string;
  praiseKey: string;
  legalButWrongKey?: string;
};

export type ChallengeStep = IdentifyStep | TryMoveStep;

export type Challenge = {
  id: ChallengeId;
  tier: number;
  order: number;
  titleKey: string;
  subtitleKey: string;
  showTitleKey: string;
  showBodyKey: string;
  aids?: ChallengeAids;
  position: CreatePositionOptions;
  emphasisPoints?: number[];
  emphasisBar?: boolean;
  step: ChallengeStep;
  xpReward: number;
  prerequisites: ChallengeId[];
};

const HOME_POINTS = [1, 2, 3, 4, 5, 6] as const;

export const CHALLENGES: Challenge[] = [
  // ── Tier 1: Your First Move ──────────────────────────────
  {
    id: 'roll-move',
    tier: 1,
    order: 1,
    titleKey: 'learn.challenges.roll_move.title',
    subtitleKey: 'learn.challenges.roll_move.subtitle',
    showTitleKey: 'learn.challenges.roll_move.show_title',
    showBodyKey: 'learn.challenges.roll_move.show_body',
    aids: { showPointNumbers: true },
    position: {
      placements: [
        { point: 8, player: 'white', count: 1 },
      ],
      dice: [3, 1],
    },
    step: {
      kind: 'tryMove',
      acceptedMoves: [{ from: 8, to: 5 }],
      hintKey: 'learn.challenges.roll_move.hint',
      praiseKey: 'learn.challenges.roll_move.praise',
    },
    xpReward: 10,
    prerequisites: [],
  },
  {
    id: 'find-home',
    tier: 1,
    order: 2,
    titleKey: 'learn.challenges.find_home.title',
    subtitleKey: 'learn.challenges.find_home.subtitle',
    showTitleKey: 'learn.challenges.find_home.show_title',
    showBodyKey: 'learn.challenges.find_home.show_body',
    aids: { showPointNumbers: true },
    position: { useStandardSetup: true },
    emphasisPoints: [...HOME_POINTS],
    step: {
      kind: 'identify',
      targets: [...HOME_POINTS],
      hintKey: 'learn.challenges.find_home.hint',
      praiseKey: 'learn.challenges.find_home.praise',
    },
    xpReward: 10,
    prerequisites: ['roll-move'],
  },
  {
    id: 'your-direction',
    tier: 1,
    order: 3,
    titleKey: 'learn.challenges.your_direction.title',
    subtitleKey: 'learn.challenges.your_direction.subtitle',
    showTitleKey: 'learn.challenges.your_direction.show_title',
    showBodyKey: 'learn.challenges.your_direction.show_body',
    aids: { showDirectionOverlay: true, showPointNumbers: true },
    position: {
      placements: [
        { point: 8, player: 'white', count: 1 },
      ],
      dice: [3, 1],
    },
    step: {
      kind: 'tryMove',
      acceptedMoves: [{ from: 8, to: 5 }],
      hintKey: 'learn.challenges.your_direction.hint',
      praiseKey: 'learn.challenges.your_direction.praise',
    },
    xpReward: 10,
    prerequisites: ['find-home'],
  },

  // ── Tier 2: The Basics ──────────────────────────────────
  {
    id: 'play-both-dice',
    tier: 2,
    order: 4,
    titleKey: 'learn.challenges.play_both_dice.title',
    subtitleKey: 'learn.challenges.play_both_dice.subtitle',
    showTitleKey: 'learn.challenges.play_both_dice.show_title',
    showBodyKey: 'learn.challenges.play_both_dice.show_body',
    aids: { showPointNumbers: true, showMoveHints: true },
    position: {
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 6, player: 'white', count: 1 },
      ],
      dice: [3, 1],
    },
    step: {
      kind: 'tryMove',
      acceptedMoves: [
        { from: 8, to: 5 },
        { from: 6, to: 5 },
      ],
      requiredMoveCount: 2,
      hintKey: 'learn.challenges.play_both_dice.hint',
      praiseKey: 'learn.challenges.play_both_dice.praise',
      legalButWrongKey: 'learn.feedback.legal_but_wrong',
    },
    xpReward: 15,
    prerequisites: ['your-direction'],
  },
  {
    id: 'blocked-points',
    tier: 2,
    order: 5,
    titleKey: 'learn.challenges.blocked_points.title',
    subtitleKey: 'learn.challenges.blocked_points.subtitle',
    showTitleKey: 'learn.challenges.blocked_points.show_title',
    showBodyKey: 'learn.challenges.blocked_points.show_body',
    aids: { showPointNumbers: true },
    position: {
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 5, player: 'black', count: 2 },
      ],
      dice: [3, 1],
    },
    step: {
      kind: 'identify',
      targets: [5],
      hintKey: 'learn.challenges.blocked_points.hint',
      praiseKey: 'learn.challenges.blocked_points.praise',
    },
    xpReward: 10,
    prerequisites: ['play-both-dice'],
  },
  {
    id: 'doubles',
    tier: 2,
    order: 6,
    titleKey: 'learn.challenges.doubles.title',
    subtitleKey: 'learn.challenges.doubles.subtitle',
    showTitleKey: 'learn.challenges.doubles.show_title',
    showBodyKey: 'learn.challenges.doubles.show_body',
    aids: { showPointNumbers: true, showMoveHints: true },
    position: {
      placements: [{ point: 8, player: 'white', count: 4 }],
      dice: [2, 2],
    },
    step: {
      kind: 'tryMove',
      acceptedMoves: [{ from: 8, to: 6 }],
      requiredMoveCount: 4,
      hintKey: 'learn.challenges.doubles.hint',
      praiseKey: 'learn.challenges.doubles.praise',
      legalButWrongKey: 'learn.feedback.legal_but_wrong',
    },
    xpReward: 15,
    prerequisites: ['play-both-dice'],
  },

  // ── Tier 3: Contact Play ────────────────────────────────
  {
    id: 'hit-blot',
    tier: 3,
    order: 7,
    titleKey: 'learn.challenges.hit_blot.title',
    subtitleKey: 'learn.challenges.hit_blot.subtitle',
    showTitleKey: 'learn.challenges.hit_blot.show_title',
    showBodyKey: 'learn.challenges.hit_blot.show_body',
    aids: { showPointNumbers: true, showMoveHints: true },
    position: {
      placements: [
        { point: 8, player: 'white', count: 1 },
        { point: 5, player: 'black', count: 1 },
      ],
      dice: [3, 1],
    },
    emphasisPoints: [5],
    step: {
      kind: 'tryMove',
      acceptedMoves: [{ from: 8, to: 5 }],
      hintKey: 'learn.challenges.hit_blot.hint',
      praiseKey: 'learn.challenges.hit_blot.praise',
      legalButWrongKey: 'learn.feedback.legal_but_wrong',
    },
    xpReward: 15,
    prerequisites: ['blocked-points', 'doubles'],
  },
  {
    id: 'enter-bar',
    tier: 3,
    order: 8,
    titleKey: 'learn.challenges.enter_bar.title',
    subtitleKey: 'learn.challenges.enter_bar.subtitle',
    showTitleKey: 'learn.challenges.enter_bar.show_title',
    showBodyKey: 'learn.challenges.enter_bar.show_body',
    aids: { showPointNumbers: true, showMoveHints: true },
    position: {
      bar: { white: 1 },
      dice: [4, 2],
    },
    emphasisBar: true,
    emphasisPoints: [21],
    step: {
      kind: 'tryMove',
      acceptedMoves: [{ from: 0, to: 21 }],
      hintKey: 'learn.challenges.enter_bar.hint',
      praiseKey: 'learn.challenges.enter_bar.praise',
      legalButWrongKey: 'learn.challenges.enter_bar.wrong',
    },
    xpReward: 15,
    prerequisites: ['hit-blot'],
  },
  {
    id: 'the-bar',
    tier: 3,
    order: 9,
    titleKey: 'learn.challenges.the_bar.title',
    subtitleKey: 'learn.challenges.the_bar.subtitle',
    showTitleKey: 'learn.challenges.the_bar.show_title',
    showBodyKey: 'learn.challenges.the_bar.show_body',
    aids: { showPointNumbers: true },
    position: { useStandardSetup: true },
    emphasisBar: true,
    step: {
      kind: 'identify',
      targets: [0],
      hintKey: 'learn.challenges.the_bar.hint',
      praiseKey: 'learn.challenges.the_bar.praise',
    },
    xpReward: 10,
    prerequisites: ['hit-blot'],
  },

  // ── Tier 4: Winning ─────────────────────────────────────
  {
    id: 'bear-off',
    tier: 4,
    order: 10,
    titleKey: 'learn.challenges.bear_off.title',
    subtitleKey: 'learn.challenges.bear_off.subtitle',
    showTitleKey: 'learn.challenges.bear_off.show_title',
    showBodyKey: 'learn.challenges.bear_off.show_body',
    aids: { showPointNumbers: true, showMoveHints: true },
    position: {
      placements: [
        { point: 6, player: 'white', count: 2 },
        { point: 3, player: 'white', count: 1 },
      ],
      borneOff: { white: 12 },
      dice: [3, 1],
    },
    emphasisPoints: [...HOME_POINTS],
    step: {
      kind: 'tryMove',
      acceptedMoves: [{ from: 3, to: BEAR_OFF }],
      hintKey: 'learn.challenges.bear_off.hint',
      praiseKey: 'learn.challenges.bear_off.praise',
      legalButWrongKey: 'learn.feedback.legal_but_wrong',
    },
    xpReward: 15,
    prerequisites: ['enter-bar', 'the-bar'],
  },
  {
    id: 'overshoot',
    tier: 4,
    order: 11,
    titleKey: 'learn.challenges.overshoot.title',
    subtitleKey: 'learn.challenges.overshoot.subtitle',
    showTitleKey: 'learn.challenges.overshoot.show_title',
    showBodyKey: 'learn.challenges.overshoot.show_body',
    aids: { showPointNumbers: true, showMoveHints: true },
    position: {
      placements: [
        { point: 3, player: 'white', count: 1 },
        { point: 2, player: 'white', count: 1 },
      ],
      borneOff: { white: 13 },
      dice: [5, 1],
    },
    emphasisPoints: [3],
    step: {
      kind: 'tryMove',
      acceptedMoves: [{ from: 3, to: BEAR_OFF }],
      hintKey: 'learn.challenges.overshoot.hint',
      praiseKey: 'learn.challenges.overshoot.praise',
      legalButWrongKey: 'learn.feedback.legal_but_wrong',
    },
    xpReward: 15,
    prerequisites: ['bear-off'],
  },

  // ── Tier 5: Ready to Play ──────────────────────────────
  {
    id: 'opening-roll',
    tier: 5,
    order: 12,
    titleKey: 'learn.challenges.opening_roll.title',
    subtitleKey: 'learn.challenges.opening_roll.subtitle',
    showTitleKey: 'learn.challenges.opening_roll.show_title',
    showBodyKey: 'learn.challenges.opening_roll.show_body',
    aids: { showPointNumbers: true },
    position: { useStandardSetup: true },
    step: {
      kind: 'identify',
      targets: [24, 13, 8, 6],
      hintKey: 'learn.challenges.opening_roll.hint',
      praiseKey: 'learn.challenges.opening_roll.praise',
    },
    xpReward: 20,
    prerequisites: ['overshoot'],
  },
];

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find(c => c.id === id);
}

export function isChallengeId(id: string): id is ChallengeId {
  return (CHALLENGE_IDS as readonly string[]).includes(id);
}

export function getChallengesByTier(tier: number): Challenge[] {
  return CHALLENGES.filter(c => c.tier === tier);
}

export function isChallengeUnlocked(
  challengeId: ChallengeId,
  completedChallenges: readonly string[],
): boolean {
  const challenge = getChallenge(challengeId);
  if (!challenge) {
    return false;
  }
  return challenge.prerequisites.every(p => completedChallenges.includes(p));
}

export function getNextChallengeId(id: ChallengeId): ChallengeId | null {
  const index = CHALLENGE_IDS.indexOf(id);
  if (index < 0 || index >= CHALLENGE_IDS.length - 1) {
    return null;
  }
  return CHALLENGE_IDS[index + 1]!;
}

export function calculateStars(
  attempts: number,
  hintUsed: boolean,
): 1 | 2 | 3 {
  if (attempts <= 1 && !hintUsed) {
    return 3;
  }
  if (attempts <= 1) {
    return 2;
  }
  return 1;
}
