import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import { Text, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { translate } from '@/lib/i18n';
import { PositionAction } from './position-controls';
import { PositionStepper } from './position-stepper';
import { StripPanel } from './position-strip-panel';
import { styles } from './position-styles';

/** Longest match the stepper offers; imported positions may still carry longer ones. */
const MAX_MATCH = 25;

/** Scores and match length as steppers: no number pad, no keyboard Done bar. */
export function PositionScorePanel({ position: p, onChange, onDone }: { position: Position; onChange: (p: Position) => void; onDone: () => void }) {
  const c = p.context;
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
  return (
    <StripPanel title={translate('positions.match_score')} onDone={onDone} testID="position-scoreboard">
      <View style={styles.stripRow}>
        <View style={styles.scoreSide}>
          <Text style={styles.stripLabel}>{translate('positions.match_to')}</Text>
          <PositionStepper
            label={translate('positions.match_to')}
            testID="position-match-length"
            value={c.matchLength}
            display={c.matchLength ? String(c.matchLength) : translate('positions.money_short')}
            min={0}
            max={Math.max(MAX_MATCH, c.matchLength)}
            onChange={setLength}
            wide
          />
        </View>
        {c.matchLength > 0 && <PositionAction compact chip label={translate('positions.crawford')} testID="position-crawford" selected={c.crawford} onPress={() => context({ crawford: !c.crawford })} />}
      </View>
      {c.matchLength > 0
        ? (
            <View style={styles.stripRow}>
              {(['black', 'white'] as const).map(player => (
                <View key={player} style={styles.scoreSide}>
                  <CheckerToken player={player} size={20} />
                  <PositionStepper
                    label={translate(`positions.${player}_score`)}
                    testID={`position-score-${player}`}
                    value={c.scores[player]}
                    min={0}
                    max={Math.max(scoreCap, c.scores[player])}
                    onChange={score => setScore(player, score)}
                  />
                </View>
              ))}
            </View>
          )
        : (
            // Money play has no score to keep, only the optional rules.
            <View style={[styles.stripRow, { justifyContent: 'flex-start' }]}>
              <PositionAction compact chip label={translate('positions.jacoby')} testID="position-jacoby" selected={c.jacoby} onPress={() => context({ jacoby: !c.jacoby })} />
              <PositionAction compact chip label={translate('positions.beavers')} testID="position-beavers" selected={c.beavers} onPress={() => context({ beavers: !c.beavers })} />
            </View>
          )}
    </StripPanel>
  );
}
