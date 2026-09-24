import type { GuidanceSession } from '@/features/game/guidance-store';

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedPathBoard } from '@/features/game/components/animated-path-board';
import { BlunderMeter } from '@/features/game/components/blunder-meter';
import { GAME_PALETTE } from '@/features/game/game-palette';
import {
  blunderDetailsSummary,
  blunderQuestionBody,
  blunderSeverity,
  candidateRows,
  EQUITY_EXPLAINER,
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
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/** Collapsible "why" details: rank recap + top alternatives, labeled. */
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
        accessibilityLabel={open ? 'Hide details' : 'Show details'}
        testID="guidance-details-toggle"
        onPress={() => {
          hapticLight();
          setOpen(v => !v);
        }}
        style={styles.detailsToggle}
      >
        <Text style={styles.detailsToggleText}>
          {open ? 'Hide details ▾' : 'Details ▸'}
        </Text>
      </Pressable>
      {open && (
        <View testID="guidance-details">
          <Text style={styles.detailsSummary}>
            {blunderDetailsSummary(verdict.playedRank, verdict.candidateCount, verdict.loss)}
          </Text>
          <Text style={styles.detailsExplainer}>{EQUITY_EXPLAINER}</Text>
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
function Chip({
  label,
  color,
  active,
  testID,
  onPress,
}: {
  label: string;
  color: string;
  active: boolean;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${active ? 'Hide' : 'Show'} ${label}`}
      testID={testID}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PathToggles({ session }: { session: GuidanceSession }) {
  return (
    <View style={styles.chips}>
      <Chip
        label="Your move"
        color={GAME_PALETTE.guideMine}
        active={session.showMine}
        testID="guidance-toggle-mine"
        onPress={() => updateGuidance({ showMine: !session.showMine })}
      />
      <Chip
        label="Best move"
        color={GAME_PALETTE.guideEngine}
        active={session.showEngine}
        testID="guidance-toggle-engine"
        onPress={() => updateGuidance({ showEngine: !session.showEngine })}
      />
    </View>
  );
}

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
      <Text style={styles.explainer}>{EQUITY_EXPLAINER}</Text>
      <View style={styles.actions}>
        <ActionButton
          label="Take back & retry"
          a11y="Take back the whole turn and try again"
          testID="guidance-take-back"
          onPress={onTakeBack}
          style={styles.btnPrimary}
          labelStyle={styles.btnPrimaryLabel}
        />
        {canUndoLastMove && (
          <ActionButton
            label="Undo last move"
            a11y="Undo just the last move and replay it"
            testID="guidance-undo-last-move"
            onPress={onUndoLastMove}
            style={styles.btnSecondary}
            labelStyle={styles.btnSecondaryLabel}
          />
        )}
        <ActionButton
          label="Show the best move"
          a11y="Reveal the recommended move"
          testID="guidance-reveal"
          onPress={onRevealFull}
          style={styles.btnSecondary}
          labelStyle={styles.btnSecondaryLabel}
        />
        <ActionButton
          label="Show my move"
          a11y="Show only my move, without revealing the best move"
          testID="guidance-show-mine"
          onPress={onShowMine}
          style={styles.btnGhost}
          labelStyle={styles.btnGhostLabel}
        />
        <ActionButton
          label="Keep my move"
          a11y="Keep my move and continue"
          testID="guidance-keep-move"
          onPress={onKeepMove}
          style={styles.btnGhost}
          labelStyle={styles.btnGhostLabel}
        />
        <ActionButton
          label="Turn Tutor off"
          a11y="Turn Tutor mode off"
          testID="guidance-turn-off"
          onPress={onTurnOff}
          style={styles.btnGhost}
          labelStyle={styles.btnMutedLabel}
        />
      </View>
    </>
  );
}

/**
 * The animated visual replay: the player's path alone, or both paths
 * stacked for comparison. Each board loops its own path.
 */
function CompareBoards({
  session,
  boardWidth,
  mineOnly,
}: {
  session: GuidanceSession;
  boardWidth: number;
  mineOnly: boolean;
}) {
  return (
    <View style={styles.compareBoards}>
      <AnimatedPathBoard
        baseState={session.questionState}
        moves={session.myMoves}
        label={mineOnly ? 'Your move, replayed' : 'Your move'}
        tone="mine"
        boardWidth={boardWidth}
        testID="guidance-compare-mine"
      />
      {!mineOnly && (
        <AnimatedPathBoard
          baseState={session.questionState}
          moves={session.engineMoves}
          label="Best move"
          tone="engine"
          boardWidth={boardWidth}
          testID="guidance-compare-engine"
        />
      )}
    </View>
  );
}

/**
 * The revealed answer: either the player's own move alone ("Show my move",
 * best move still hidden) or the full comparison with the engine's best.
 * Both modes show the move paths as looping animated mini-boards — the
 * visual replay — with the notation kept as a secondary caption.
 */
function SolutionView({
  session,
  onRevealBest,
  onBackToQuestion,
  onTakeBack,
  onKeepMove,
}: {
  session: GuidanceSession;
  onRevealBest: () => void;
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
        {mineOnly ? 'Your move' : 'Your move vs the best move'}
      </Text>
      <CompareBoards session={session} boardWidth={boardWidth} mineOnly={mineOnly} />
      {mineOnly
        ? (
            <View style={styles.paths}>
              <View style={styles.pathRow}>
                <View style={[styles.dot, { backgroundColor: GAME_PALETTE.guideMine }]} />
                <Text style={styles.pathText}>
                  You played:
                  {' '}
                  {formatHintNotation(session.myMoves)}
                </Text>
              </View>
            </View>
          )
        : (
            <>
              <PathToggles session={session} />
              <View style={styles.paths}>
                <View style={styles.pathRow}>
                  <View style={[styles.dot, { backgroundColor: GAME_PALETTE.guideMine }]} />
                  <Text style={styles.pathText}>
                    You played:
                    {' '}
                    {formatHintNotation(session.myMoves)}
                  </Text>
                </View>
                <View style={styles.pathRow}>
                  <View style={[styles.dot, { backgroundColor: GAME_PALETTE.guideEngine }]} />
                  <Text style={styles.pathText}>
                    Best:
                    {' '}
                    {formatHintNotation(session.engineMoves)}
                  </Text>
                </View>
              </View>
              <DetailsSection session={session} />
            </>
          )}
      <View style={styles.actions}>
        {session.revealMineOnly && (
          <ActionButton
            label="Show the best move"
            a11y="Reveal the recommended move"
            testID="guidance-reveal"
            onPress={onRevealBest}
            style={styles.btnSecondary}
            labelStyle={styles.btnSecondaryLabel}
          />
        )}
        <ActionButton
          label="Back to question"
          a11y="Go back without the answer"
          testID="guidance-back-to-question"
          onPress={onBackToQuestion}
          style={styles.btnSecondary}
          labelStyle={styles.btnSecondaryLabel}
        />
        <ActionButton
          label="Take back & retry"
          a11y="Take back the move and try again"
          testID="guidance-take-back"
          onPress={onTakeBack}
          style={styles.btnPrimary}
          labelStyle={styles.btnPrimaryLabel}
        />
        <ActionButton
          label="Keep my move"
          a11y="Keep my move and continue"
          testID="guidance-keep-move"
          onPress={onKeepMove}
          style={styles.btnGhost}
          labelStyle={styles.btnGhostLabel}
        />
      </View>
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
 * Demo branch: strings are English-only.
 */
export function GuidanceModal() {
  const session = useGuidance();
  const game = useGame();
  const { setTutorMode } = useGamePreferences();

  if (!session || session.kind !== 'blunder' || !session.verdict) {
    return null;
  }
  const verdict = session.verdict;

  const revertTurn = () => {
    game.tutorRevertTurn(session.questionState, session.myMoves.length);
  };
  const handleTakeBack = () => {
    clearGuidance();
    revertTurn();
  };
  /** Undo just the last die move so the player can retry part of the turn. */
  const handleUndoLastMove = () => {
    clearGuidance();
    game.doUndo();
  };
  // Every reveal transition writes the complete reveal state, so Back →
  // reveal can never resurrect stale toggles from an earlier view.
  const handleRevealFull = () => updateGuidance({
    revealed: true,
    revealMineOnly: false,
    showMine: true,
    showEngine: true,
  });
  const handleShowMine = () => updateGuidance({
    revealed: true,
    showMine: true,
    showEngine: false,
    revealMineOnly: true,
  });
  const handleBackToQuestion = () =>
    updateGuidance({ revealed: false, revealMineOnly: false });
  const handleKeepMove = () => clearGuidance();
  const handleTurnOff = () => {
    clearGuidance();
    setTutorMode(false);
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
    gap: 14,
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 20,
    textAlign: 'center',
    ...interFont('bold'),
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
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    ...interFont('semibold'),
  },
  btnMutedLabel: {
    color: GAME_PALETTE.textMuted,
    opacity: 0.7,
    fontSize: 13,
    ...interFont('regular'),
  },
  pressed: {
    opacity: 0.88,
  },
});
