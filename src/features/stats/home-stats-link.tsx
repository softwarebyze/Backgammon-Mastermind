import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate, useLayoutIsRTL } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
import { useGameStats } from './use-game-stats';

/** Home: a quiet one-line record that opens the stats screen. Hidden until a game is finished. */
export function HomeStatsLink() {
  const stats = useGameStats();
  const rtl = useLayoutIsRTL();
  const computer = stats.vsComputer;
  const played = computer.played + stats.passAndPlay.played;
  if (played === 0) {
    return null;
  }
  const sub = computer.played > 0
    ? translate('stats.home_sub', { won: computer.whiteWins, played: computer.played })
    : translate('stats.pass_and_play');

  return (
    <HoverPressable
      accessibilityRole="button"
      accessibilityLabel={[translate('stats.home_a11y'), sub, computer.currentStreak > 1 ? translate('stats.streak', { count: computer.currentStreak }) : null].filter(Boolean).join('. ')}
      testID="home-stats-link"
      onPress={() => {
        hapticLight();
        router.push('/stats');
      }}
      style={({ pressed, hovered }) => [styles.row, hovered && styles.rowHover, pressed && styles.pressed]}
    >
      <View style={styles.iconSlot}>
        <Feather name="bar-chart-2" size={20} color={GAME_PALETTE.accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{translate('stats.home_cta')}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
      </View>
      {computer.currentStreak > 1
        ? (
            <View style={styles.streak}>
              <Feather name="zap" size={13} color={GAME_PALETTE.controlInk} />
              <Text style={styles.streakText}>{computer.currentStreak}</Text>
            </View>
          )
        : null}
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={18} color={GAME_PALETTE.textMuted} />
    </HoverPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 52,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(14),
  },
  // Same icon column as the mode buttons above, so the icons line up.
  iconSlot: {
    width: 32,
    alignItems: 'center',
  },
  rowHover: {
    borderColor: GAME_PALETTE.accent,
  },
  pressed: {
    opacity: 0.85,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  sub: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12.5,
    ...interFont('regular'),
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: GAME_PALETTE.control,
    ...continuousRadius(999),
  },
  streakText: {
    color: GAME_PALETTE.controlInk,
    fontSize: 12,
    ...interFont('bold'),
  },
});
