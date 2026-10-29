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

/** A flip scorecard: ivory for White, dark for Black, plain for the target. */
function ScoreCard({ text, tone }: { text: string; tone: Player | 'target' }) {
  return (
    <View style={[styles.scoreCard, tone === 'black' && styles.scoreCardDark, tone === 'target' && styles.scoreCardTarget]}>
      <Text style={[styles.scoreCardText, tone === 'black' && styles.scoreCardTextDark, tone === 'target' && styles.scoreCardTextTarget, text.length > 3 && styles.scoreCardTextSmall]}>
        {text}
      </Text>
      {tone !== 'target' && (
        <>
          <View pointerEvents="none" style={styles.scoreSeam} />
          <View pointerEvents="none" style={[styles.scoreHinge, { left: 1 }]} />
          <View pointerEvents="none" style={[styles.scoreHinge, { right: 1 }]} />
        </>
      )}
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
    <View style={styles.scoreColumn}>
      <PositionStepper
        label={translate(`positions.${player}_score`)}
        testID={`position-score-${player}`}
        value={c.scores[player]}
        min={0}
        max={Math.max(scoreCap, c.scores[player])}
        onChange={score => setScore(player, score)}
        disabled={money}
      >
        <ScoreCard text={String(c.scores[player])} tone={player} />
      </PositionStepper>
      <Text style={styles.scoreCaption}>{translate(`positions.${player}`)}</Text>
    </View>
  );
  return (
    <StripPanel title={translate('positions.match_score')} onDone={onDone} testID="position-scoreboard" accessory={rules}>
      <View style={styles.scoreboardRow}>
        {side('black')}
        <View style={styles.scoreColumn}>
          <PositionStepper
            label={translate('positions.match_to')}
            testID="position-match-length"
            value={c.matchLength}
            display={money ? translate('positions.money_short') : String(c.matchLength)}
            min={0}
            max={Math.max(MAX_MATCH, c.matchLength)}
            onChange={setLength}
          >
            <ScoreCard text={money ? translate('positions.money_short') : String(c.matchLength)} tone="target" />
          </PositionStepper>
          <Text style={styles.scoreCaption}>{translate('positions.match_to')}</Text>
        </View>
        {side('white')}
      </View>
    </StripPanel>
  );
}
