import type { Position } from '@/lib/positions/position';
import { StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { PositionAction } from './position-controls';
import { Step } from './position-players';

const MAX_MATCH = 25;

/** Money game, or a match to 1–25 points, with the rules that apply to it. */
export function PositionMatchRow({ position: p, onChange }: { position: Position; onChange: (p: Position) => void }) {
  const c = p.context;
  const money = c.matchLength === 0;
  const context = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...c, ...patch } });
  const setLength = (matchLength: number) => context({
    matchLength,
    scores: matchLength
      ? { white: Math.min(matchLength - 1, c.scores.white), black: Math.min(matchLength - 1, c.scores.black) }
      : { white: 0, black: 0 },
    crawford: false,
    jacoby: false,
    beavers: false,
  });
  return (
    <View style={styles.row} testID="position-match-row">
      <Step symbol="minus" label={`${translate('positions.match_to')} −`} disabled={money} onPress={() => setLength(c.matchLength - 1)} testID="position-match-length-lower" />
      <Text style={styles.label} testID="position-match-length">
        {money ? translate('positions.money_game') : `${translate('positions.match_to')} ${c.matchLength}`}
      </Text>
      <Step symbol="plus" label={`${translate('positions.match_to')} +`} disabled={c.matchLength >= MAX_MATCH} onPress={() => setLength(c.matchLength + 1)} testID="position-match-length-higher" />
      <View style={styles.rules}>
        {money
          ? (
              <>
                <PositionAction compact chip label={translate('positions.jacoby')} testID="position-jacoby" selected={c.jacoby} onPress={() => context({ jacoby: !c.jacoby })} />
                <PositionAction compact chip label={translate('positions.beavers')} testID="position-beavers" selected={c.beavers} onPress={() => context({ beavers: !c.beavers })} />
              </>
            )
          : <PositionAction compact chip label={translate('positions.crawford')} testID="position-crawford" selected={c.crawford} onPress={() => context({ crawford: !c.crawford })} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  rules: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
});
