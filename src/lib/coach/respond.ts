import type { CoachIntent, PositionFacts } from '@/lib/coach/types';
import type { GameState } from '@/lib/game';

import { analyzePosition, formatMove } from '@/lib/coach/analyze-position';
import { matchCoachIntent } from '@/lib/coach/match-intent';
import { pickTip } from '@/lib/game/tips';
import { translate } from '@/lib/i18n';

function playerLabel(player: 'white' | 'black'): string {
  return player === 'white'
    ? translate('coach.players.white')
    : translate('coach.players.black');
}

function raceSentence(facts: PositionFacts): string {
  if (facts.pipLead === 'tied') {
    return translate('coach.reply.race_tied', {
      pips: facts.whitePips,
    });
  }
  const leader = playerLabel(facts.pipLead);
  const leaderPips = facts.pipLead === 'white' ? facts.whitePips : facts.blackPips;
  const trailerPips = facts.pipLead === 'white' ? facts.blackPips : facts.whitePips;
  return translate('coach.reply.race_lead', {
    leader,
    diff: facts.pipDiff,
    leaderPips,
    trailerPips,
  });
}

function explainPosition(state: GameState, facts: PositionFacts): string {
  if (facts.phase === 'opening-roll') {
    return translate('coach.reply.explain_opening');
  }
  if (facts.phase === 'game-over') {
    const winner = state.winner ? playerLabel(state.winner) : '—';
    return translate('coach.reply.explain_game_over', { winner });
  }
  if (facts.phase === 'rolling') {
    return [
      translate('coach.reply.explain_rolling', {
        player: playerLabel(facts.currentPlayer),
      }),
      raceSentence(facts),
    ].join('\n\n');
  }
  if (facts.phase === 'no-move') {
    return [
      translate('coach.reply.explain_no_move', {
        player: playerLabel(facts.currentPlayer),
        dice: `${facts.dice[0]}-${facts.dice[1]}`,
      }),
      raceSentence(facts),
    ].join('\n\n');
  }

  const parts: string[] = [
    translate('coach.reply.explain_moving', {
      player: playerLabel(facts.currentPlayer),
      dice: facts.remainingDice.join(', ') || `${facts.dice[0]}-${facts.dice[1]}`,
      moves: facts.uniqueMoveCount,
    }),
  ];

  if (facts.mustEnter) {
    parts.push(translate('coach.reply.must_enter', {
      count: state.bar[facts.currentPlayer],
    }));
  }
  if (facts.canBearOff) {
    parts.push(translate('coach.reply.can_bear_off'));
  }
  if (facts.suggestedMove) {
    parts.push(translate('coach.reply.engine_likes', {
      move: formatMove(facts.suggestedMove),
    }));
  }

  parts.push(raceSentence(facts));
  parts.push(translate('coach.reply.blot_summary', {
    you: facts.currentPlayer === 'white' ? facts.whiteBlots : facts.blackBlots,
    them: facts.currentPlayer === 'white' ? facts.blackBlots : facts.whiteBlots,
  }));

  return parts.join('\n\n');
}

function bestMoveReply(facts: PositionFacts): string {
  if (facts.phase === 'opening-roll') {
    return translate('coach.reply.best_move_opening');
  }
  if (facts.phase === 'rolling') {
    return translate('coach.reply.best_move_roll_first');
  }
  if (facts.phase === 'game-over') {
    return translate('coach.reply.best_move_game_over');
  }
  if (facts.phase === 'no-move' || facts.uniqueMoveCount === 0 || !facts.suggestedMove) {
    return translate('coach.reply.best_move_none', {
      dice: `${facts.dice[0]}-${facts.dice[1]}`,
    });
  }
  return translate('coach.reply.best_move', {
    move: formatMove(facts.suggestedMove),
    options: facts.uniqueMoveCount,
  });
}

function buildReply(state: GameState, intent: CoachIntent, facts: PositionFacts): string {
  switch (intent) {
    case 'welcome':
      return translate('coach.reply.welcome');
    case 'explain_position':
      return explainPosition(state, facts);
    case 'best_move':
      return bestMoveReply(facts);
    case 'race':
      return [
        raceSentence(facts),
        translate('coach.reply.race_extra', {
          whiteOff: facts.whiteBorneOff,
          blackOff: facts.blackBorneOff,
        }),
      ].join('\n\n');
    case 'bar':
      return translate('coach.reply.bar', {
        white: facts.whiteBar,
        black: facts.blackBar,
        mustEnter: facts.mustEnter
          ? translate('coach.reply.bar_you_must')
          : translate('coach.reply.bar_clear'),
      });
    case 'hitting':
      return translate('coach.reply.hitting');
    case 'bearing_off':
      return translate('coach.reply.bearing_off', {
        whiteOff: facts.whiteBorneOff,
        blackOff: facts.blackBorneOff,
        canNow: facts.canBearOff
          ? translate('coach.reply.bearing_off_now')
          : translate('coach.reply.bearing_off_not_yet'),
      });
    case 'dice':
      return translate('coach.reply.dice');
    case 'direction':
      return translate('coach.reply.direction');
    case 'blots':
      return translate('coach.reply.blots', {
        white: facts.whiteBlots,
        black: facts.blackBlots,
      });
    case 'tip':
      return translate('coach.reply.tip', {
        tip: pickTip(facts.whitePips + facts.blackPips + facts.legalMoveCount),
      });
    case 'fallback':
    default:
      return translate('coach.reply.fallback');
  }
}

export type CoachReply = {
  intent: CoachIntent;
  text: string;
};

/**
 * Local coach — uses the on-device engine + curated teaching copy.
 * No network, no API keys, free for every player.
 */
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
  return {
    intent: 'welcome',
    text: translate('coach.reply.welcome'),
  };
}
