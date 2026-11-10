import type { TimerPlayer } from './timer-clock';
import Feather from '@expo/vector-icons/Feather';

import { StyleSheet, Text, View } from 'react-native';
import { FocusAwareStatusBar, ScrollView } from '@/components/ui';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { confirmAction } from '@/lib/confirm';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

import { useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { TimerClockCard } from './components/timer-clock-card';
import { TimerControls } from './components/timer-controls';
import { playTimerSfx } from './timer-sfx';
import { changeTimerControl } from './timer-store';
import { useTimerClock } from './use-timer-clock';

export function TimerScreen() {
  const timer = useTimerClock();
  const { clock, preferences } = timer;
  const { width, height, insets } = useLayoutMetrics();

  const wide = width >= 760;
  const compact = height < 760 || width < 380;
  const sideBySide = wide && !preferences.facePlayers;
  const timeFontSize = sideBySide ? (compact ? 72 : 92) : (compact ? 64 : Math.min(88, width * 0.22));
  const idle = clock.status === 'idle';
  const paused = clock.status === 'paused';
  const running = clock.status === 'running';
  const expired = clock.status === 'expired';
  const expiredName = clock.expiredPlayer === null
    ? ''
    : translate(clock.expiredPlayer === 'white' ? 'timer.white' : 'timer.black');
  const hint = expired
    ? translate('timer.finished_body', { player: expiredName })
    : idle
      ? translate('timer.start_hint')
      : running
        ? translate('timer.move_hint')
        : translate('timer.paused');

  const actions = timerActions(timer);

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        testID="timer-screen"
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={[styles.page, wide && styles.pageWide]}>
          <TimerHeader running={running} paused={paused} idle={idle} onPause={actions.handlePauseToggle} onReset={actions.handleReset} />
          <View
            style={[
              styles.clocks,
              compact && styles.clocksCompact,
              sideBySide && styles.clocksSideBySide,
            ]}
          >
            <View style={[styles.clockSlot, sideBySide && styles.clockSlotSideBySide, preferences.facePlayers && styles.clockFacing]}>
              <TimerClockCard
                player="black"
                state={clock}
                timeFontSize={timeFontSize}
                compact={compact}
                onPress={actions.handleClockPress}
                testID="timer-clock-black"
              />
            </View>
            <View style={[styles.clockSlot, sideBySide && styles.clockSlotSideBySide]}>
              <TimerClockCard
                player="white"
                state={clock}
                timeFontSize={timeFontSize}
                compact={compact}
                onPress={actions.handleClockPress}
                testID="timer-clock-white"
              />
            </View>
          </View>
          <Text
            testID="timer-hint"
            style={[
              styles.hint,
              expired && styles.hintExpired,
              !expired && !paused && styles.hintMuted,
            ]}
          >
            {hint}
          </Text>
          {preferences.facePlayers && (
            <View style={styles.facingHint}>
              <Feather name="smartphone" size={14} color={GAME_PALETTE.textMuted} accessible={false} />
              <Text style={styles.facingText}>{translate('timer.facing_hint')}</Text>
            </View>
          )}
          <TimerControls
            state={clock}
            preferences={preferences}
            onSelectMinutes={actions.handleSelectMinutes}
            onSelectDelay={actions.handleSelectDelay}
            onToggleSound={actions.handleToggleSound}
            onToggleFacing={actions.handleToggleFacing}
          />
        </View>
      </ScrollView>
    </>
  );
}

function TimerHeader({ running, paused, idle, onPause, onReset }: {
  running: boolean;
  paused: boolean;
  idle: boolean;
  onPause: () => void;
  onReset: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.subtitle}>{translate('timer.subtitle')}</Text>
      </View>
      <View style={styles.headerActions}>
        {(running || paused) && (
          <HoverPressable
            testID="timer-pause"
            accessibilityRole="button"
            accessibilityLabel={translate(paused ? 'timer.resume' : 'timer.pause')}
            onPress={onPause}
            style={({ pressed, hovered }) => [
              styles.roundButton,
              hovered && styles.roundButtonHover,
              pressed && styles.roundButtonPressed,
            ]}
          >
            <Feather
              name={paused ? 'play' : 'pause'}
              size={20}
              color={GAME_PALETTE.text}
              accessible={false}
            />
          </HoverPressable>
        )}
        {!idle && (
          <HoverPressable
            testID="timer-reset"
            accessibilityRole="button"
            accessibilityLabel={translate('timer.reset')}
            onPress={onReset}
            style={({ pressed, hovered }) => [
              styles.roundButton,
              hovered && styles.roundButtonHover,
              pressed && styles.roundButtonPressed,
            ]}
          >
            <Feather name="rotate-ccw" size={19} color={GAME_PALETTE.text} accessible={false} />
          </HoverPressable>
        )}
      </View>
    </View>
  );
}

function timerActions(timer: ReturnType<typeof useTimerClock>) {
  const handleClockPress = (player: TimerPlayer) => {
    hapticLight();
    if (timer.preferences.soundEnabled)
      playTimerSfx('click');
    timer.tapTimer(player);
  };

  const handlePauseToggle = () => {
    hapticLight();
    if (timer.preferences.soundEnabled)
      playTimerSfx('click');
    if (timer.clock.status === 'running') {
      timer.pauseTimer();
      return;
    }
    timer.resumeTimer();
  };

  const handleReset = () => {
    if (timer.clock.status === 'idle') {
      return;
    }
    confirmAction({
      title: translate('timer.reset_title'),
      message: translate('timer.reset_body'),
      confirmLabel: translate('timer.reset'),
      cancelLabel: translate('game.controls.cancel'),
      destructive: true,
      onConfirm: () => {
        hapticLight();
        timer.resetTimer();
      },
    });
  };

  const handleSelectMinutes = (minutes: number) => {
    hapticSelection();
    const nextMs = minutes * 60_000;
    timer.setInitialMs(nextMs);
    changeTimerControl({ initialMs: nextMs, delayMs: timer.preferences.delayMs });
  };

  const handleSelectDelay = (seconds: number) => {
    hapticSelection();
    const nextMs = seconds * 1000;
    timer.setDelayMs(nextMs);
    changeTimerControl({ initialMs: timer.preferences.initialMs, delayMs: nextMs });
  };

  const handleToggleSound = () => {
    const enabling = !timer.preferences.soundEnabled;
    timer.toggleSound();
    if (enabling) {
      playTimerSfx('click');
    }
  };

  const handleToggleFacing = () => {
    hapticSelection();
    timer.toggleFacePlayers();
  };

  return { handleClockPress, handlePauseToggle, handleReset, handleSelectMinutes, handleSelectDelay, handleToggleSound, handleToggleFacing };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: GAME_PALETTE.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 10,
  },
  page: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  pageWide: {
    paddingHorizontal: 24,
  },
  header: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    lineHeight: 18,
    ...interFont('regular'),
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roundButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.surface,
    borderRadius: 23,
  },
  roundButtonHover: {
    borderColor: GAME_PALETTE.control,
    backgroundColor: 'rgba(255, 137, 51, 0.12)',
  },
  roundButtonPressed: {
    opacity: 0.8,
  },
  clocks: {
    gap: 12,
  },
  clocksCompact: {
    gap: 10,
  },
  clocksSideBySide: {
    flexDirection: 'row',
  },
  clockSlot: {},
  clockSlotSideBySide: {
    flex: 1,
  },
  clockFacing: {
    transform: [{ rotate: '180deg' }],
  },
  hint: {
    color: GAME_PALETTE.text,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 18,
    paddingHorizontal: 8,
    ...interFont('medium'),
  },
  hintMuted: {
    color: GAME_PALETTE.textMuted,
  },
  hintExpired: {
    color: '#FF8B72',
  },
  facingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: -4,
  },
  facingText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 16,
    ...interFont('regular'),
  },
});
