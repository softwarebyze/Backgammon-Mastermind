import type { GameResult, ModeStats } from '@/lib/game/stats';
import Feather from '@expo/vector-icons/Feather';
import Env from 'env';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { APP_LINKS } from '@/lib/app-links';
import { winRate } from '@/lib/game/stats';
import { hapticLight } from '@/lib/haptics';
import { translate, useSelectedLanguage } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { SETTINGS_MAX_WIDTH } from '@/lib/ui/game-chrome';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { continuousRadius } from '@/lib/ui/native-styles';
import { WEB_SETTINGS_TOP_PADDING } from '@/lib/ui/web-layout';
import { useGameStats } from './use-game-stats';

function Stat({ label, value, testID }: { label: string; value: number; testID?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`} testID={testID}>
      <AnimatedNumber value={value} style={styles.statValue} />
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

async function shareStreak(streak: number) {
  hapticLight();
  try {
    await Share.share({
      message: `${translate('stats.share_message', { count: streak })} ${APP_LINKS.website}`,
      title: Env.EXPO_PUBLIC_NAME,
    });
  }
  catch {
    // Share sheet dismissed or unavailable (some desktop browsers): nothing to do.
  }
}

function ComputerCard({ mode }: { mode: ModeStats }) {
  const rate = winRate(mode);
  const lost = mode.played - mode.whiteWins;
  return (
    <View style={styles.card} testID="stats-vs-computer">
      <Text style={styles.cardTitle}>{translate('stats.vs_computer')}</Text>
      <View style={styles.heroRow}>
        <View
          style={styles.rateBlock}
          accessible
          accessibilityLabel={`${translate('stats.win_rate')}: ${rate ?? 0}%`}
        >
          <View style={styles.rateValueRow}>
            <AnimatedNumber value={rate ?? 0} style={styles.rateValue} />
            <Text style={styles.ratePercent}>%</Text>
          </View>
          <Text style={styles.statLabel}>{translate('stats.win_rate')}</Text>
        </View>
        <View style={styles.statRow}>
          <Stat label={translate('stats.played')} value={mode.played} testID="stats-played" />
          <Stat label={translate('stats.won')} value={mode.whiteWins} testID="stats-won" />
          <Stat label={translate('stats.lost')} value={lost} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.streakRow}>
        <View style={styles.streakIcon}>
          <Feather name="zap" size={18} color={mode.currentStreak > 0 ? GAME_PALETTE.control : GAME_PALETTE.textMuted} />
        </View>
        <View style={styles.streakCopy} accessible testID="stats-streak">
          <Text style={styles.streakTitle}>
            {translate('stats.streak', { count: mode.currentStreak })}
          </Text>
          <Text style={styles.streakSub}>
            {translate('stats.best_streak', { count: mode.bestStreak })}
          </Text>
        </View>
        {mode.currentStreak > 0
          ? (
              <HoverPressable
                accessibilityRole="button"
                accessibilityLabel={translate('stats.share')}
                testID="stats-share-streak"
                onPress={() => void shareStreak(mode.currentStreak)}
                hitSlop={8}
                style={({ pressed, hovered }) => [styles.shareBtn, hovered && styles.shareBtnHover, pressed && styles.pressed]}
              >
                <Feather name="share" size={16} color={GAME_PALETTE.accent} />
                <Text style={styles.shareText}>{translate('stats.share')}</Text>
              </HoverPressable>
            )
          : null}
      </View>
      {mode.whiteGammons + mode.whiteBackgammons > 0
        ? (
            <Text style={styles.footnote}>
              {translate('stats.gammons_line', { gammons: mode.whiteGammons, backgammons: mode.whiteBackgammons })}
            </Text>
          )
        : null}
    </View>
  );
}

function PassAndPlayCard({ mode }: { mode: ModeStats }) {
  return (
    <View style={styles.card} testID="stats-pass-and-play">
      <Text style={styles.cardTitle}>{translate('stats.pass_and_play')}</Text>
      <View style={styles.statRow}>
        <Stat label={translate('stats.played')} value={mode.played} />
        <Stat label={translate('stats.white_wins')} value={mode.whiteWins} />
        <Stat label={translate('stats.black_wins')} value={mode.blackWins} />
      </View>
    </View>
  );
}

function resultTitle(result: GameResult): { text: string; good: boolean } {
  if (result.mode === 'vs-computer') {
    return result.winner === 'white'
      ? { text: translate('stats.result_win'), good: true }
      : { text: translate('stats.result_loss'), good: false };
  }
  return {
    text: translate(result.winner === 'white' ? 'stats.white_won' : 'stats.black_won'),
    good: true,
  };
}

function RecentRow({ result, locale }: { result: GameResult; locale: string | undefined }) {
  const title = resultTitle(result);
  const kind = result.kind === 'single' ? null : translate(result.kind === 'gammon' ? 'stats.kind_gammon' : 'stats.kind_backgammon');
  const mode = translate(result.mode === 'vs-computer' ? 'stats.vs_computer_short' : 'stats.pass_and_play');
  const date = new Date(result.at).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const sub = [mode, kind, translate('stats.moves', { count: result.moves })].filter(Boolean).join(' · ');
  return (
    <View style={styles.recentRow} accessible accessibilityLabel={`${title.text}. ${sub}. ${date}`}>
      {result.mode === 'vs-computer'
        ? (
            <View style={[styles.resultDot, title.good ? styles.resultDotWin : styles.resultDotLoss]}>
              <Feather name={title.good ? 'award' : 'x'} size={14} color={title.good ? GAME_PALETTE.bg : GAME_PALETTE.text} />
            </View>
          )
        : <CheckerToken player={result.winner} size={28} />}
      <View style={styles.recentCopy}>
        <Text style={styles.recentTitle} numberOfLines={1}>{title.text}</Text>
        <Text style={styles.recentSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={styles.recentDate}>{date}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={[styles.card, styles.empty]} testID="stats-empty">
      <Feather name="bar-chart-2" size={36} color={GAME_PALETTE.accentDim} />
      <Text style={styles.emptyTitle}>{translate('stats.empty_title')}</Text>
      <Text style={styles.emptyBody}>{translate('stats.empty_body')}</Text>
    </View>
  );
}

export function StatsScreen() {
  const stats = useGameStats();
  const { insets } = useLayoutMetrics();
  const { language } = useSelectedLanguage();
  const total = stats.vsComputer.played + stats.passAndPlay.played;

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        testID="stats-screen"
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          Platform.OS === 'web' ? { paddingTop: WEB_SETTINGS_TOP_PADDING } : undefined,
          contentEdgePadding(insets, { left: 16, right: 16, bottom: 32 }),
        ]}
      >
        <View style={styles.page}>
          {total === 0
            ? <EmptyState />
            : (
                <>
                  {stats.vsComputer.played > 0 ? <ComputerCard mode={stats.vsComputer} /> : null}
                  {stats.passAndPlay.played > 0 ? <PassAndPlayCard mode={stats.passAndPlay} /> : null}
                  <Text style={styles.sectionTitle} accessibilityRole="header">{translate('stats.recent')}</Text>
                  <View style={[styles.card, styles.recentCard]}>
                    {stats.recent.map(result => (
                      <RecentRow key={`${result.at}-${result.moves}`} result={result} locale={language} />
                    ))}
                  </View>
                </>
              )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
  },
  page: {
    width: '100%',
    maxWidth: SETTINGS_MAX_WIDTH,
    alignSelf: 'center',
    gap: 14,
    paddingTop: 8,
  },
  card: {
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    padding: 16,
    gap: 12,
    ...continuousRadius(18),
  },
  cardTitle: {
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    ...interFont('semibold'),
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rateBlock: {
    minWidth: 96,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rateValue: {
    color: GAME_PALETTE.text,
    fontSize: 44,
    lineHeight: 50,
    fontVariant: ['tabular-nums'],
    ...interFont('bold'),
  },
  ratePercent: {
    marginTop: 6,
    marginLeft: 2,
    color: GAME_PALETTE.textMuted,
    fontSize: 20,
    ...interFont('semibold'),
  },
  statRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    color: GAME_PALETTE.text,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
    ...interFont('semibold'),
  },
  statLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    ...interFont('medium'),
  },
  divider: {
    height: 1,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 152, 76, 0.12)',
    ...continuousRadius(10),
  },
  streakCopy: {
    flex: 1,
    minWidth: 0,
  },
  streakTitle: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('semibold'),
  },
  streakSub: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12.5,
    ...interFont('regular'),
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(999),
  },
  shareBtnHover: {
    borderColor: GAME_PALETTE.accent,
  },
  shareText: {
    color: GAME_PALETTE.accent,
    fontSize: 14,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.8,
  },
  footnote: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12.5,
    ...interFont('regular'),
  },
  sectionTitle: {
    marginTop: 6,
    marginLeft: 4,
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    ...interFont('semibold'),
  },
  recentCard: {
    paddingVertical: 4,
    gap: 0,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  resultDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultDotWin: {
    backgroundColor: GAME_PALETTE.control,
  },
  resultDotLoss: {
    backgroundColor: 'rgba(232, 224, 208, 0.12)',
  },
  recentCopy: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  recentSub: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12.5,
    ...interFont('regular'),
  },
  recentDate: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12.5,
    ...interFont('medium'),
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    color: GAME_PALETTE.text,
    fontSize: 18,
    ...interFont('semibold'),
  },
  emptyBody: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    ...interFont('regular'),
  },
});
