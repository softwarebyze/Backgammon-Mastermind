import type { CoachIntent, CoachSuggestedPrompt } from '@/lib/coach/types';

/** POC quick-tap prompts — English-only. */
export const COACH_SUGGESTED_PROMPTS: readonly CoachSuggestedPrompt[] = [
  { id: 'explain_position', label: 'Explain this position' },
  { id: 'best_move', label: 'What’s a good move here?' },
  { id: 'race', label: 'Who’s ahead in the race?' },
  { id: 'hitting', label: 'What is hitting?' },
  { id: 'bearing_off', label: 'How does bearing off work?' },
  { id: 'dice', label: 'How do the dice work?' },
  { id: 'direction', label: 'Which way do I move?' },
  { id: 'tip', label: 'Give me a tip' },
];

type TopicRule = {
  intent: CoachIntent;
  patterns: RegExp[];
};

const TOPIC_RULES: TopicRule[] = [
  {
    intent: 'best_move',
    patterns: [/\bbest\b/, /\bsuggest/, /\bwhat\s+should\b/, /\bwhich\s+move\b/, /\brecommend/, /\badvice\b/],
  },
  {
    intent: 'explain_position',
    patterns: [/\bexplain\b/, /\bposition\b/, /\bwhat.?s\s+going\s+on\b/, /\banaly[sz]e\b/, /\bhow\s+am\s+i\s+doing\b/],
  },
  {
    intent: 'race',
    patterns: [/\brace\b/, /\bpip\b/, /\bahead\b/, /\bbehind\b/, /\bwho.?s\s+winning\b/, /\bleading\b/],
  },
  {
    intent: 'bar',
    patterns: [/\bbar\b/, /\bre-?enter/],
  },
  {
    intent: 'hitting',
    patterns: [/\bhit(ting)?\b/, /\bblot\b/, /\bcapture\b/],
  },
  {
    intent: 'bearing_off',
    patterns: [/\bbear(ing)?\s*off\b/, /\bborne\s*off\b/, /\bbearoff\b/, /\bhome\s+board\b/],
  },
  {
    intent: 'dice',
    patterns: [/\bdice\b/, /\bdie\b/, /\bdoubles?\b/, /\broll\b/],
  },
  {
    intent: 'direction',
    patterns: [/\bdirection\b/, /\bhorseshoe\b/, /\bwhich\s+way\b/, /\bhome\b/],
  },
  {
    intent: 'blots',
    patterns: [/\bblot\b/, /\blone\b/, /\bunsafe\b/, /\bexposed\b/],
  },
  {
    intent: 'tip',
    patterns: [/\btip\b/, /\bteach\b/, /\blearn\b/, /\bhint\b/],
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
