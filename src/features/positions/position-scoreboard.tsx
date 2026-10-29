import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import { Text, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { PositionAction } from './position-controls';
import { PositionStepper } from './position-stepper';
import { StripPanel } from './position-strip-panel';
import { styles } from './position-styles';

/** Longest match the stepper offers; imported positions may still carry longer ones. */
const MAX_MATCH = 25;

function Rings() {
  return (
    <>
      <View pointerEvents="none" style={[styles.scoreRing, { left: '22%' }]} />
      <View pointerEvents="none" style={[styles.scoreRing, { right: '22%' }]} />
    </>
  );
}

/** A flip scorecard: ivory for White, black for Black. */
function ScoreCard({ score, player }: { score: number; player: Player }) {
  const text = String(score);
  return (
    <View style={[styles.scoreCard, player === 'black' && styles.scoreCardDark]}>
      <Rings />
      <Text style={[styles.scoreCardText, player === 'black' && styles.scoreCardTextDark, text.length > 2 && styles.scoreCardTextSmall]}>{text}</Text>
    </View>
  );
}

/** The smaller middle card: "Match to" above the length, or Money. */
function TargetCard({ length }: { length: number }) {
  return (
    <View style={styles.targetCard}>
      <Rings />
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.targetLabel}>
        {translate(length ? 'positions.match_to' : 'positions.money_short')}
      </Text>
      <Text style={styles.targetNumber}>{length || '–'}</Text>
    </View>
  );
}

/**
 * The match as a scoreboard: Black's card, the target, White's card, each
 * with ▲ / ▼. Match rules sit beside the title. In money play there is no
 * score to keep, so the cards dim and Jacoby / Beavers replace Crawford.
 */
export function PositionScorePanel({ position: p, onChange, onDone }: { position: Position; onChange: (p: Position) => void; onDone: () => void }) {
  const c = p.context;
  const money = c.matchLength === 0;
  const context = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...c, ...patch } });
  // A side that reached the target has already won the match.
  const scoreCap = c.matchLength - 1;
  const setScore = (player: Player, score: number) => context({ scores: { ...c.scores, [player]: score } });
  const setLength = (matchLength: number) => context({
    matchLength,
    scores: matchLength
      ? { white: Math.min(matchLength - 1, c.scores.white), black: Math.min(matchLength - 1, c.scores.black) }
      : c.scores,
    crawford: false,
    jacoby: false,
    beavers: false,
  });
  const rules = money
    ? (
        <>
          <PositionAction compact chip label={translate('positions.jacoby')} testID="position-jacoby" selected={c.jacoby} onPress={() => context({ jacoby: !c.jacoby })} />
          <PositionAction compact chip label={translate('positions.beavers')} testID="position-beavers" selected={c.beavers} onPress={() => context({ beavers: !c.beavers })} />
        </>
      )
    : <PositionAction compact chip label={translate('positions.crawford')} testID="position-crawford" selected={c.crawford} onPress={() => context({ crawford: !c.crawford })} />;
  const side = (player: Player) => (
    <PositionStepper
      label={translate(`positions.${player}_score`)}
      testID={`position-score-${player}`}
      value={c.scores[player]}
      min={0}
      max={Math.max(scoreCap, c.scores[player])}
      onChange={score => setScore(player, score)}
      disabled={money}
    >
      <ScoreCard score={c.scores[player]} player={player} />
    </PositionStepper>
  );
  return (
    <StripPanel title={translate('positions.match_score')} onDone={onDone} testID="position-scoreboard" accessory={rules}>
      <View style={styles.scoreboard}>
        <View pointerEvents="none" style={styles.scoreBacking} />
        <View pointerEvents="none" style={styles.scoreRail} />
        {side('black')}
        <PositionStepper
          label={translate('positions.match_to')}
          testID="position-match-length"
          value={c.matchLength}
          display={money ? translate('positions.money_short') : String(c.matchLength)}
          min={0}
          max={Math.max(MAX_MATCH, c.matchLength)}
          onChange={setLength}
        >
          <TargetCard length={c.matchLength} />
        </PositionStepper>
        {side('white')}
      </View>
    </StripPanel>
  );
}
