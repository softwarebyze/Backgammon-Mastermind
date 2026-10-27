import type { Player } from '@/lib/game';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { matchPlayer } from '@/features/game/match-copy';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

/** The numeral switches discretely; only its physical leaf moves. */
export function MatchScorecard({ player, score, pips, off = 0, active }: { player: Player; score: number; pips: number; off?: number; active: boolean }) {
  const reducedMotion = useReducedMotion();
  const previous = useRef(score);
  const angle = useSharedValue(0);
  useEffect(() => {
    if (previous.current === score)
      return;
    previous.current = score;
    angle.value = reducedMotion ? 0 : -65;
    if (!reducedMotion)
      angle.value = withTiming(0, { duration: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) });
  }, [score, reducedMotion, angle]);
  const flip = useAnimatedStyle(() => ({ transform: [{ perspective: 500 }, { rotateX: `${angle.value}deg` }] }));
  return (
    <View style={styles.player}>
      <Text style={[styles.name, active && styles.active]} numberOfLines={1}>{matchPlayer(player)}</Text>
      <Animated.View style={[styles.card, player === 'black' && styles.darkCard, flip]} testID={`match-score-${player}`}>
        <Text style={[styles.score, player === 'black' && styles.lightInk]}>{score}</Text>
        <View style={styles.seam} />
        <View style={[styles.hinge, styles.leftHinge]} />
        <View style={[styles.hinge, styles.rightHinge]} />
      </Animated.View>
      <View style={styles.pipColumn}>
        <Text style={styles.pips} testID={`pip-count-${player}`} accessibilityLabel={translate('game.status.pips_a11y', { player: matchPlayer(player), pips, off })}>
          {pips}
        </Text>
        <Text style={styles.pipLabel}>{translate('game.match.pips')}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  player: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  name: { color: GAME_PALETTE.text, fontSize: 13, flexShrink: 1, ...interFont('medium') },
  active: { color: GAME_PALETTE.accent },
  card: { width: 38, height: 46, borderRadius: 5, backgroundColor: '#E8E0D0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  darkCard: { backgroundColor: '#3C3028' },
  score: { color: GAME_PALETTE.bg, fontSize: 30, lineHeight: 40, fontVariant: ['tabular-nums'], ...interFont('semibold') },
  lightInk: { color: '#F5F0E8' },
  seam: { position: 'absolute', top: '50%', height: 1, left: 0, right: 0, backgroundColor: 'rgba(30,12,2,0.28)' },
  hinge: { position: 'absolute', top: 20, width: 3, height: 6, borderRadius: 1, backgroundColor: '#9F896E' },
  leftHinge: { left: 1 },
  rightHinge: { right: 1 },
  pipColumn: { alignItems: 'center' },
  pipLabel: { color: GAME_PALETTE.textMuted, fontSize: 10, lineHeight: 12, ...interFont('regular') },
  pips: { color: GAME_PALETTE.textMuted, fontSize: 12, fontVariant: ['tabular-nums'], ...interFont('regular') },
});
