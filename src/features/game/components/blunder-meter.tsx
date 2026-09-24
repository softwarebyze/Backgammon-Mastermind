import { StyleSheet, Text, View } from 'react-native';

import { BLUNDER_BANDS, BLUNDER_METER_MAX } from '@/features/game/blunder-bands';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/**
 * A visual blunder scale: a segmented bar in the standard GNU Backgammon
 * bands with a needle marking the player's equity loss. Beginner words
 * label each band; the caption cites the source of the boundaries.
 */
export function BlunderMeter({ loss }: { loss: number }) {
  const clamped = Math.min(Math.max(loss, 0), BLUNDER_METER_MAX);
  const position = (clamped / BLUNDER_METER_MAX) * 100;
  const found = BLUNDER_BANDS.findIndex(band => loss < band.max);
  // Losses past the end of the bar belong to the final band.
  const activeIndex = found === -1 ? BLUNDER_BANDS.length - 1 : found;
  // The accessible severity comes from the highlighted band, so it can never
  // disagree with what sighted users see.
  const severity = BLUNDER_BANDS[activeIndex].label;

  return (
    <View
      testID="guidance-blunder-meter"
      accessibilityRole="image"
      accessibilityLabel={
        `Blunder severity: ${severity}. Lost about ${loss.toFixed(2)} points per game. `
        + 'Standard scale bands follow GNU Backgammon: doubtful at 0.04, bad at 0.08, very bad at 0.16.'
      }
      style={styles.wrap}
    >
      <View style={styles.track}>
        {BLUNDER_BANDS.map((band, i) => (
          <View
            key={band.label}
            style={[
              styles.segment,
              { flex: band.flex, backgroundColor: band.color },
              i === 0 && styles.segmentFirst,
              i === BLUNDER_BANDS.length - 1 && styles.segmentLast,
            ]}
          />
        ))}
        <View
          testID="guidance-blunder-needle"
          style={[styles.needle, { left: `${position}%` }]}
        />
      </View>
      <View style={styles.labels}>
        {BLUNDER_BANDS.map((band, i) => (
          <Text
            key={band.label}
            style={[
              styles.label,
              { flex: band.flex },
              i === activeIndex && styles.labelActive,
            ]}
          >
            {band.label}
          </Text>
        ))}
      </View>
      <Text style={styles.caption}>
        Blunder scale (GNU Backgammon): Fine under 0.04 · Slip 0.04–0.08 · Mistake 0.08–0.16 · Big blunder 0.16+
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingTop: 10,
  },
  track: {
    flexDirection: 'row',
    height: 10,
    ...continuousRadius(5),
    overflow: 'visible',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  segment: {
    height: '100%',
  },
  segmentFirst: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  segmentLast: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  needle: {
    position: 'absolute',
    top: -9,
    width: 0,
    height: 0,
    marginLeft: -6,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: GAME_PALETTE.text,
  },
  labels: {
    flexDirection: 'row',
  },
  label: {
    textAlign: 'center',
    fontSize: 10,
    color: GAME_PALETTE.textMuted,
    ...interFont('semibold'),
  },
  labelActive: {
    color: GAME_PALETTE.text,
  },
  caption: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    color: GAME_PALETTE.textMuted,
    ...interFont('regular'),
  },
});
