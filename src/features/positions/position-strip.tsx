import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { Pressable, Text, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { DieFace, EmptyDiePlaceholder } from '@/features/game/components/board/dice-display';
import { translate } from '@/lib/i18n';
import { PositionCubePanel } from './position-cube';
import { PositionDicePanel } from './position-dice';
import { PositionStackPanel } from './position-editor';
import { PositionScorePanel } from './position-scoreboard';
import { styles } from './position-styles';

export type PositionFocus = 'cube' | 'dice' | 'score' | null;

/**
 * The reserved strip under the board. It always takes the same space and only
 * swaps what is inside, so selecting a point, the cube or the score never
 * pushes the board or the page around.
 */
export function PositionStrip({ position, location, focus, color, onChange, onLocation, onFocus }: {
  position: Position;
  location: PositionLocation | null;
  focus: PositionFocus;
  color: Player;
  onChange: (p: Position) => void;
  onLocation: (location: PositionLocation | null) => void;
  onFocus: (focus: PositionFocus) => void;
}) {
  const close = () => {
    onLocation(null);
    onFocus(null);
  };
  return (
    <View testID="position-strip" style={styles.strip}>
      {location !== null
        ? <PositionStackPanel position={position} location={location} color={color} onChange={onChange} onLocation={onLocation} onDone={close} />
        : focus === 'cube'
          ? <PositionCubePanel position={position} onChange={onChange} onDone={close} />
          : focus === 'dice'
            ? <PositionDicePanel position={position} onChange={onChange} onDone={close} />
            : focus === 'score'
              ? <PositionScorePanel position={position} onChange={onChange} onDone={close} />
              : <PositionSummary position={position} onChange={onChange} onFocus={onFocus} />}
    </View>
  );
}

/** Nothing selected: who is on roll, the dice and the score, each one tap away. */
function PositionSummary({ position: p, onChange, onFocus }: { position: Position; onChange: (p: Position) => void; onFocus: (focus: PositionFocus) => void }) {
  const next: Player = p.currentPlayer === 'white' ? 'black' : 'white';
  const rolled = p.dice[0] > 0 && p.dice[1] > 0;
  const c = p.context;
  return (
    <View style={styles.stripPanel}>
      <Text style={styles.stripHint}>{translate('positions.strip_hint')}</Text>
      <View style={styles.summaryRow}>
        <SummaryTile
          testID="position-turn"
          label={translate(`positions.${p.currentPlayer}_turn`)}
          a11y={`${translate(`positions.${p.currentPlayer}_turn`)}. ${translate('positions.switch_turn')}`}
          onPress={() => onChange({ ...p, currentPlayer: next, context: { ...c, turnOwner: next, doubleAction: '', resignation: 0 } })}
        >
          <CheckerToken player={p.currentPlayer} size={30} />
        </SummaryTile>
        <SummaryTile
          testID="position-dice-toggle"
          label={rolled ? `${p.dice[0]}–${p.dice[1]}` : translate('positions.roll_later')}
          a11y={`${translate('positions.dice')}: ${rolled ? `${p.dice[0]}, ${p.dice[1]}` : translate('positions.roll_later')}`}
          onPress={() => onFocus('dice')}
        >
          <View style={styles.summaryDice}>
            {([0, 1] as const).map(index => (
              <View key={index} testID={`position-die-${index}`}>
                {p.dice[index] > 0
                  ? <DieFace value={p.dice[index]} used={false} playerColor={p.currentPlayer} displayStyle="dots" size={28} />
                  : <EmptyDiePlaceholder playerColor={p.currentPlayer} size={28} />}
              </View>
            ))}
          </View>
        </SummaryTile>
        <SummaryTile
          testID="position-score-toggle"
          label={c.matchLength ? `${translate('positions.match_to')} ${c.matchLength}` : translate('positions.money_game')}
          a11y={`${translate('positions.match_score')}: ${c.scores.white} – ${c.scores.black}. ${translate('positions.match_to')}: ${c.matchLength || translate('positions.money_game')}`}
          onPress={() => onFocus('score')}
        >
          <View style={styles.scorePair}>
            <Text style={styles.darkScore}>{c.scores.black}</Text>
            <Text style={styles.lightScore}>{c.scores.white}</Text>
          </View>
        </SummaryTile>
      </View>
    </View>
  );
}

function SummaryTile({ testID, label, a11y, onPress, children }: { testID: string; label: string; a11y: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [styles.summaryTile, pressed && styles.pressed]}
    >
      <View style={styles.summaryVisual}>{children}</View>
      <Text numberOfLines={1} style={styles.summaryLabel}>{label}</Text>
    </Pressable>
  );
}
