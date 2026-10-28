import { StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

/** Matches the ivory cube introduced by the match-play work in PR #325. */
export function DoublingCubeFace({ value, unavailable = false, size = 44 }: { value: number; unavailable?: boolean; size?: number }) {
  const face = String(value === 1 ? 64 : value);
  return (
    <View testID="doubling-cube-face" style={[styles.face, { width: size, height: size, opacity: unavailable ? 0.45 : 1 }]}>
      <Text style={[styles.value, { fontSize: Math.round(size * (face.length > 3 ? 0.32 : 0.54)) }]}>{face}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { backgroundColor: '#E8E0D0', borderRadius: 7, borderTopWidth: 3, borderTopColor: '#FFF8EA', borderBottomWidth: 3, borderBottomColor: '#A38A65', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-6deg' }] },
  value: { color: GAME_PALETTE.bg, fontVariant: ['tabular-nums'], ...interFont('bold') },
});
