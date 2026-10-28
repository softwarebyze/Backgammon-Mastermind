import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { styles } from './position-styles';

/** Editable flip-scorecard material shared visually with match play in PR #325. */
export function PositionScoreboard({ position: p, onChange }: { position: Position; onChange: (p: Position) => void }) {
  const setScore = (player: Player, score: number) => onChange({ ...p, context: { ...p.context, scores: { ...p.context.scores, [player]: Math.min(p.context.matchLength || 32767, score) } } });
  const setLength = (matchLength: number) => onChange({ ...p, context: {
    ...p.context,
    matchLength,
    scores: { white: Math.min(matchLength || 32767, p.context.scores.white), black: Math.min(matchLength || 32767, p.context.scores.black) },
    crawford: false,
    jacoby: false,
    beavers: false,
  } });
  return (
    <View testID="position-scoreboard" style={{ gap: 12 }}>
      <View style={styles.row}>
        <Text style={styles.disclosureTitle}>{translate('positions.match_score')}</Text>
        <Feather name="edit-3" size={15} color={GAME_PALETTE.accentDim} accessible={false} />
      </View>
      <View style={scoreStyles.board}>
        <ScoreCard player="white" score={p.context.scores.white} onChange={score => setScore('white', score)} />
        <View style={scoreStyles.target}>
          <Text style={styles.caption}>{translate('positions.match_to')}</Text>
          <ScoreInput label={translate('positions.match_length')} testID="position-match-length" value={p.context.matchLength} onChange={setLength} target />
          <Text style={scoreStyles.unit}>{translate(p.context.matchLength ? 'positions.points' : 'positions.money_game')}</Text>
        </View>
        <ScoreCard player="black" score={p.context.scores.black} onChange={score => setScore('black', score)} />
      </View>
    </View>
  );
}

function ScoreCard({ player, score, onChange }: { player: Player; score: number; onChange: (score: number) => void }) {
  const dark = player === 'black';
  return (
    <View style={scoreStyles.player}>
      <View style={scoreStyles.name}>
        <CheckerToken player={player} size={18} />
        <Text style={styles.buttonText}>{translate(`positions.${player}`)}</Text>
      </View>
      <View style={[scoreStyles.card, dark && scoreStyles.darkCard]}>
        <ScoreInput label={translate(`positions.${player}_score`)} testID={`position-score-${player}`} value={score} onChange={onChange} dark={dark} />
        <View pointerEvents="none" style={scoreStyles.seam} />
        <View pointerEvents="none" style={[scoreStyles.hinge, { left: 1 }]} />
        <View pointerEvents="none" style={[scoreStyles.hinge, { right: 1 }]} />
      </View>
    </View>
  );
}

function ScoreInput({ label, testID, value, onChange, dark = false, target = false }: { label: string; testID: string; value: number; onChange: (value: number) => void; dark?: boolean; target?: boolean }) {
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={label}
      keyboardType="number-pad"
      selectTextOnFocus
      maxLength={5}
      value={String(value)}
      onChangeText={(text) => {
        if (/^\d{0,5}$/.test(text))
          onChange(Math.min(32767, Number(text)));
      }}
      style={[scoreStyles.input, dark && scoreStyles.lightInk, target && scoreStyles.targetInput, { fontSize: String(value).length > 3 ? 22 : 36 }]}
    />
  );
}

const scoreStyles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 12 },
  player: { flex: 1, maxWidth: 120, alignItems: 'center', gap: 10 },
  name: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 24 },
  card: { width: '100%', maxWidth: 100, height: 76, borderRadius: 6, backgroundColor: '#E8E0D0', justifyContent: 'center', overflow: 'hidden' },
  darkCard: { backgroundColor: '#3C3028' },
  input: { width: '100%', height: 76, textAlign: 'center', padding: 0, color: GAME_PALETTE.bg, ...interFont('semibold'), fontVariant: ['tabular-nums'] },
  lightInk: { color: '#F5F0E8' },
  seam: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(30,12,2,0.28)' },
  hinge: { position: 'absolute', top: 34, width: 3, height: 8, borderRadius: 1, backgroundColor: '#9F896E' },
  target: { width: 84, alignItems: 'center', gap: 10 },
  targetInput: { height: 76, color: GAME_PALETTE.text, backgroundColor: GAME_PALETTE.surface, borderRadius: 6 },
  unit: { ...interFont('regular'), fontSize: 12, lineHeight: 17, textAlign: 'center', color: '#CBB8A7' },
});
