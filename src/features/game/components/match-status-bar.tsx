import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';
import { MatchCube } from '@/features/game/components/match-cube';
import { MatchScorecard } from '@/features/game/components/match-scorecard';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { matchPlayer } from '@/features/game/match-copy';
import { calculatePipCount } from '@/lib/game';
import { getTurnDisplay } from '@/lib/game/turn-display';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function MatchStatusBar({ state, headline }: { state: GameState; headline?: string | null }) {
  const m = state.match;
  if (!m)
    return null;
  const respondingPlayer: GameState['currentPlayer'] = m.pendingOffer === 'white' ? 'black' : 'white';
  const turnState = m.pendingOffer ? { ...state, currentPlayer: respondingPlayer, phase: 'rolling' as const } : state;
  const result = m.result && translate(m.winner ? 'game.match.winner' : 'game.match.result', { player: matchPlayer(m.result.winner), points: m.result.points, kind: translate(`game.match.${m.result.kind}`) });
  return (
    <View style={styles.wrap} testID="match-status">
      <Text style={styles.title} numberOfLines={1}>{translate('game.match.title', { length: m.length, game: m.gameNumber })}</Text>
      <View style={styles.row}>
        <View style={styles.scores} testID="match-score" accessible accessibilityHint={(['white', 'black'] as const).map(player => translate('game.status.pips_a11y', { player: matchPlayer(player), pips: calculatePipCount(state, player), off: state.borneOff[player] })).join('. ')} accessibilityLabel={translate('game.match.score', { white: m.score.white, black: m.score.black })} accessibilityLiveRegion="polite">
          <MatchScorecard player="white" score={m.score.white} pips={calculatePipCount(state, 'white')} off={state.borneOff.white} active={turnState.currentPlayer === 'white' && !m.result} />
          <MatchScorecard player="black" score={m.score.black} pips={calculatePipCount(state, 'black')} off={state.borneOff.black} active={turnState.currentPlayer === 'black' && !m.result} />
        </View>
        <MatchCube cube={m.cube} crawford={m.crawford} pendingOffer={m.pendingOffer} />
      </View>
      <Text style={styles.status} numberOfLines={1} accessibilityLiveRegion="polite" testID={m.result ? 'match-result' : m.crawford ? 'match-crawford' : 'match-turn'}>
        {result || (m.crawford ? translate('game.match.crawford') : headline ?? (m.pendingOffer === 'white' && state.mode === 'vs-computer' ? translate('game.turn.computer_turn') : getTurnDisplay(turnState).headline))}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4, gap: 4, flexShrink: 0 },
  title: { color: GAME_PALETTE.textMuted, fontSize: 12, lineHeight: 16, textAlign: 'center', ...interFont('regular') },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scores: { flex: 1, flexDirection: 'row', gap: 8 },
  status: { color: GAME_PALETTE.accent, fontSize: 13, height: 20, lineHeight: 20, textAlign: 'center', ...interFont('medium') },
});
