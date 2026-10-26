import { StyleSheet, Text, View } from 'react-native';

import { BLUNDER_BANDS, BLUNDER_METER_MAX } from '@/features/game/blunder-bands';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { blunderBandLabel } from '@/features/game/guidance-copy';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

const NEEDLE_HALF_WIDTH = 6;

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
  const severity = blunderBandLabel(BLUNDER_BANDS[activeIndex]!.id);

  return (
    <View
      testID="guidance-blunder-meter"
      accessibilityRole="image"
      accessibilityLabel={
        translate('game.tutor.meter_a11y', { severity, loss: loss.toFixed(2) })
      }
      style={styles.wrap}
    >
      <View testID="guidance-blunder-track" style={styles.track}>
        {/* The rounded clip owns the corners, so the outer ends stay round in RTL. */}
        <View testID="guidance-blunder-bands" style={styles.bands}>
          {BLUNDER_BANDS.map(band => (
            <View
              key={band.id}
              style={[styles.segment, { flex: band.flex, backgroundColor: band.color }]}
            />
          ))}
        </View>
        {/*
          A row like the bands, so the needle mirrors with them in RTL. Neither
          side of the needle gets narrower than half the needle, so at either
          end the whole needle stays over the bar.
        */}
        <View pointerEvents="none" testID="guidance-blunder-needle-row" style={styles.needleRow}>
          <View testID="guidance-blunder-needle-offset" style={[styles.needleOffset, { width: `${position}%` }]} />
          <View style={styles.needleAnchor}>
            <View testID="guidance-blunder-needle" style={styles.needle} />
          </View>
          <View testID="guidance-blunder-needle-rest" style={styles.needleRest} />
        </View>
      </View>
      <View style={styles.labels}>
        {BLUNDER_BANDS.map((band, i) => (
          <View key={band.id} style={{ flex: band.flex, alignItems: 'center' }}>
            <Text
              style={[
                styles.label,
                i === activeIndex && styles.labelActive,
              ]}
            >
              {blunderBandLabel(band.id)}
            </Text>
            <Text style={styles.range}>
              {band.range}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>
        {translate('game.tutor.meter_caption')}
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
    height: 10,
  },
  bands: {
    flexDirection: 'row',
    height: '100%',
    ...continuousRadius(5),
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  segment: {
    height: '100%',
  },
  needleRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  // Shrinks only when the rest's minimum would push the needle past the end.
  needleOffset: {
    flexShrink: 1,
    minWidth: NEEDLE_HALF_WIDTH,
  },
  needleRest: {
    flexGrow: 1,
    minWidth: NEEDLE_HALF_WIDTH,
  },
  // Zero-width column: the 12pt needle centers on the offset's end edge.
  needleAnchor: {
    width: 0,
    alignItems: 'center',
  },
  needle: {
    marginTop: -9,
    width: 0,
    height: 0,
    borderLeftWidth: NEEDLE_HALF_WIDTH,
    borderRightWidth: NEEDLE_HALF_WIDTH,
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
  range: {
    textAlign: 'center',
    fontSize: 9,
    color: GAME_PALETTE.textMuted,
    opacity: 0.7,
    ...interFont('regular'),
    fontVariant: ['tabular-nums'],
  },
  caption: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    color: GAME_PALETTE.textMuted,
    ...interFont('regular'),
  },
});
