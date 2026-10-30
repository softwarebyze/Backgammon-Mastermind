import type { GameState } from '@/lib/game';
import type { TxKeyPath } from '@/lib/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { MatchScorecard } from '@/features/game/components/match-scorecard';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { matchPlayer } from '@/features/game/match-copy';
import { calculatePipCount } from '@/lib/game';
import { getTurnDisplay } from '@/lib/game/turn-display';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function MatchStatusBar({ state, headline, isReviewing = false }: { state: GameState; headline?: string | null; isReviewing?: boolean }) {
  const m = state.match;
  if (!m)
    return null;
  const respondingPlayer: GameState['currentPlayer'] = m.pendingOffer === 'white' ? 'black' : 'white';
  const turnState = m.pendingOffer ? { ...state, currentPlayer: respondingPlayer, phase: 'rolling' as const } : state;
  const result = m.result && translate(m.winner ? 'game.match.winner' : 'game.match.result', { player: matchPlayer(m.result.winner), points: m.result.points, kind: translate(`game.match.${m.result.kind}`) });
  return (
    <View style={styles.wrap} testID="match-status">
      <View style={styles.row}>
        <View style={styles.scores} testID="match-score" accessible accessibilityHint={(['white', 'black'] as const).map(player => translate('game.status.pips_a11y', { player: matchPlayer(player), pips: calculatePipCount(state, player), off: state.borneOff[player] })).join('. ')} accessibilityLabel={translate('game.match.score', { white: m.score.white, black: m.score.black })} accessibilityLiveRegion="polite">
          <MatchScorecard player="white" score={m.score.white} active={turnState.currentPlayer === 'white' && !m.result} />
          <View style={styles.target} testID="match-target" accessible accessibilityLabel={translate('game.match.title', { length: m.length, game: m.gameNumber })}>
            <Text style={styles.targetLabel}>{translate('game.match.board.match_to' as TxKeyPath)}</Text>
            <Text style={styles.targetNumber}>{m.length}</Text>
            <View style={styles.seam} />
          </View>
          <MatchScorecard player="black" score={m.score.black} active={turnState.currentPlayer === 'black' && !m.result} />
        </View>
      </View>
      <Text style={styles.status} numberOfLines={1} accessibilityLiveRegion="polite" testID={m.result ? 'match-result' : m.crawford ? 'match-crawford' : 'match-turn'}>
        {isReviewing ? translate('game.review.viewing_hint') : result || (m.crawford ? translate('game.match.crawford') : headline ?? (m.pendingOffer === 'white' && state.mode === 'vs-computer' ? translate('game.turn.computer_turn') : getTurnDisplay(turnState).headline))}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4, gap: 4, flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scores: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  target: { width: 54, height: 48, borderRadius: 5, backgroundColor: '#3C3028', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  targetLabel: { color: '#F5F0E8', fontSize: 10, lineHeight: 12, ...interFont('medium') },
  targetNumber: { color: '#F5F0E8', fontSize: 25, lineHeight: 30, fontVariant: ['tabular-nums'], ...interFont('semibold') },
  seam: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  status: { color: GAME_PALETTE.accent, fontSize: 13, height: 20, lineHeight: 20, textAlign: 'center', ...interFont('medium') },
});
