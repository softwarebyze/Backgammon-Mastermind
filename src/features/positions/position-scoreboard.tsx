import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import { Text, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { crawfordPossible, nextMatchLength } from './match-length';
import { PositionAction } from './position-controls';
import { PositionStepper } from './position-stepper';
import { styles } from './position-styles';

/** Longest match the stepper offers; imported positions may still carry longer ones. */
const MAX_MATCH = 25;

/** A scorecard: ivory for White, black for Black. */
function ScoreCard({ score, player }: { score: number; player: Player }) {
  const text = String(score);
  return (
    <View style={[styles.scoreCard, player === 'black' && styles.scoreCardDark]}>
      <Text style={[styles.scoreCardText, player === 'black' && styles.scoreCardTextDark, text.length > 2 && styles.scoreCardTextSmall]}>{text}</Text>
    </View>
  );
}

/** The middle card: "Match to" above the length, or Money. */
function TargetCard({ length }: { length: number }) {
  return (
    <View style={styles.targetCard}>
      <Text style={styles.targetLabel}>
        {translate(length ? 'positions.match_to' : 'positions.money_short')}
      </Text>
      <Text style={styles.targetNumber}>{length || '–'}</Text>
    </View>
  );
}

/**
 * The match as a scoreboard: Black's card, the target, White's card, each
 * with ▲ / ▼. Money play has no score to keep, so only the target shows and
 * Jacoby / Beavers replace Crawford. A position only needs to know whether
 * this is the Crawford game (no doubling), so that is the one chip, shown
 * when exactly one side is a point from winning. The match-wide Crawford
 * rule only shapes later games, so it is chosen on Home when a match starts.
 */
export function PositionScoreboard({ position: p, onChange }: { position: Position; onChange: (p: Position) => void }) {
  const c = p.context;
  const money = c.matchLength === 0;
  const rule = c.crawfordRule !== false;
  const context = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...c, ...patch } });
  // A side that reached the target has already won the match.
  const scoreCap = c.matchLength - 1;
  const setLength = (matchLength: number) => context({
    matchLength,
    scores: matchLength
      ? { white: Math.min(matchLength - 1, c.scores.white), black: Math.min(matchLength - 1, c.scores.black) }
      : { white: 0, black: 0 },
    crawford: false,
    jacoby: false,
    beavers: false,
  });
  const side = (player: Player) => (
    <PositionStepper
      label={translate(`positions.${player}_score`)}
      testID={`position-score-${player}`}
      value={c.scores[player]}
      min={0}
      max={Math.max(scoreCap, c.scores[player])}
      onChange={(score) => {
        const scores = { ...c.scores, [player]: score };
        const possible = rule && crawfordPossible({ matchLength: c.matchLength, scores });
        // Reaching match point starts the Crawford game, as in play.
        context({ scores, crawford: possible && (c.crawford || !crawfordPossible(c)) });
      }}
      disabled={money}
    >
      <ScoreCard score={c.scores[player]} player={player} />
    </PositionStepper>
  );
  return (
    <View style={styles.scorePanel} testID="position-scoreboard">
      <View style={styles.scoreHeading}>
        <Text style={styles.scoreTitle}>{translate(money ? 'positions.money_game' : 'positions.match_score')}</Text>
        <View style={styles.scoreRules}>
          {money
            ? (
                <>
                  <PositionAction compact chip label={translate('positions.jacoby')} testID="position-jacoby" selected={c.jacoby} onPress={() => context({ jacoby: !c.jacoby })} />
                  <PositionAction compact chip label={translate('positions.beavers')} testID="position-beavers" selected={c.beavers} onPress={() => context({ beavers: !c.beavers })} />
                </>
              )
            : (
                (crawfordPossible(c) || c.crawford) && <PositionAction compact chip label={translate('positions.crawford_game')} testID="position-crawford" selected={c.crawford} onPress={() => context({ crawford: !c.crawford })} />
              )}
        </View>
      </View>
      <View style={styles.scoreboard}>
        {!money && side('black')}
        <PositionStepper
          label={translate('positions.match_to')}
          testID="position-match-length"
          value={c.matchLength}
          display={money ? translate('positions.money_short') : String(c.matchLength)}
          min={0}
          max={Math.max(MAX_MATCH, c.matchLength)}
          step={nextMatchLength}
          onChange={setLength}
        >
          <TargetCard length={c.matchLength} />
        </PositionStepper>
        {!money && side('white')}
      </View>
    </View>
  );
}
