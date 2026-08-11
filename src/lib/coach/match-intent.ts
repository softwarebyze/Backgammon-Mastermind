import type { CoachIntent, CoachSuggestedPrompt } from '@/lib/coach/types';

/** Quick-tap prompts shown in the coach sheet. */
export const COACH_SUGGESTED_PROMPTS: readonly CoachSuggestedPrompt[] = [
  { id: 'explain_position', labelKey: 'coach.prompts.explain_position' },
  { id: 'best_move', labelKey: 'coach.prompts.best_move' },
  { id: 'race', labelKey: 'coach.prompts.race' },
  { id: 'hitting', labelKey: 'coach.prompts.hitting' },
  { id: 'bearing_off', labelKey: 'coach.prompts.bearing_off' },
  { id: 'dice', labelKey: 'coach.prompts.dice' },
  { id: 'direction', labelKey: 'coach.prompts.direction' },
  { id: 'tip', labelKey: 'coach.prompts.tip' },
] as const;

type TopicRule = {
  intent: CoachIntent;
  patterns: RegExp[];
};

const TOPIC_RULES: TopicRule[] = [
  {
    intent: 'best_move',
    patterns: [
      /\bbest\b/,
      /\bsuggest/,
      /\bwhat\s+should\b/,
      /\bwhich\s+move\b/,
      /\brecommend/,
      /\badvice\b/,
      /\bhelp\s+me\s+move\b/,
    ],
  },
  {
    intent: 'explain_position',
    patterns: [
      /\bexplain\b/,
      /\bposition\b/,
      /\bwhat.?s\s+going\s+on\b/,
      /\banaly[sz]e\b/,
      /\blook\s+at\s+(the\s+)?board\b/,
      /\bhow\s+am\s+i\s+doing\b/,
    ],
  },
  {
    intent: 'race',
    patterns: [
      /\brace\b/,
      /\bpip\b/,
      /\bahead\b/,
      /\bbehind\b/,
      /\bwho.?s\s+winning\b/,
      /\bleading\b/,
    ],
  },
  {
    intent: 'bar',
    patterns: [
      /\bbar\b/,
      /\bre-?enter/,
      /\bon\s+the\s+rail\b/,
      /\bhit\s+and\s+stuck\b/,
    ],
  },
  {
    intent: 'hitting',
    patterns: [
      /\bhit(ting)?\b/,
      /\bblot\b/,
      /\bcapture\b/,
      /\bsend\s+.*\s+bar\b/,
    ],
  },
  {
    intent: 'bearing_off',
    patterns: [
      /\bbear(ing)?\s*off\b/,
      /\bborne\s*off\b/,
      /\bbearoff\b/,
      /\bhome\s+board\b/,
      /\btake\s+off\b/,
      /\bremove\s+checkers?\b/,
    ],
  },
  {
    intent: 'dice',
    patterns: [
      /\bdice\b/,
      /\bdie\b/,
      /\bdoubles?\b/,
      /\broll\b/,
      /\bhow\s+do\s+(the\s+)?dice\b/,
    ],
  },
  {
    intent: 'direction',
    patterns: [
      /\bdirection\b/,
      /\bhorseshoe\b/,
      /\bwhich\s+way\b/,
      /\bmove\s+toward\b/,
      /\bhome\b/,
    ],
  },
  {
    intent: 'blots',
    patterns: [
      /\bblot\b/,
      /\blone\b/,
      /\bunsafe\b/,
      /\bexposed\b/,
      /\bprotect\b/,
    ],
  },
  {
    intent: 'tip',
    patterns: [
      /\btip\b/,
      /\badvice\b/,
      /\bteach\b/,
      /\blearn\b/,
      /\bhint\b/,
    ],
  },
];

/** Map free-text questions to a coach intent (local keyword match — no network). */
export function matchCoachIntent(question: string): CoachIntent {
  const q = question.trim().toLowerCase();
  if (!q) {
    return 'fallback';
  }

  for (const rule of TOPIC_RULES) {
    if (rule.patterns.some(p => p.test(q))) {
      return rule.intent;
    }
  }

  return 'fallback';
}
