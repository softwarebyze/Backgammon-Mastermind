import type { GuidanceSession } from '@/features/game/guidance-store';

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { blunderKeyPoint } from '@/features/game/blunder-key-point';
import { GAME_PALETTE } from '@/features/game/game-palette';
import {
  blunderSeverity,
  candidateRows,
  equityExplainer,
  formatHintNotation,
  formatPoints,
} from '@/features/game/guidance-copy';
import { hapticLight } from '@/lib/haptics';
import { isRTL, translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Verdict = NonNullable<GuidanceSession['verdict']>;

export type BlunderHandlers = {
  onPlayBest: () => void;
  onTakeBack: () => void;
  onKeep: () => void;
  onTurnOff: () => void;
  /** Which arrow sets to draw. Rejecting both-off is the caller's job. */
  onShown: (showMine: boolean, showEngine: boolean) => void;
};

/** Severity title, equity loss, and the one key sentence. */
export function BlunderHeadline({ session, verdict, align = 'center' }: {
  session: GuidanceSession;
  verdict: Verdict;
  align?: 'center' | 'left';
}) {
  const key = blunderKeyPoint({
    questionState: session.questionState,
    myMoves: session.myMoves,
    engineMoves: session.engineMoves,
    playedRank: verdict.playedRank,
    candidateCount: verdict.candidateCount,
  });
  const textAlign = align;
  return (
    <View style={styles.headline}>
      <View style={[styles.titleRow, align === 'left' && styles.titleRowLeft]}>
        <Text style={styles.title} testID="blunder-title">{blunderSeverity(verdict.loss)}</Text>
        <Text style={styles.loss}>{translate('game.tutor.loss_pts', { points: formatPoints(-verdict.loss) })}</Text>
      </View>
      <Text style={[styles.keyPoint, { textAlign }]} testID="blunder-key-point">{key}</Text>
    </View>
  );
}

/**
 * The two move pills — the same pill design the hint card uses for the
 * suggested move, colour-matched to the board arrows (orange = yours,
 * green = best). Tapping toggles that path on the board; at least one stays on.
 */
export function MovePills({ session, onShown, stacked = false }: {
  session: GuidanceSession;
  onShown: BlunderHandlers['onShown'];
  stacked?: boolean;
}) {
  const { showMine, showEngine } = session;
  const toggle = (which: 'mine' | 'best') => {
    hapticLight();
    // Turning the last visible path off switches to the other one instead.
    if (which === 'mine') {
      const next = !showMine;
      onShown(next, next ? showEngine : true);
    }
    else {
      const next = !showEngine;
      onShown(next ? showMine : true, next);
    }
  };
  return (
    <View style={[styles.pills, stacked && styles.pillsStacked]} testID="move-pills">
      <MovePill
        tone="mine"
        active={showMine}
        label={translate('game.tutor.compare.mine')}
        notation={formatHintNotation(session.myMoves)}
        onPress={() => toggle('mine')}
        testID="move-pill-mine"
      />
      <MovePill
        tone="best"
        active={showEngine}
        label={translate('game.tutor.compare.best')}
        notation={formatHintNotation(session.engineMoves)}
        onPress={() => toggle('best')}
        testID="move-pill-best"
      />
    </View>
  );
}

function MovePill({ tone, active, label, notation, onPress, testID }: {
  tone: 'mine' | 'best';
  active: boolean;
  label: string;
  notation: string;
  onPress: () => void;
  testID: string;
}) {
  const color = tone === 'mine' ? GAME_PALETTE.guideMine : GAME_PALETTE.guideEngine;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={translate('game.tutor.compare.show_a11y', { label: `${label} ${notation}` })}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.pill,
        active && { borderColor: color, backgroundColor: `${color}1F` },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.pillDot, { backgroundColor: color, opacity: active ? 1 : 0.45 }]} />
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
      <Text style={[styles.pillNotation, active && styles.pillNotationActive]} numberOfLines={1}>{notation}</Text>
    </Pressable>
  );
}

/**
 * Exactly three actions, following the selected pills (Zachary, 10/3): the
 * Play button plays whichever move is selected; with both selected, two
 * colour-matched Play buttons sit side by side. Take back always stays.
 */
export function BlunderActions({ session, handlers, row = false }: {
  session: GuidanceSession;
  handlers: BlunderHandlers;
  row?: boolean;
}) {
  const { showMine, showEngine } = session;
  const press = (fn: () => void) => () => {
    hapticLight();
    fn();
  };
  const playBest = (
    <Pressable
      key="best"
      accessibilityRole="button"
      accessibilityLabel={translate('game.tutor.play_best_a11y')}
      testID="guidance-play-best"
      onPress={press(handlers.onPlayBest)}
      style={({ pressed }) => [styles.btn, styles.btnPrimary, styles.flex, pressed && styles.pressed]}
    >
      <View style={[styles.pillDot, { backgroundColor: GAME_PALETTE.guideEngine }]} />
      <Text style={styles.btnPrimaryLabel}>{translate('game.tutor.play_best_short')}</Text>
    </Pressable>
  );
  const keepMine = (primary: boolean) => (
    <Pressable
      key="mine"
      accessibilityRole="button"
      accessibilityLabel={translate('game.tutor.keep_a11y')}
      testID="guidance-keep-move"
      onPress={press(handlers.onKeep)}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnMine : styles.btnLink,
        primary && styles.flex,
        pressed && styles.pressed,
      ]}
    >
      {primary && <View style={[styles.pillDot, { backgroundColor: GAME_PALETTE.guideMine }]} />}
      <Text style={primary ? styles.btnMineLabel : styles.btnLinkLabel}>{translate('game.tutor.keep')}</Text>
    </Pressable>
  );
  const takeBack = (
    <Pressable
      key="back"
      accessibilityRole="button"
      accessibilityLabel={translate('game.tutor.take_back_a11y')}
      testID="guidance-take-back"
      onPress={press(handlers.onTakeBack)}
      style={({ pressed }) => [styles.btn, styles.btnSecondary, styles.flex, pressed && styles.pressed]}
    >
      <Text style={styles.btnSecondaryLabel}>{translate('game.tutor.take_back')}</Text>
    </Pressable>
  );

  if (showMine && showEngine) {
    return (
      <View style={styles.actions} testID="blunder-actions">
        <View style={styles.actionRow}>
          {playBest}
          {keepMine(true)}
        </View>
        {takeBack}
      </View>
    );
  }
  if (showEngine) {
    return (
      <View style={[styles.actions, row && styles.actionsRow]} testID="blunder-actions">
        {playBest}
        {takeBack}
        {keepMine(false)}
      </View>
    );
  }
  return (
    <View style={[styles.actions, row && styles.actionsRow]} testID="blunder-actions">
      {keepMine(true)}
      {takeBack}
    </View>
  );
}

/** "More" disclosure: the candidate table, the equity explainer, Turn Tutor off. */
export function BlunderMore({ session, verdict, onTurnOff }: {
  session: GuidanceSession;
  verdict: Verdict;
  onTurnOff: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = candidateRows(verdict.candidateEquities, verdict.playedRank);
  return (
    <View style={styles.more}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? translate('game.tutor.details_hide_a11y') : translate('game.tutor.details_show_a11y')}
        testID="guidance-details-toggle"
        onPress={() => {
          hapticLight();
          setOpen(v => !v);
        }}
        style={styles.moreToggle}
      >
        <Text style={styles.moreToggleText}>
          {open ? `${translate('game.tutor.details_hide')} ▾` : `${translate('game.tutor.more')} ${isRTL ? '◂' : '▸'}`}
        </Text>
      </Pressable>
      {open && (
        <View testID="guidance-details" style={styles.moreBody}>
          <Text style={styles.moreRolled}>{translate('game.tutor.rolled', { dice: `${session.questionState.dice[0]}–${session.questionState.dice[1]}` })}</Text>
          <View style={styles.candidates}>
            {rows.map(r => (
              <View key={r.label} style={styles.candidateRow}>
                <Text style={styles.candidateRank}>{r.label}</Text>
                <Text style={styles.candidateEquity}>{r.equity}</Text>
                {r.vsBest && <Text style={styles.candidateError}>{r.vsBest}</Text>}
              </View>
            ))}
          </View>
          <Text style={styles.explainer}>{equityExplainer()}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('game.tutor.turn_off_a11y')}
            testID="guidance-turn-off"
            onPress={onTurnOff}
            style={styles.moreToggle}
          >
            <Text style={styles.turnOff}>{translate('game.tutor.turn_off')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
  },
  titleRowLeft: {
    justifyContent: 'flex-start',
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 18,
    ...interFont('bold'),
  },
  loss: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('medium'),
    fontVariant: ['tabular-nums'],
  },
  keyPoint: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('regular'),
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  pillsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 224, 208, 0.22)',
    ...continuousRadius(999),
    minHeight: 40,
  },
  pillDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  pillLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('semibold'),
  },
  pillLabelActive: {
    color: GAME_PALETTE.text,
  },
  pillNotation: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    flexShrink: 1,
    ...interFont('medium'),
    fontVariant: ['tabular-nums'],
  },
  pillNotationActive: {
    color: GAME_PALETTE.text,
  },
  actions: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    ...continuousRadius(10),
  },
  btnPrimary: {
    backgroundColor: GAME_PALETTE.accent,
    borderWidth: 1,
    borderColor: GAME_PALETTE.controlBorder,
  },
  btnPrimaryLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 15,
    ...interFont('semibold'),
  },
  btnMine: {
    backgroundColor: 'rgba(232, 224, 208, 0.10)',
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.guideMine,
  },
  btnMineLabel: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  btnSecondary: {
    backgroundColor: 'rgba(232, 224, 208, 0.10)',
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
  },
  btnSecondaryLabel: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  btnLink: {
    paddingVertical: 8,
    alignSelf: 'center',
  },
  btnLinkLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('medium'),
  },
  more: {
    gap: 2,
  },
  moreToggle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  moreToggleText: {
    color: GAME_PALETTE.accent,
    fontSize: 13,
    ...interFont('semibold'),
  },
  moreBody: {
    gap: 8,
  },
  moreRolled: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    textAlign: 'center',
    ...interFont('medium'),
  },
  candidates: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    ...continuousRadius(10),
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 2,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 2,
  },
  candidateRank: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    width: 64,
    ...interFont('semibold'),
  },
  candidateEquity: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    flex: 1,
    ...interFont('regular'),
  },
  candidateError: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('regular'),
  },
  explainer: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    ...interFont('regular'),
  },
  turnOff: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('regular'),
  },
  pressed: {
    opacity: 0.85,
  },
});
