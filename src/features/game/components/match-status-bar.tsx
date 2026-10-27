import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { matchPlayer } from '@/features/game/match-copy';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function MatchStatusBar({ state }: { state: GameState }) {
  const m = state.match;
  if (!m)
    return null;
  return (
    <View style={styles.wrap} testID="match-status" accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text style={styles.label}>{translate('game.match.title', { length: m.length, game: m.gameNumber })}</Text>
        <Text style={styles.cube} testID="match-cube">{translate('game.match.cube', { value: m.cube.value, owner: matchPlayer(m.cube.owner) })}</Text>
      </View>
      <Text style={styles.score} testID="match-score">{translate('game.match.score', { white: m.score.white, black: m.score.black })}</Text>
      {m.crawford && <Text style={styles.note} testID="match-crawford">{translate('game.match.crawford')}</Text>}
      {m.result && <Text style={styles.note} testID="match-result">{translate(m.winner ? 'game.match.winner' : 'game.match.result', { player: matchPlayer(m.result.winner), points: m.result.points, kind: translate(`game.match.${m.result.kind}`) })}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 8, gap: 4, borderBottomWidth: 1, borderColor: GAME_PALETTE.accentDim },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  label: { color: GAME_PALETTE.textMuted, fontSize: 13, ...interFont('regular') },
  cube: { color: GAME_PALETTE.accent, fontSize: 14, ...interFont('semibold') },
  score: { color: GAME_PALETTE.text, fontSize: 20, fontVariant: ['tabular-nums'], ...interFont('semibold') },
  note: { color: GAME_PALETTE.accent, fontSize: 13, ...interFont('regular') },
});
