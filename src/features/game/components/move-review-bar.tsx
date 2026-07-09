import type { MoveLogEntry } from '@/lib/game/move-log';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoveReviewTurnStrip } from '@/features/game/components/move-review-turn-strip';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  viewIndex: number;
  liveIndex: number;
  isReviewing: boolean;
  isNavigating?: boolean;
  moveLog: MoveLogEntry[];
  focusedPly: number;
  positionLabel: string | null;
  canStepBack: boolean;
  canStepForward: boolean;
  canReplay?: boolean;
  isLooping?: boolean;
  /** Live mid-turn: hide only the current player's unfinished turn chip. */
  liveCurrentPlayer?: 'white' | 'black' | null;
  onStepBack: () => void;
  onStepForward: () => void;
  onJumpToPly: (ply: number) => void;
  onGoLive: () => void;
  onToggleReplay?: () => void;
};

const BAR_HEIGHT = 68;

export function MoveReviewBar({
  viewIndex,
  liveIndex,
  isReviewing,
  isNavigating = false,
  moveLog,
  focusedPly,
  positionLabel,
  canStepBack,
  canStepForward,
  canReplay = false,
  isLooping = false,
  liveCurrentPlayer = null,
  onStepBack,
  onStepForward,
  onJumpToPly,
  onGoLive,
  onToggleReplay,
}: Props) {
  if (liveIndex === 0) {
    return <View style={styles.placeholder} />;
  }

  return (
    <View style={[styles.wrap, isNavigating && styles.wrapBusy]}>
      <View style={styles.labelRow}>
        <Text style={isReviewing ? styles.positionLabel : styles.scrubberHint} numberOfLines={1}>
          {isReviewing && positionLabel
            ? positionLabel
            : translate('game.review.scrubber_hint')}
        </Text>
        {isReviewing && canReplay && onToggleReplay
          ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isLooping
                  ? translate('game.review.pause_replay')
                  : translate('game.review.replay')}
                onPress={onToggleReplay}
                style={({ pressed }) => [
                  styles.replayBtn,
                  isLooping && styles.replayBtnActive,
                  pressed && styles.navBtnPressed,
                ]}
                hitSlop={8}
              >
                <Feather
                  name={isLooping ? 'pause' : 'rotate-cw'}
                  size={14}
                  color={isLooping ? '#2A1A08' : GAME_PALETTE.accent}
                />
                <Text style={[styles.replayText, isLooping && styles.replayTextActive]}>
                  {isLooping
                    ? translate('game.review.pause_replay')
                    : translate('game.review.replay')}
                </Text>
              </Pressable>
            )
          : null}
      </View>

      <View style={styles.row}>
        <NavButton
          icon="chevron-left"
          disabled={!canStepBack}
          onPress={onStepBack}
          label={translate('game.review.previous')}
        />
        <MoveReviewTurnStrip
          viewIndex={viewIndex}
          isReviewing={isReviewing}
          moveLog={moveLog}
          focusedPly={focusedPly}
          liveCurrentPlayer={liveCurrentPlayer}
          onJumpToPly={onJumpToPly}
          onGoLive={onGoLive}
        />
        <NavButton
          icon="chevron-right"
          disabled={!canStepForward}
          onPress={onStepForward}
          label={translate('game.review.next')}
        />
      </View>
    </View>
  );
}

function NavButton({
  icon,
  disabled,
  onPress,
  label,
}: {
  icon: 'chevron-left' | 'chevron-right';
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navBtn,
        disabled && styles.navBtnDisabled,
        pressed && !disabled && styles.navBtnPressed,
      ]}
    >
      <Feather
        name={icon}
        size={26}
        color={disabled ? GAME_PALETTE.textMuted : GAME_PALETTE.accent}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: BAR_HEIGHT,
    width: '100%',
    maxWidth: 420,
  },
  wrap: {
    minHeight: BAR_HEIGHT,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 8,
    gap: 4,
    justifyContent: 'center',
  },
  wrapBusy: {
    opacity: 0.92,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 20,
  },
  positionLabel: {
    textAlign: 'center',
    color: GAME_PALETTE.accent,
    fontSize: 13,
    letterSpacing: 0.2,
    ...interFont('semibold'),
  },
  scrubberHint: {
    textAlign: 'center',
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    ...interFont('regular'),
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accent,
  },
  replayBtnActive: {
    backgroundColor: GAME_PALETTE.accent,
  },
  replayText: {
    color: GAME_PALETTE.accent,
    fontSize: 11,
    ...interFont('semibold'),
  },
  replayTextActive: {
    color: '#2A1A08',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(10),
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnPressed: { opacity: 0.88 },
});
