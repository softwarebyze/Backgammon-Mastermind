import type { CoachIntent, PositionFacts } from '@/lib/coach/types';
import type { GameState } from '@/lib/game';

import { analyzePosition, formatMove } from '@/lib/coach/analyze-position';
import { matchCoachIntent } from '@/lib/coach/match-intent';
import { pickTip } from '@/lib/game/tips';

const WELCOME
  = 'POC coach — free, on-device, no API. Ask about this position or tap a chip. Uses the same rules engine as the computer opponent.';

function playerLabel(player: 'white' | 'black'): string {
  return player === 'white' ? 'White' : 'Black';
}

function raceSentence(facts: PositionFacts): string {
  if (facts.pipLead === 'tied') {
    return `The race is tied at ${facts.whitePips} pips each. Lower pips = closer to finishing.`;
  }
  const leader = playerLabel(facts.pipLead);
  const leaderPips = facts.pipLead === 'white' ? facts.whitePips : facts.blackPips;
  const trailerPips = facts.pipLead === 'white' ? facts.blackPips : facts.whitePips;
  return `${leader} leads by ${facts.pipDiff} pip(s) (${leaderPips} vs ${trailerPips}).`;
}

function explainPosition(state: GameState, facts: PositionFacts): string {
  if (facts.phase === 'opening-roll') {
    return 'Opening roll: each side rolls one die. Higher goes first and plays both dice. Ties re-roll.';
  }
  if (facts.phase === 'game-over') {
    const winner = state.winner ? playerLabel(state.winner) : '—';
    return `Game over — ${winner} won by bearing off all 15 first.`;
  }
  if (facts.phase === 'rolling') {
    return `${playerLabel(facts.currentPlayer)} should roll.\n\n${raceSentence(facts)}`;
  }
  if (facts.phase === 'no-move') {
    return `${playerLabel(facts.currentPlayer)} rolled ${facts.dice[0]}-${facts.dice[1]} but nothing is legal — pass the turn.\n\n${raceSentence(facts)}`;
  }

  const parts = [
    `${playerLabel(facts.currentPlayer)} to play [${facts.remainingDice.join(', ') || `${facts.dice[0]}-${facts.dice[1]}`}]. About ${facts.uniqueMoveCount} distinct legal landing(s).`,
  ];
  if (facts.mustEnter) {
    parts.push(`You have ${state.bar[facts.currentPlayer]} on the bar — enter before other moves.`);
  }
  if (facts.canBearOff) {
    parts.push('You can bear off with the current dice.');
  }
  if (facts.suggestedMove) {
    parts.push(`Engine suggestion: ${formatMove(facts.suggestedMove)}.`);
  }
  parts.push(raceSentence(facts));
  parts.push(
    `Blots: you ${facts.currentPlayer === 'white' ? facts.whiteBlots : facts.blackBlots}, opponent ${facts.currentPlayer === 'white' ? facts.blackBlots : facts.whiteBlots}.`,
  );
  return parts.join('\n\n');
}

function bestMoveReply(facts: PositionFacts): string {
  if (facts.phase === 'opening-roll') {
    return 'Roll for opening first — then I can suggest moves.';
  }
  if (facts.phase === 'rolling') {
    return 'Roll the dice first — then ask again.';
  }
  if (facts.phase === 'game-over') {
    return 'Game over — start a new game for fresh advice.';
  }
  if (facts.phase === 'no-move' || facts.uniqueMoveCount === 0 || !facts.suggestedMove) {
    return `With ${facts.dice[0]}-${facts.dice[1]}, there is no legal move.`;
  }
  return `POC engine likes ${formatMove(facts.suggestedMove)} among ${facts.uniqueMoveCount} options. Teaching suggestion only — not a world-class bot.`;
}

function buildReply(state: GameState, intent: CoachIntent, facts: PositionFacts): string {
  switch (intent) {
    case 'welcome':
      return WELCOME;
    case 'explain_position':
      return explainPosition(state, facts);
    case 'best_move':
      return bestMoveReply(facts);
    case 'race':
      return `${raceSentence(facts)}\n\nBorne off: White ${facts.whiteBorneOff}, Black ${facts.blackBorneOff}.`;
    case 'bar':
      return `Bar: White ${facts.whiteBar}, Black ${facts.blackBar}. You must re-enter from the bar before moving other checkers.`;
    case 'hitting':
      return 'Hitting: land on a point with exactly one enemy checker (a blot). It goes to the bar. You cannot land on two+ enemy checkers.';
    case 'bearing_off':
      return `Bearing off: remove checkers once all 15 are in your home board. Borne off so far — White ${facts.whiteBorneOff}, Black ${facts.blackBorneOff}. ${facts.canBearOff ? 'A bear-off is legal now.' : 'No bear-off with current dice.'}`;
    case 'dice':
      return 'Roll two dice and play both if you can (doubles = four moves). Either die first. If only one number is playable, play it.';
    case 'direction':
      return 'White moves 24 → 1. Black moves 1 → 24. Horseshoe path: opponent home → outer boards → your home.';
    case 'blots':
      return `Blots on board: White ${facts.whiteBlots}, Black ${facts.blackBlots}. A blot is a lone checker — it can be hit.`;
    case 'tip':
      return pickTip(facts.whitePips + facts.blackPips + facts.legalMoveCount);
    case 'fallback':
    default:
      return 'POC coach — try a chip, or ask about the race, hitting, bearing off, dice, or “what’s a good move?”';
  }
}

export type CoachReply = {
  intent: CoachIntent;
  text: string;
};

/** Local POC coach — no network, no API keys. */
export function coachRespond(
  state: GameState,
  options: { intent?: CoachIntent; question?: string } = {},
): CoachReply {
  const facts = analyzePosition(state);
  const intent
    = options.intent
      ?? (options.question ? matchCoachIntent(options.question) : 'explain_position');
  return {
    intent,
    text: buildReply(state, intent, facts),
  };
}

export function coachWelcome(): CoachReply {
  return { intent: 'welcome', text: WELCOME };
}
