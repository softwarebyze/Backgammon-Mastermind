import type { GameState } from '@/lib/game';

import { analyzePosition, formatMove } from '@/lib/coach/analyze-position';
import { getLegalMoves } from '@/lib/game/moves';

/** Compact board + engine facts for the WebLLM system prompt. */
export function buildCoachSystemPrompt(state: GameState): string {
  const facts = analyzePosition(state);
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
  const moveList = [...unique.values()].slice(0, 24);

  const points: string[] = [];
  for (let p = 1; p <= 24; p++) {
    const pt = state.points[p];
    if (pt?.player && pt.count > 0) {
      points.push(`${p}:${pt.player[0]}${pt.count}`);
    }
  }

  return [
    'You are a friendly backgammon coach inside the Backgammon Mastermind app.',
    'Teach clearly in plain English. Keep answers concise (usually 2–6 short sentences).',
    'Use the live position facts below. Do not invent illegal moves.',
    'White moves 24→1; Black moves 1→24. Point 0 is the bar; bearing off is “off”.',
    '',
    'Live position:',
    `- Phase: ${facts.phase}`,
    `- Side to play: ${facts.currentPlayer}`,
    `- Dice: ${facts.dice[0]}-${facts.dice[1]} (remaining: ${facts.remainingDice.join(', ') || 'none'})`,
    `- Pips: White ${facts.whitePips}, Black ${facts.blackPips} (lead: ${facts.pipLead})`,
    `- Bar: White ${facts.whiteBar}, Black ${facts.blackBar}`,
    `- Borne off: White ${facts.whiteBorneOff}, Black ${facts.blackBorneOff}`,
    `- Blots: White ${facts.whiteBlots}, Black ${facts.blackBlots}`,
    `- Made points: White ${facts.whiteMadePoints}, Black ${facts.blackMadePoints}`,
    `- Can bear off now: ${facts.canBearOff}`,
    `- Must enter from bar: ${facts.mustEnter}`,
    `- Engine teaching suggestion: ${facts.suggestedMove ? formatMove(facts.suggestedMove) : 'none'}`,
    `- Distinct legal landings (${unique.size}): ${moveList.join('; ') || 'none'}`,
    `- Occupancy (point:playerCount, w/b): ${points.join(' ') || 'empty'}`,
  ].join('\n');
}
