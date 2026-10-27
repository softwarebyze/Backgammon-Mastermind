import type { Player } from '@/lib/game';
import type { MatchState } from '@/lib/game/match';
import { StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { matchPlayer } from '@/features/game/match-copy';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function MatchCube({ cube, crawford = false, pendingOffer = null }: { pendingOffer?: Player | null; cube: MatchState['cube']; crawford?: boolean }) {
  return (
    <View
      testID="match-cube"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${pendingOffer ? translate('game.match.offer', { player: matchPlayer(pendingOffer), opponent: matchPlayer(pendingOffer === 'white' ? 'black' : 'white'), value: cube.value * 2, points: cube.value }) : translate('game.match.cube', { value: cube.value, owner: matchPlayer(cube.owner) })}${crawford ? `. ${translate('game.match.crawford')}` : ''}`}
      style={styles.wrap}
    >
      <View style={[styles.face, crawford && styles.unavailable, pendingOffer && styles.pending]}>
        <Text style={styles.value}>{pendingOffer ? cube.value * 2 : cube.value === 1 ? 64 : cube.value}</Text>
      </View>
      <View style={styles.ownership} testID={pendingOffer ? `match-cube-pending-${pendingOffer}` : undefined}>
        <Text testID={`match-cube-owner-${cube.owner}`} style={styles.owner}>{matchPlayer(cube.owner)}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { width: 44, alignItems: 'center' },
  face: { width: 34, height: 34, backgroundColor: '#E8E0D0', borderRadius: 7, borderTopWidth: 3, borderTopColor: '#FFF8EA', borderBottomWidth: 3, borderBottomColor: '#A38A65', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-6deg' }] },
  value: { color: GAME_PALETTE.bg, fontSize: 21, fontVariant: ['tabular-nums'], ...interFont('bold') },
  ownership: { height: 12, width: 44, justifyContent: 'center', alignItems: 'center' },
  owner: { color: GAME_PALETTE.textMuted, fontSize: 10, lineHeight: 12, ...interFont('medium') },
  unavailable: { opacity: 0.45 },
  pending: { borderColor: GAME_PALETTE.accent, borderWidth: 2, transform: [{ rotate: '6deg' }] },
});
