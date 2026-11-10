import type { TextStyle } from 'react-native';
import type { TimerPlayer, TimerState } from '../timer-clock';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { forceLtrStyle, forceLtrWebDir } from '@/lib/ui/force-ltr';
import { continuousRadius } from '@/lib/ui/native-styles';
import {
  formatClock,
  isLowTime,
  remainingFraction,
  TIMER_LOW_MS,
} from '../timer-clock';

const INK = {
  white: { main: '#2A1608', muted: '#7A6248' },
  black: { main: '#F3EADB', muted: '#9A8570' },
} as const;
type Props = {
  player: TimerPlayer;
  state: TimerState;
  timeFontSize: number;
  compact: boolean;
  onPress: (player: TimerPlayer) => void;
  testID: string;
};
export function TimerClockCard({ player, state, timeFontSize, compact, onPress, testID }: Props) {
  const name = translate(player === 'white' ? 'timer.white' : 'timer.black');
  const running = state.status === 'running';
  const active = running && state.active === player;
  const paused = state.status === 'paused' && state.active === player;
  const expired = state.status === 'expired' && state.expiredPlayer === player;
  const idle = state.status === 'idle';
  const waiting = running && state.active !== player;
  const remaining = state.remainingMs[player];
  const low = isLowTime(remaining);
  const fraction = remainingFraction(state, player);
  const ink = INK[player];
  const showTenths = !idle && remaining > 0 && remaining < TIMER_LOW_MS;
  const time = formatClock(remaining, showTenths);
  const status = clockStatus({ expired, active, paused, waiting });
  const delaySeconds = Math.ceil(((active || paused) ? state.delayLeftMs : state.config.delayMs) / 1000);
  const delayHot = active && state.delayLeftMs > 0;
  const label = translate('timer.clock_a11y', { player: name, time });
  const hint = idle ? translate('timer.start_hint') : translate('timer.move_hint');
  const disabled = state.status !== 'idle' && !active;
  return (
    <HoverPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityValue={{ text: status }}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(player)}
      style={({ pressed, hovered }) => [
        styles.card,
        compact && styles.cardCompact,
        player === 'white' ? styles.whiteCard : styles.blackCard,
        active && styles.activeCard,
        expired && styles.expiredCard,
        waiting && styles.dimmed,
        hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow} {...forceLtrWebDir}>
        <View style={styles.player}>
          <View style={[styles.checker, player === 'white' ? styles.whiteChecker : styles.blackChecker]} />
          <Text style={[styles.name, { color: ink.main }]}>{name}</Text>
        </View>
        <StatusPill active={active} expired={expired} muted={ink.muted} status={status} />
      </View>
      <Text
        style={[
          styles.time,
          {
            color: low || expired ? dangerFor(player) : ink.main,
            fontSize: timeFontSize,
            lineHeight: Math.round(timeFontSize * 1.02),
          },
        ]}
        {...forceLtrWebDir}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {time}
      </Text>
      <View style={styles.bottom}>
        <View
          style={[
            styles.delayPill,
            { borderColor: player === 'white' ? 'rgba(42, 22, 8, 0.16)' : 'rgba(243, 234, 219, 0.14)' },
            delayHot && styles.delayHot,
          ]}
        >
          <Feather
            name="zap"
            size={12}
            color={delayHot ? GAME_PALETTE.controlInk : ink.muted}
            accessible={false}
          />
          <Text style={[styles.delayText, { color: delayHot ? GAME_PALETTE.controlInk : ink.muted }]}>
            {translate('timer.delay_pill', { seconds: delaySeconds })}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: player === 'white' ? 'rgba(42, 22, 8, 0.14)' : 'rgba(243, 234, 219, 0.12)' }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${fraction * 100}%`,
                backgroundColor: low || expired ? dangerFor(player) : active ? GAME_PALETTE.control : ink.muted,
              },
            ]}
          />
        </View>
      </View>
    </HoverPressable>
  );
}
function StatusPill({ active, expired, muted, status }: { active: boolean; expired: boolean; muted: string; status: string }) {
  return (
    <View style={[styles.statusPill, active && styles.statusActive, expired && styles.statusExpired, !active && !expired && styles.statusMuted]}>
      <Text style={[styles.statusText, { color: active || expired ? GAME_PALETTE.bg : muted }, (active || expired) && styles.statusTextStrong]}>{status}</Text>
    </View>
  );
}
function clockStatus({ expired, active, paused, waiting }: { expired: boolean; active: boolean; paused: boolean; waiting: boolean }) {
  return expired
    ? translate('timer.finished_title')
    : active
      ? translate('timer.active')
      : paused
        ? translate('timer.paused')
        : waiting
          ? translate('timer.waiting')
          : translate('timer.ready');
}

function dangerFor(player: TimerPlayer): string {
  return player === 'white' ? '#B3301D' : '#FF7A5C';
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 184,
    padding: 18,
    paddingBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'space-between',
    gap: 8,
    ...continuousRadius(22),
  },
  cardCompact: {
    minHeight: 132,
    padding: 14,
    paddingBottom: 12,
    ...continuousRadius(18),
  },
  whiteCard: {
    backgroundColor: '#E9DEC7',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  blackCard: {
    backgroundColor: '#171009',
    borderColor: 'rgba(243, 234, 219, 0.1)',
  },
  activeCard: {
    borderColor: GAME_PALETTE.control,
  },
  expiredCard: {
    borderColor: '#C34432',
  },
  dimmed: {
    opacity: 0.62,
  },
  hovered: {
    borderColor: 'rgba(255, 137, 51, 0.55)',
  },
  pressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checker: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  whiteChecker: {
    backgroundColor: '#F6EEDC',
    borderWidth: 1,
    borderColor: '#B08E58',
  },
  blackChecker: {
    backgroundColor: '#26263C',
    borderWidth: 1,
    borderColor: '#585893',
  },
  name: {
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    ...interFont('semibold'),
  },
  statusPill: {
    minHeight: 24,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  statusActive: {
    backgroundColor: GAME_PALETTE.control,
  },
  statusExpired: {
    backgroundColor: '#C34432',
  },
  statusMuted: {
    backgroundColor: 'transparent',
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    ...interFont('semibold'),
  },
  statusTextStrong: {
    ...interFont('bold'),
  },
  time: {
    letterSpacing: -2.5,
    textAlign: 'center',
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
    ...(forceLtrStyle as TextStyle),
    ...interFont('bold'),
  },
  bottom: {
    gap: 10,
  },
  delayPill: {
    alignSelf: 'flex-start',
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderRadius: 999,
  },
  delayHot: {
    backgroundColor: GAME_PALETTE.control,
    borderColor: GAME_PALETTE.control,
  },
  delayText: {
    fontSize: 11.5,
    letterSpacing: 0.2,
    ...interFont('medium'),
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
