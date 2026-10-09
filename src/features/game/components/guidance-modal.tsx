import type { GuidanceSession } from '@/features/game/guidance-store';

import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedPathBoard } from '@/features/game/components/animated-path-board';
import { BlunderMeter } from '@/features/game/components/blunder-meter';
import { GAME_PALETTE } from '@/features/game/game-palette';
import {
  blunderDetailsSummary,
  blunderQuestionBody,
  blunderSeverity,
  candidateRows,
  equityExplainer,
  formatHintNotation,
} from '@/features/game/guidance-copy';
import {
  clearGuidance,
  updateGuidance,
  useGuidance,
} from '@/features/game/guidance-store';
import { useGame } from '@/features/game/use-game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { hapticLight } from '@/lib/haptics';
import { isRTL, translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/** Collapsible "why" details: rank recap + top alternatives, labeled. */
function formatRoll(dice: [number, number]): string {
  return `${dice[0]}–${dice[1]}`;
}

function DetailsSection({ session }: { session: GuidanceSession }) {
  const [open, setOpen] = useState(false);
  const verdict = session.verdict;
  if (!verdict)
    return null;
  const rows = candidateRows(verdict.candidateEquities, verdict.playedRank);
  return (
    <View style={styles.detailsWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open
          ? translate('game.tutor.details_hide_a11y')
          : translate('game.tutor.details_show_a11y')}
        testID="guidance-details-toggle"
        onPress={() => {
          hapticLight();
          setOpen(v => !v);
        }}
        style={styles.detailsToggle}
      >
        <Text style={styles.detailsToggleText}>
          {open
            ? `${translate('game.tutor.details_hide')} ▾`
            : `${translate('game.tutor.details_show')} ${isRTL ? '◂' : '▸'}`}
        </Text>
      </Pressable>
      {open && (
        <View testID="guidance-details">
          <Text style={styles.detailsSummary}>
            {blunderDetailsSummary(verdict.playedRank, verdict.candidateCount, verdict.loss)}
          </Text>
          <Text style={styles.detailsExplainer}>{equityExplainer()}</Text>
          <View style={styles.candidates}>
            {rows.map(row => (
              <View key={row.label} style={styles.candidateRow}>
                <Text style={styles.candidateRank}>{row.label}</Text>
                <Text style={styles.candidateEquity}>{row.equity}</Text>
                {row.vsBest && <Text style={styles.candidateError}>{row.vsBest}</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/** Toggle chips for the two arrow sets in the solution view. */
function ActionButton({
  label,
  a11y,
  testID,
  onPress,
  style,
  labelStyle,
}: {
  label: string;
  a11y: string;
  testID: string;
  onPress: () => void;
  style: object;
  labelStyle: object;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      testID={testID}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [styles.btn, style, pressed && styles.pressed]}
    >
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

/**
 * The unspoiled question: severity, meter, and the actions that either
 * reveal an answer (full or mine-only) or dismiss the prompt.
 */
function QuestionView({
  verdict,
  onTakeBack,
  onUndoLastMove,
  canUndoLastMove,
  onRevealFull,
  onShowMine,
  onKeepMove,
  onTurnOff,
}: {
  verdict: NonNullable<GuidanceSession['verdict']>;
  onTakeBack: () => void;
  onUndoLastMove: () => void;
  canUndoLastMove: boolean;
  onRevealFull: () => void;
  onShowMine: () => void;
  onKeepMove: () => void;
  onTurnOff: () => void;
}) {
  return (
    <>
      <Text style={styles.title}>{blunderSeverity(verdict.loss)}</Text>
      <Text style={styles.message}>
        {blunderQuestionBody(verdict.playedRank, verdict.candidateCount, verdict.loss)}
      </Text>
      <BlunderMeter loss={verdict.loss} />
      <Text style={styles.explainer}>{equityExplainer()}</Text>
      <View style={styles.actions}>
        <ActionButton
          label={translate('game.tutor.take_back')}
          a11y={translate('game.tutor.take_back_a11y')}
          testID="guidance-take-back"
          onPress={onTakeBack}
          style={styles.btnPrimary}
          labelStyle={styles.btnPrimaryLabel}
        />
        {canUndoLastMove && (
          <ActionButton
            label={translate('game.tutor.undo_last')}
            a11y={translate('game.tutor.undo_last_a11y')}
            testID="guidance-undo-last-move"
            onPress={onUndoLastMove}
            style={styles.btnSecondary}
            labelStyle={styles.btnSecondaryLabel}
          />
        )}
        <ActionButton
          label={translate('game.tutor.reveal')}
          a11y={translate('game.tutor.reveal_a11y')}
          testID="guidance-reveal"
          onPress={onRevealFull}
          style={styles.btnSecondary}
          labelStyle={styles.btnSecondaryLabel}
        />
        <ActionButton
          label={translate('game.tutor.show_mine')}
          a11y={translate('game.tutor.show_mine_a11y')}
          testID="guidance-show-mine"
          onPress={onShowMine}
          style={styles.btnSecondary}
          labelStyle={styles.btnSecondaryLabel}
        />
        <ActionButton
          label={translate('game.tutor.keep')}
          a11y={translate('game.tutor.keep_a11y')}
          testID="guidance-keep-move"
          onPress={onKeepMove}
          style={styles.btnSecondary}
          labelStyle={styles.btnSecondaryLabel}
        />
        <ActionButton
          label={translate('game.tutor.turn_off')}
          a11y={translate('game.tutor.turn_off_a11y')}
          testID="guidance-turn-off"
          onPress={onTurnOff}
          style={styles.btnLink}
          labelStyle={styles.btnLinkLabel}
        />
      </View>
    </>
  );
}

/**
 * The animated visual replay: one board at a time, toggled between the
 * player's path, the engine's best path, both stacked, or the static
 * starting position. Single-board views use the full width so the board
 * stays readable on phones.
 */
type CompareViewMode = 'mine' | 'best' | 'both' | 'start';
type TxKey = Parameters<typeof translate>[0];

const COMPARE_VIEW_OPTIONS: { mode: CompareViewMode; label: TxKey }[] = [
  { mode: 'mine', label: 'game.tutor.compare.mine' },
  { mode: 'best', label: 'game.tutor.compare.best' },
  { mode: 'both', label: 'game.tutor.compare.both' },
  { mode: 'start', label: 'game.tutor.compare.start' },
];

function CompareBoards({
  session,
  boardWidth,
  mineOnly,
}: {
  session: GuidanceSession;
  boardWidth: number;
  mineOnly: boolean;
}) {
  // Start on the best move: this view only appears after the learner asked
  // to see the best move (the mine-only view has its own separate branch).
  const [viewMode, setViewMode] = useState<CompareViewMode>('best');

  if (mineOnly) {
    return (
      <View style={styles.compareBoards}>
        <AnimatedPathBoard
          baseState={session.questionState}
          moves={session.myMoves}
          label={translate('game.tutor.compare.your_move_replayed')}
          tone="mine"
          boardWidth={boardWidth}
          testID="guidance-compare-mine"
        />
      </View>
    );
  }

  const showMine = viewMode === 'mine' || viewMode === 'both';
  const showBest = viewMode === 'best' || viewMode === 'both';

  return (
    <View>
      <View style={styles.viewToggle} testID="guidance-view-toggle">
        {COMPARE_VIEW_OPTIONS.map(({ mode, label }) => {
          const viewLabel = translate(label);
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={translate('game.tutor.compare.show_a11y', { label: viewLabel })}
              accessibilityState={{ selected: viewMode === mode }}
              testID={`guidance-view-${mode}`}
              onPress={() => {
                hapticLight();
                setViewMode(mode);
              }}
              style={[
                styles.viewToggleBtn,
                viewMode === mode && styles.viewToggleBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  viewMode === mode && styles.viewToggleTextActive,
                ]}
              >
                {viewLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.compareBoardsColumn}>
        {showMine && (
          <AnimatedPathBoard
            baseState={session.questionState}
            moves={session.myMoves}
            label={translate('game.tutor.compare.your_move')}
            tone="mine"
            boardWidth={boardWidth}
            testID="guidance-compare-mine"
          />
        )}
        {showBest && (
          <AnimatedPathBoard
            baseState={session.questionState}
            moves={session.engineMoves}
            label={translate('game.tutor.compare.best_move')}
            tone="engine"
            boardWidth={boardWidth}
            testID="guidance-compare-engine"
          />
        )}
        {viewMode === 'start' && (
          <AnimatedPathBoard
            baseState={session.questionState}
            moves={[]}
            label={translate('game.tutor.compare.starting_position')}
            tone="mine"
            boardWidth={boardWidth}
            testID="guidance-compare-start"
          />
        )}
      </View>
    </View>
  );
}

/**
 * The revealed answer: either the player's own move alone ("Show my move",
 * best move still hidden) or the full comparison with the engine's best.
 * Both modes show the move paths as looping animated mini-boards — the
 * visual replay — with the notation kept as a secondary caption.
 */
/** The action row under the revealed answer. */
function SolutionActions({
  mineOnly,
  onRevealBest,
  onPlayBestMove,
  onBackToQuestion,
  onTakeBack,
  onKeepMove,
}: {
  mineOnly: boolean;
  onRevealBest: () => void;
  onPlayBestMove: () => void;
  onBackToQuestion: () => void;
  onTakeBack: () => void;
  onKeepMove: () => void;
}) {
  return (
    <View style={styles.actions}>
      {mineOnly && (
        <ActionButton
          label={translate('game.tutor.reveal')}
          a11y={translate('game.tutor.reveal_a11y')}
          testID="guidance-reveal"
          onPress={onRevealBest}
          style={styles.btnSecondary}
          labelStyle={styles.btnSecondaryLabel}
        />
      )}
      {!mineOnly && (
        <ActionButton
          label={translate('game.tutor.play_best')}
          a11y={translate('game.tutor.play_best_a11y')}
          testID="guidance-play-best"
          onPress={onPlayBestMove}
          style={styles.btnPrimary}
          labelStyle={styles.btnPrimaryLabel}
        />
      )}
      <ActionButton
        label={translate('game.tutor.back_to_question')}
        a11y={translate('game.tutor.back_to_question_a11y')}
        testID="guidance-back-to-question"
        onPress={onBackToQuestion}
        style={styles.btnSecondary}
        labelStyle={styles.btnSecondaryLabel}
      />
      <ActionButton
        label={translate('game.tutor.take_back')}
        a11y={translate('game.tutor.take_back_retry_a11y')}
        testID="guidance-take-back"
        onPress={onTakeBack}
        style={mineOnly ? styles.btnPrimary : styles.btnSecondary}
        labelStyle={mineOnly ? styles.btnPrimaryLabel : styles.btnSecondaryLabel}
      />
      <ActionButton
        label={translate('game.tutor.keep')}
        a11y={translate('game.tutor.keep_a11y')}
        testID="guidance-keep-move"
        onPress={onKeepMove}
        style={styles.btnSecondary}
        labelStyle={styles.btnSecondaryLabel}
      />
    </View>
  );
}

function SolutionView({
  session,
  onRevealBest,
  onPlayBestMove,
  onBackToQuestion,
  onTakeBack,
  onKeepMove,
}: {
  session: GuidanceSession;
  onRevealBest: () => void;
  onPlayBestMove: () => void;
  onBackToQuestion: () => void;
  onTakeBack: () => void;
  onKeepMove: () => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  // Card is maxWidth 380 with 24pt scrim padding and 22pt card padding.
  const boardWidth = Math.min(380, screenWidth - 48) - 44;
  const mineOnly = session.revealMineOnly ?? false;

  return (
    <>
      <Text style={styles.title}>
        {mineOnly ? translate('game.tutor.title_mine') : translate('game.tutor.title_compare')}
      </Text>
      <Text style={styles.rollSubtitle} testID="guidance-roll">
        {translate('game.tutor.rolled', { dice: formatRoll(session.questionState.dice) })}
      </Text>
      <CompareBoards session={session} boardWidth={boardWidth} mineOnly={mineOnly} />
      {mineOnly
        ? (
            <View style={styles.paths}>
              <View style={styles.pathRow}>
                <Text style={styles.pathText}>
                  {translate('game.tutor.you_played')}
                  {' '}
                  {formatHintNotation(session.myMoves)}
                </Text>
              </View>
            </View>
          )
        : (
            <>
              <View style={styles.paths}>
                <View style={styles.pathRow}>
                  <Text style={styles.pathText}>
                    {translate('game.tutor.you_played')}
                    {' '}
                    {formatHintNotation(session.myMoves)}
                  </Text>
                </View>
                <View style={styles.pathRow}>
                  <Text style={styles.pathText}>
                    {translate('game.tutor.best_played')}
                    {' '}
                    {formatHintNotation(session.engineMoves)}
                  </Text>
                </View>
              </View>
              <DetailsSection session={session} />
            </>
          )}
      <SolutionActions
        mineOnly={mineOnly}
        onRevealBest={onRevealBest}
        onPlayBestMove={onPlayBestMove}
        onBackToQuestion={onBackToQuestion}
        onTakeBack={onTakeBack}
        onKeepMove={onKeepMove}
      />
    </>
  );
}

/**
 * Blunder intervention, XG-style with progressive disclosure: the game is
 * paused with the blundered position on the board, and the question view
 * deliberately does NOT reveal the recommended move — a blunder-severity
 * meter (standard GNU Backgammon bands) shows how bad the move was, and the
 * player can take back and retry, peek at the answer, look at just their
 * own move again, keep the move, or turn the tutor off. Revealing shows both
 * paths (theirs in orange, the best in green) on a
 * display-only preview of the turn-start board, with a way back to the
 * question; "Show my move" shows only their own path and notation, keeping
 * the best move hidden until explicitly requested. Nothing is ever auto-replaced.
 *
 */

type TutorBlunderAction = 'take_back' | 'peek' | 'keep_move' | 'turn_off';

/** One `tutor_blunder_shown` per guidance session, plus named modal actions. */
function useTutorBlunderAnalytics(session: GuidanceSession | null) {
  const posthog = usePostHog();
  const shownId = useRef<number | null>(null);

  useEffect(() => {
    if (!session || session.kind !== 'blunder' || !session.verdict)
      return;
    if (shownId.current === session.id)
      return;
    shownId.current = session.id;
    posthog.capture('tutor_blunder_shown', {
      loss: session.verdict.loss,
      played_rank: session.verdict.playedRank,
      candidate_count: session.verdict.candidateCount,
      mode: session.questionState.mode,
    });
  }, [posthog, session]);

  return useCallback((action: TutorBlunderAction) => {
    posthog.capture('tutor_blunder_action', { action });
  }, [posthog]);
}

/** Analytics-backed actions. Other controls stay local to the modal. */
function useBlunderModalActions(session: GuidanceSession | null) {
  const game = useGame();
  const { setTutorMode } = useGamePreferences();
  const captureBlunderAction = useTutorBlunderAnalytics(session);

  const handleTakeBack = () => {
    if (!session || session.kind !== 'blunder')
      return;
    captureBlunderAction('take_back');
    clearGuidance();
    game.tutorRevertTurn(session.questionState, session.myMoves.length);
  };
  // Full reveal is the "peek": the answer was hidden until the player asked.
  const handleRevealFull = () => {
    captureBlunderAction('peek');
    updateGuidance({
      revealed: true,
      revealMineOnly: false,
      showMine: true,
      showEngine: true,
    });
  };
  const handleKeepMove = () => {
    captureBlunderAction('keep_move');
    clearGuidance();
  };
  const handleTurnOff = () => {
    captureBlunderAction('turn_off');
    clearGuidance();
    setTutorMode(false);
  };

  return { handleTakeBack, handleRevealFull, handleKeepMove, handleTurnOff };
}

export function GuidanceModal() {
  const session = useGuidance();
  const game = useGame();
  const {
    handleTakeBack,
    handleRevealFull,
    handleKeepMove,
    handleTurnOff,
  } = useBlunderModalActions(session);

  if (!session || session.kind !== 'blunder' || !session.verdict) {
    return null;
  }
  const verdict = session.verdict;

  /** Undo just the last die move so the player can retry part of the turn. */
  const handleUndoLastMove = () => {
    clearGuidance();
    game.doUndo();
  };
  // Every reveal transition writes the complete reveal state, so Back →
  // reveal can never resurrect stale toggles from an earlier view.
  const handleShowMine = () => updateGuidance({
    revealed: true,
    showMine: true,
    showEngine: false,
    revealMineOnly: true,
  });
  const handleBackToQuestion = () =>
    updateGuidance({ revealed: false, revealMineOnly: false });
  /**
   * One-tap apply: revert the player's turn, then animate the engine's best
   * move in its place. The modal dismisses first and the sequence starts on
   * the next frame so the board has settled before the replay runs.
   */
  const handlePlayBestMove = () => {
    const moves = session.engineMoves;
    if (moves.length === 0)
      return;
    hapticLight();
    clearGuidance();
    game.tutorRevertTurn(session.questionState, session.myMoves.length, () => {
      // The sequence must wait for every reverse slide and the final state
      // commit. Otherwise doMoveSequence sees an active animation and drops it.
      requestAnimationFrame(() => {
        game.doMoveSequence(moves);
      });
    });
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={handleKeepMove}
    >
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityRole="alert" testID="guidance-modal">
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!session.revealed
              ? (
                  <QuestionView
                    verdict={verdict}
                    onTakeBack={handleTakeBack}
                    onUndoLastMove={handleUndoLastMove}
                    canUndoLastMove={game.canUndo ?? false}
                    onRevealFull={handleRevealFull}
                    onShowMine={handleShowMine}
                    onKeepMove={handleKeepMove}
                    onTurnOff={handleTurnOff}
                  />
                )
              : (
                  <SolutionView
                    session={session}
                    onRevealBest={handleRevealFull}
                    onPlayBestMove={handlePlayBestMove}
                    onBackToQuestion={handleBackToQuestion}
                    onTakeBack={handleTakeBack}
                    onKeepMove={handleKeepMove}
                  />
                )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '92%',
    backgroundColor: GAME_PALETTE.surface,
    padding: 22,
    gap: 10,
    ...continuousRadius(16),
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.accent,
  },
  cardScroll: {
    width: '100%',
  },
  cardScrollContent: {
    gap: 10,
  },
  compareBoards: {
    flexDirection: 'row',
    gap: 14,
  },
  compareBoardsColumn: {
    flexDirection: 'column',
    gap: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  viewToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    ...continuousRadius(20),
  },
  viewToggleBtnActive: {
    backgroundColor: GAME_PALETTE.accent,
    borderColor: GAME_PALETTE.accent,
  },
  viewToggleText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('medium'),
  },
  viewToggleTextActive: {
    color: GAME_PALETTE.bg,
    ...interFont('semibold'),
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 20,
    textAlign: 'center',
    ...interFont('bold'),
  },
  rollSubtitle: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
    ...interFont('medium'),
  },
  message: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    ...interFont('regular'),
  },
  explainer: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    ...interFont('regular'),
  },
  paths: {
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    ...continuousRadius(10),
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pathText: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('semibold'),
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 224, 208, 0.25)',
    ...continuousRadius(999),
    opacity: 0.55,
  },
  chipActive: {
    opacity: 1,
    borderColor: GAME_PALETTE.accentDim,
  },
  chipText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('semibold'),
  },
  chipTextActive: {
    color: GAME_PALETTE.text,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detailsWrap: {
    gap: 4,
  },
  detailsToggle: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailsToggleText: {
    color: GAME_PALETTE.accent,
    fontSize: 13,
    ...interFont('semibold'),
  },
  detailsSummary: {
    color: GAME_PALETTE.text,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    ...interFont('regular'),
  },
  detailsExplainer: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
    ...interFont('regular'),
  },
  candidates: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    ...continuousRadius(10),
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 2,
    marginTop: 8,
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
  actions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...continuousRadius(10),
  },
  btnPrimary: {
    backgroundColor: GAME_PALETTE.accent,
  },
  btnPrimaryLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 16,
    ...interFont('semibold'),
  },
  btnSecondary: {
    backgroundColor: 'rgba(232, 224, 208, 0.12)',
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
  },
  btnSecondaryLabel: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('semibold'),
  },
  btnLink: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  btnLinkLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('regular'),
  },
  pressed: {
    opacity: 0.88,
  },
});
