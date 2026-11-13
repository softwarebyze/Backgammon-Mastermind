import type { ComponentProps } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { HOME_INK } from '@/features/game/components/home-ink';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useLayoutIsRTL } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/**
 * A destination on Home: icon, name and a line about it. "Prominent" is ivory,
 * for picking a game back up. "Featured" is the full-width Learn card: its icon
 * sits in a brass ring, and it can show how far through the course you are.
 */
export function HomeCard({ testID, accessibilityLabel, symbol, label, sub, onPress, prominent = false, featured = false, progress, dense = false, compact = false, inline = false }: {
  testID: string;
  accessibilityLabel: string;
  symbol: ComponentProps<typeof Feather>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
  prominent?: boolean;
  featured?: boolean;
  /** 0 to 1, drawn as a bar under the copy. Left out when there is nothing to show yet. */
  progress?: number;
  /** Short screens: one line, 56px tall. */
  dense?: boolean;
  /** Landscape phones: as tall as the Start button beside it. */
  compact?: boolean;
  /** In the landscape header row: as wide as its label. */
  inline?: boolean;
}) {
  const layoutIsRTL = useLayoutIsRTL();
  const roomy = featured && !dense && !compact;
  const icon = <Feather name={symbol} size={20} color={prominent ? GAME_PALETTE.bg : featured ? HOME_INK.brass : HOME_INK.ivory} accessible={false} />;
  return (
    <HoverPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.card,
        dense && styles.cardDense,
        compact && styles.cardCompact,
        inline && styles.cardInline,
        prominent && styles.cardProminent,
        hovered && (prominent ? styles.cardProminentHover : styles.cardHover),
        pressed && styles.pressed,
      ]}
    >
      {roomy ? <View style={styles.ring}>{icon}</View> : icon}
      <View style={styles.cardCopy}>
        <Text style={[styles.cardLabel, (prominent || roomy) && styles.cardLabelLarge, prominent && styles.cardLabelProminent]}>{label}</Text>
        {sub ? <Text style={[styles.cardSub, prominent && styles.cardSubProminent]}>{sub}</Text> : null}
        {roomy && progress != null
          ? (
              <View testID={`${testID}-progress`} style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
              </View>
            )
          : null}
      </View>
      {(prominent || featured) && !inline
        ? <Feather name={layoutIsRTL ? 'chevron-left' : 'chevron-right'} size={20} color={prominent ? '#5A4636' : HOME_INK.muted} accessible={false} />
        : null}
    </HoverPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: HOME_INK.hairline,
    ...continuousRadius(16),
  },
  cardCompact: {
    minHeight: 48,
    paddingVertical: 6,
  },
  cardInline: {
    flexGrow: 0,
    flexBasis: 'auto',
    minHeight: 44,
    paddingVertical: 6,
  },
  cardDense: {
    minHeight: 56,
    paddingVertical: 8,
  },
  cardHover: {
    borderColor: 'rgba(236, 228, 212, 0.3)',
  },
  cardProminent: {
    flex: 0,
    backgroundColor: HOME_INK.ivory,
    borderColor: HOME_INK.ivory,
  },
  cardProminentHover: {
    backgroundColor: '#F6F0E4',
  },
  pressed: {
    opacity: 0.85,
  },
  ring: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(184, 148, 56, 0.45)',
    backgroundColor: 'rgba(184, 148, 56, 0.12)',
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    color: HOME_INK.ivory,
    fontSize: 15,
    ...interFont('semibold'),
  },
  cardLabelLarge: {
    fontSize: 17,
  },
  cardLabelProminent: {
    color: GAME_PALETTE.bg,
  },
  cardSub: {
    color: HOME_INK.muted,
    fontSize: 13,
    lineHeight: 18,
    ...interFont('regular'),
  },
  cardSubProminent: {
    color: '#5A4636',
  },
  track: {
    height: 4,
    marginTop: 6,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(236, 228, 212, 0.12)',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: HOME_INK.brass,
  },
});
