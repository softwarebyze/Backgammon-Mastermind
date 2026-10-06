import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BLUNDER_BANDS } from '@/features/game/blunder-bands';
import {
  BlunderActions,
  BlunderHeadline,
  BlunderMore,
  MovePills,
} from '@/features/game/components/blunder-review-body';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { blunderSeverity, formatPoints } from '@/features/game/guidance-copy';
import { useGuidance } from '@/features/game/guidance-store';
import { useBlunderActions } from '@/features/game/use-blunder-actions';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

function bandColor(loss: number): string {
  const band = BLUNDER_BANDS.find(b => loss < b.max) ?? BLUNDER_BANDS[BLUNDER_BANDS.length - 1]!;
  return band.color;
}

/**
 * Tutor option A (Alex Balica) — a small corner nudge instead of a blocking
 * interstitial. The board stays fully visible and the turn is held; the
 * nudge offers "See why" (opens one compact sheet) and × (keep the move).
 * Header Undo still works as "take back one checker".
 */
export function BlunderNudgeFlow() {
  const session = useGuidance();
  const actions = useBlunderActions(session);
  const [sheetOpen, setSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  if (!session || session.kind !== 'blunder' || !session.verdict)
    return null;
  const verdict = session.verdict;
  const handlers = {
    onPlayBest: actions.playBest,
    onTakeBack: actions.takeBack,
    onKeep: actions.keepMove,
    onTurnOff: actions.turnOff,
    onShown: actions.setShown,
  };
  const openSheet = () => {
    hapticLight();
    actions.capture('nudge_opened');
    actions.revealFull();
    setSheetOpen(true);
  };

  return (
    <>
      {!sheetOpen && (
        <View
          style={[styles.nudge, { top: insets.top + 8, right: insets.right + 12 }]}
          accessibilityRole="alert"
          testID="guidance-modal"
        >
          <View style={[styles.severityDot, { backgroundColor: bandColor(verdict.loss) }]} />
          <View style={styles.nudgeCopy}>
            <Text style={styles.nudgeTitle} numberOfLines={1}>{blunderSeverity(verdict.loss)}</Text>
            <Text style={styles.nudgeSub} numberOfLines={1}>
              {translate('game.tutor.loss_pts', { points: formatPoints(-verdict.loss) })}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('game.tutor.reveal_a11y')}
            testID="guidance-reveal"
            onPress={openSheet}
            style={({ pressed }) => [styles.nudgeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.nudgeBtnText}>{translate('game.tutor.see_why')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('game.tutor.keep_a11y')}
            testID="guidance-keep-move"
            onPress={() => {
              hapticLight();
              actions.keepMove();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.nudgeClose, pressed && styles.pressed]}
          >
            <Feather name="x" size={16} color={GAME_PALETTE.textMuted} />
          </Pressable>
        </View>
      )}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setSheetOpen(false)}
      >
        <View style={[styles.sheetHost, landscape && styles.sheetHostLandscape]} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              landscape
                ? [styles.sheetLandscape, { paddingRight: insets.right + 16, paddingTop: insets.top + 12 }]
                : { paddingBottom: insets.bottom + 12 },
            ]}
            testID="guidance-sheet"
          >
            <View style={styles.grabber} />
            <BlunderHeadline session={session} verdict={verdict} align="left" />
            <MovePills session={session} onShown={actions.setShown} stacked={landscape} />
            <BlunderActions session={session} handlers={handlers} />
            <BlunderMore session={session} verdict={verdict} onTurnOff={actions.turnOff} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  nudge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
    maxWidth: 300,
    backgroundColor: 'rgba(42, 20, 8, 0.96)',
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
    ...continuousRadius(14),
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nudgeCopy: {
    flexShrink: 1,
  },
  nudgeTitle: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('semibold'),
  },
  nudgeSub: {
    color: GAME_PALETTE.textMuted,
    fontSize: 11,
    ...interFont('medium'),
    fontVariant: ['tabular-nums'],
  },
  nudgeBtn: {
    backgroundColor: GAME_PALETTE.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...continuousRadius(9),
  },
  nudgeBtnText: {
    color: GAME_PALETTE.bg,
    fontSize: 13,
    ...interFont('semibold'),
  },
  nudgeClose: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHost: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetHostLandscape: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: GAME_PALETTE.surface,
    borderTopWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.45)',
  },
  sheetLandscape: {
    width: 340,
    height: '100%',
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 18,
    borderLeftWidth: 1,
    borderTopWidth: 0,
    justifyContent: 'center',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(232, 224, 208, 0.25)',
    marginBottom: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
