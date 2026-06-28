import type { MoveLogEntry } from '@/lib/game/move-log';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CheckerToken } from '@/features/game/components/board/checker-token';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  viewIndex: number;
  liveIndex: number;
  isReviewing: boolean;
  moveLog: MoveLogEntry[];
  focusedPly: number;
  positionLabel: string | null;
  canStepBack: boolean;
  canStepForward: boolean;
  onStepBack: () => void;
  onStepForward: () => void;
  onJumpToPly: (ply: number) => void;
  onGoLive: () => void;
};

const DOT = 7;
const CHECKER = 12;
const BAR_HEIGHT = 68;

function isNewTurn(entries: MoveLogEntry[], index: number): boolean {
  if (index === 0) {
    return false;
  }
  const prev = entries[index - 1]!;
  const entry = entries[index]!;
  return prev.player !== entry.player || prev.dice[0] !== entry.dice[0] || prev.dice[1] !== entry.dice[1];
}

/** Fixed-height scrubber with per-move dots and position label. */
export function MoveReviewBar({
  viewIndex,
  liveIndex,
  isReviewing,
  moveLog,
  focusedPly,
  positionLabel,
  canStepBack,
  canStepForward,
  onStepBack,
  onStepForward,
  onJumpToPly,
  onGoLive,
}: Props) {
  if (liveIndex === 0) {
    return <View style={styles.placeholder} />;
  }

  return (
    <View style={styles.wrap}>
      {isReviewing && positionLabel
        ? (
            <Text style={styles.positionLabel} numberOfLines={1}>
              {positionLabel}
            </Text>
          )
        : null}

      <View style={styles.row}>
        <NavButton
          icon="chevron-left"
          disabled={!canStepBack}
          onPress={onStepBack}
          label="Previous move"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeline}
          style={styles.timelineScroll}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Opening position"
            accessibilityState={{ selected: focusedPly === 0 }}
            onPress={() => {
              hapticLight();
              onJumpToPly(0);
            }}
            style={[styles.dotWrap, styles.turnGap]}
          >
            <View style={[styles.dot, focusedPly === 0 && styles.dotFocused, viewIndex > 0 && styles.dotPast]} />
          </Pressable>

          {moveLog.map((entry, index) => {
            const ply = index + 1;
            const isFocused = focusedPly === ply;
            const isPast = ply < viewIndex;
            return (
              <Pressable
                key={entry.ply}
                accessibilityRole="button"
                accessibilityLabel={`Move ${ply}, ${entry.player}`}
                accessibilityState={{ selected: isFocused }}
                onPress={() => {
                  hapticLight();
                  onJumpToPly(ply);
                }}
                style={[styles.dotWrap, isNewTurn(moveLog, index) && styles.turnGap]}
              >
                {isFocused
                  ? (
                      <CheckerToken player={entry.player} size={CHECKER} flat />
                    )
                  : (
                      <View
                        style={[
                          styles.dot,
                          isPast && styles.dotPast,
                        ]}
                      />
                    )}
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isReviewing ? 'Back to live game' : 'Live game'}
            accessibilityState={{ selected: !isReviewing }}
            disabled={!isReviewing}
            onPress={isReviewing ? onGoLive : undefined}
            style={[styles.dotWrap, styles.turnGap]}
          >
            <View style={[styles.liveDot, !isReviewing && styles.liveDotActive]} />
          </Pressable>
        </ScrollView>

        <NavButton
          icon="chevron-right"
          disabled={!canStepForward}
          onPress={onStepForward}
          label="Next move"
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
        size={28}
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
    paddingHorizontal: 12,
    gap: 4,
    justifyContent: 'center',
  },
  positionLabel: {
    textAlign: 'center',
    color: GAME_PALETTE.accent,
    fontSize: 13,
    letterSpacing: 0.2,
    ...interFont('semibold'),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(10),
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnPressed: {
    opacity: 0.88,
  },
  timelineScroll: {
    flex: 1,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  dotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHECKER + 4,
    height: CHECKER + 4,
  },
  turnGap: {
    marginLeft: 4,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: GAME_PALETTE.surfaceBorder,
    borderWidth: 1,
    borderColor: GAME_PALETTE.textMuted,
  },
  dotPast: {
    backgroundColor: GAME_PALETTE.accentDim,
    borderColor: GAME_PALETTE.accent,
  },
  dotFocused: {
    backgroundColor: GAME_PALETTE.accent,
    borderColor: GAME_PALETTE.accent,
  },
  liveDot: {
    width: DOT + 2,
    height: DOT + 2,
    borderRadius: (DOT + 2) / 2,
    borderWidth: 2,
    borderColor: GAME_PALETTE.textMuted,
    backgroundColor: 'transparent',
  },
  liveDotActive: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: GAME_PALETTE.accent,
  },
});
