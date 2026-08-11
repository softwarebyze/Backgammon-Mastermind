import type { GameState } from '@/lib/game';

import { analyzePosition, formatMove } from '@/lib/coach/analyze-position';
import { matchCoachIntent } from '@/lib/coach/match-intent';
import { getLegalMoves } from '@/lib/game/moves';

function uniqueLegalLabels(state: GameState): string[] {
  const legal = (state.phase === 'moving' || state.phase === 'no-move')
    ? getLegalMoves(state)
    : [];
  const unique = new Map<string, string>();
  for (const m of legal) {
    const key = `${m.from}:${m.to}`;
    if (!unique.has(key)) {
      unique.set(key, formatMove(m));
    }
  }
  return [...unique.values()].slice(0, 24);
}

function occupancySummary(state: GameState): string {
  const points: string[] = [];
  for (let p = 1; p <= 24; p++) {
    const pt = state.points[p];
    if (pt?.player && pt.count > 0) {
      points.push(`${p}:${pt.player[0]}${pt.count}`);
    }
  }
  return points.join(' ') || 'empty';
}

/** True when the player is asking for / challenging a move recommendation. */
export function isMoveAdviceQuestion(text: string): boolean {
  const intent = matchCoachIntent(text);
  if (intent === 'best_move') {
    return true;
  }
  return /\b(point\s*\d+|can'?t|cannot|illegal|how would i|make point|good move|suggest|recommend)\b/i.test(text);
}

/** Compact board + engine facts for the WebLLM system prompt. */
export function buildCoachSystemPrompt(state: GameState): string {
  const facts = analyzePosition(state);
  const moveList = uniqueLegalLabels(state);
  const engine = facts.suggestedMove ? formatMove(facts.suggestedMove) : 'none';

  return [
    'You are a backgammon coach in Backgammon Mastermind.',
    'You are NOT a free-form strategist — you may ONLY discuss moves from the legal list below.',
    'Rules: White moves 24→1; Black moves 1→24. 0 = bar; off = bear-off.',
    'A “point” is a triangle 1–24. A die face is not a point. Never say “move dice, not pips.”',
    'Keep answers to 3–6 short sentences. No fluff.',
    '',
    'Live position:',
    `- Phase: ${facts.phase}`,
    `- Side to play: ${facts.currentPlayer}`,
    `- Dice: ${facts.dice[0]}-${facts.dice[1]} (remaining: ${facts.remainingDice.join(', ') || 'none'})`,
    `- Pips: White ${facts.whitePips}, Black ${facts.blackPips} (lead: ${facts.pipLead})`,
    `- Bar W/B: ${facts.whiteBar}/${facts.blackBar}; borne off W/B: ${facts.whiteBorneOff}/${facts.blackBorneOff}`,
    `- Blots W/B: ${facts.whiteBlots}/${facts.blackBlots}; made points W/B: ${facts.whiteMadePoints}/${facts.blackMadePoints}`,
    `- Must enter from bar: ${facts.mustEnter}; can bear off: ${facts.canBearOff}`,
    `- Engine pick (always legal if present): ${engine}`,
    `- Legal landings ONLY (${moveList.length}): ${moveList.join('; ') || 'none'}`,
    `- Occupancy (point:colorCount): ${occupancySummary(state)}`,
  ].join('\n');
}

/**
 * Hybrid coaching: lock the model onto the engine move so it cannot invent
 * illegal “make point 4” advice like a raw tiny LLM tends to.
 */
export function buildConstrainedUserMessage(state: GameState, userText: string): string {
  const facts = analyzePosition(state);
  const moveList = uniqueLegalLabels(state);
  const engine = facts.suggestedMove ? formatMove(facts.suggestedMove) : null;

  if (!isMoveAdviceQuestion(userText)) {
    return [
      `Player question: ${userText}`,
      'Answer using only the live position facts. If discussing moves, only cite legal landings.',
    ].join('\n');
  }

  if (state.phase === 'rolling' || state.phase === 'opening-roll') {
    return [
      `Player question: ${userText}`,
      'HARD RULES: No move advice yet — tell them to roll first (or finish the opening roll).',
    ].join('\n');
  }

  if (!engine || moveList.length === 0) {
    return [
      `Player question: ${userText}`,
      'HARD RULES: There is no legal move with these dice. Say so briefly and tell them to pass when ready.',
    ].join('\n');
  }

  return [
    `Player question: ${userText}`,
    '',
    'HARD RULES (do not break):',
    `1. Recommend ONLY this move: ${engine}`,
    `2. You may mention other landings only from: ${moveList.join(', ')}`,
    '3. Never invent a point/move not on that list. Never claim an illegal landing is good.',
    `4. Explain why ${engine} helps (hit blot / make or keep a point / safety / race / enter from bar).`,
    `5. If the player says a move is impossible: if it is not ${engine} and not on the legal list, agree it is illegal, then recommend ${engine}.`,
    '6. Do not repeat yourself. Do not say “move dice not pips.”',
  ].join('\n');
}
