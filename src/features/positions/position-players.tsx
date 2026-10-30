import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PlayerStrip } from '@/features/game/components/player-strip';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';
import { interFont } from '@/lib/ui/fonts';

/**
 * The same player strip a game shows, above (Black) or below (White) the
 * board. Tapping it puts that player on roll; in a match it edits their score.
 */
export function PositionPlayerStrip({ position, player, onChange }: {
  position: Position;
  player: Player;
  onChange: (p: Position) => void;
}) {
  const c = position.context;
  const state = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), currentPlayer: position.currentPlayer };
  const score = c.scores[player];
  const setScore = (next: number) => onChange({ ...position, context: { ...c, scores: { ...c.scores, [player]: next } } });
  const putOnRoll = () => onChange({ ...position, currentPlayer: player, context: { ...c, turnOwner: player, doubleAction: '', resignation: 0 } });
  return (
    <PlayerStrip
      state={state}
      player={player}
      headlineOverride={translate('positions.on_roll')}
      hideStrategy
      onPress={position.currentPlayer === player ? undefined : putOnRoll}
      pressHint={translate('positions.on_roll_hint')}
      trailing={c.matchLength > 0
        ? (
            <View style={styles.score} testID={`position-score-${player}`}>
              <Step symbol="minus" label={`${translate(`positions.${player}_score`)} −`} disabled={score <= 0} onPress={() => setScore(score - 1)} testID={`position-score-${player}-lower`} />
              <Text testID={`position-score-${player}-value`} style={styles.value} accessibilityLabel={`${translate(`positions.${player}_score`)}: ${score}`}>{score}</Text>
              <Step symbol="plus" label={`${translate(`positions.${player}_score`)} +`} disabled={score >= c.matchLength - 1} onPress={() => setScore(score + 1)} testID={`position-score-${player}-higher`} />
            </View>
          )
        : <View />}
    />
  );
}

export function Step({ symbol, label, disabled, onPress, testID }: { symbol: 'minus' | 'plus'; label: string; disabled: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.step, disabled && styles.stepDisabled, pressed && styles.pressed]}
    >
      <Feather name={symbol} size={16} color={GAME_PALETTE.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    minWidth: 26,
    textAlign: 'center',
    color: GAME_PALETTE.accent,
    fontSize: 22,
    ...interFont('bold'),
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.surface,
  },
  stepDisabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
