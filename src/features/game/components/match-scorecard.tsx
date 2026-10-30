import type { Player } from '@/lib/game';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { matchPlayer } from '@/features/game/match-copy';
import { interFont } from '@/lib/ui/fonts';

/** Keep scores outside the transformed/clipped leaf so Android always paints them. */
export function MatchScorecard({ player, score, active }: { player: Player; score: number; active: boolean }) {
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
    <View style={styles.player} accessibilityLabel={`${matchPlayer(player)} ${score}`} accessible>
      <View style={[styles.card, active && styles.activeCard, player === 'black' && styles.darkCard]} testID={`match-score-${player}`}>
        <Animated.View pointerEvents="none" style={[styles.leaf, flip]} testID={`match-score-leaf-${player}`}>
          <View style={styles.seam} />
          <View style={[styles.hinge, styles.leftHinge]} />
          <View style={[styles.hinge, styles.rightHinge]} />
        </Animated.View>
        <Text testID={`match-score-numeral-${player}`} style={[styles.score, player === 'black' && styles.lightInk]}>{score}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  activeCard: { borderWidth: 2, borderColor: GAME_PALETTE.accent },
  player: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  card: { width: 42, height: 48, borderRadius: 5, backgroundColor: '#E8E0D0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  // Animate only the seam/hinges. An opaque transformed Android layer can cover
  // sibling text even after the transform has settled.
  leaf: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 5, zIndex: 0 },
  darkCard: { backgroundColor: '#3C3028' },
  score: { zIndex: 1, color: GAME_PALETTE.bg, fontSize: 30, lineHeight: 40, fontVariant: ['tabular-nums'], ...interFont('semibold') },
  lightInk: { color: '#F5F0E8' },
  seam: { position: 'absolute', top: '50%', height: 1, left: 0, right: 0, backgroundColor: 'rgba(30,12,2,0.28)' },
  hinge: { position: 'absolute', top: 0, width: 3, height: 7, borderRadius: 1, backgroundColor: '#9F896E' },
  leftHinge: { left: 8 },
  rightHinge: { right: 8 },
});
