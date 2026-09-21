import type { LayoutChangeEvent } from 'react-native';
import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { useGameInput } from '@/features/game/use-game-input';
import type { useMoveReview } from '@/features/game/use-move-review';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { GameBoardSection } from '@/features/game/components/game-board-section';
import { GamePipStatusBar } from '@/features/game/components/game-pip-status-bar';
import { MoveReviewBar } from '@/features/game/components/move-review-bar';
import { TurnIndicatorBanner } from '@/features/game/components/turn-indicator-banner';
import { WinConfettiOverlay } from '@/features/game/components/win-confetti-overlay';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { REVIEW_SLOT_HEIGHT, trayDieSize, useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { usePublishBoardSlot } from '@/features/game/hooks/use-publish-board-slot';
import { useOpeningReveal } from '@/features/game/use-opening-reveal';
import { useWinCelebration } from '@/features/game/use-win-celebration';
import { openingCopy, openingTray } from '@/lib/game/opening-display';
import { translate } from '@/lib/i18n';
import { GAME_CHROME_MAX_WIDTH, LANDSCAPE_GAP } from '@/lib/ui/game-chrome';
import { useLayoutMetrics } from '@/lib/ui/layout-metrics';

type Review = ReturnType<typeof useMoveReview>;
type Input = ReturnType<typeof useGameInput>;

type Board = {
  boardState: GameState;
  boardAnimation: MoveAnimationFrame | null;
  interactionEnabled: boolean;
  pathSegments: PathSegment[];
  pathFadeOutMs?: number;
};

type Props = {
  board: Board;
  review: Review;
  input: Input;
  moveLog: MoveLogEntry[];
  isComputerTurn: boolean;
  onCancelSelection: () => void;
  onSkipComputer: () => void;
};

function GameTopChrome({
  state,
  headline,
  onLayout,
}: {
  state: GameState;
  headline: string | null;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.chromeColumn} onLayout={onLayout}>
      <GamePipStatusBar state={state} />
      <View style={styles.turnBannerWrap}>
        <TurnIndicatorBanner state={state} headlineOverride={headline} />
      </View>
    </View>
  );
}

function GameReviewSlot({
  review,
  moveLog,
  state,
}: {
  review: Review;
  moveLog: MoveLogEntry[];
  state: GameState;
}) {
  return (
    <View style={[styles.reviewSlot, styles.chromeColumn]} pointerEvents="box-none">
      <MoveReviewBar
        viewIndex={review.viewIndex}
        liveIndex={review.liveIndex}
        isReviewing={review.isReviewing}
        isNavigating={review.isNavigating}
        moveLog={moveLog}
        focusedPly={review.focusedPly}
        positionLabel={review.positionLabel}
        canStepBack={review.canStepBack}
        canStepForward={review.canStepForward}
        canReplay={review.canReplay}
        isLooping={review.isLooping}
        liveCurrentPlayer={
          !review.isReviewing && state.phase === 'moving' && state.remainingDice.length > 0
            ? state.currentPlayer
            : null
        }
        onStepBack={review.stepBack}
        onStepForward={review.stepForward}
        onJumpToPly={review.jumpToPly}
        onGoLive={review.goLive}
        onToggleReplay={review.toggleReplay}
      />
    </View>
  );
}

type ChromeStackProps = {
  state: GameState;
  live: GameState;
  review: Review;
  moveLog: MoveLogEntry[];
  input: Input;
  isComputerTurn: boolean;
  interactionEnabled: boolean;
  compact: boolean;
  includeTop: boolean;
  dieSize: number;
  opening: ReturnType<typeof openingTray>;
  openingText: ReturnType<typeof openingCopy>;
  onTopLayout: (event: LayoutChangeEvent) => void;
  onControlsLayout: (event: LayoutChangeEvent) => void;
  onCancelSelection: () => void;
  onSkipComputer: () => void;
};

function GameChromeStack({
  state,
  live,
  review,
  moveLog,
  input,
  isComputerTurn,
  interactionEnabled,
  compact,
  includeTop,
  dieSize,
  opening,
  openingText,
  onTopLayout,
  onControlsLayout,
  onCancelSelection,
  onSkipComputer,
}: ChromeStackProps) {
  return (
    <>
      {includeTop
        ? <GameTopChrome state={state} headline={openingText?.headline ?? null} onLayout={onTopLayout} />
        : null}
      <GameReviewSlot review={review} moveLog={moveLog} state={state} />
      <View
        style={[styles.controlsLayer, styles.chromeColumn]}
        pointerEvents="box-none"
        onLayout={onControlsLayout}
      >
        <GameScreenControls
          state={state}
          liveDiceState={live}
          isHumanTurn={!isComputerTurn && interactionEnabled}
          isComputerTurn={isComputerTurn}
          isReviewing={review.isReviewing}
          captionOverride={
            input.inputNudge === 'roll'
              ? translate('game.nudge.roll_first')
              : openingText?.caption ?? null
          }
          opening={opening}
          compact={compact}
          dieSize={dieSize}
          onRoll={input.handleRoll}
          onReset={input.handleReset}
          onGoLive={review.goLive}
          onCancelSelection={onCancelSelection}
          onSkipComputer={onSkipComputer}
        />
      </View>
    </>
  );
}

/* eslint-disable-next-line max-lines-per-function -- portrait vs landscape chrome composition */
export function GameScreenLayout({
  board,
  review,
  input,
  moveLog,
  isComputerTurn,
  onCancelSelection,
  onSkipComputer,
}: Props) {
  const posthog = usePostHog();
  const {
    landscape,
    desktop,
    chromeWidth,
    boardPaneWidth,
    boardMaxWidth,
    stageMaxWidth,
    contentInsets,
  } = useLayoutMetrics();
  const { onTopLayout, onControlsLayout, onSlotLayout } = usePublishBoardSlot();
  const dieSize = trayDieSize(useBoardDimensions().checkerSize);
  const state = board.boardState;
  const live = input.state!;
  // Live state only — review scrub must not drive the opening reveal.
  const reveal = useOpeningReveal(input.state, input.handleRoll);
  const opening = openingTray(live, reveal);
  const openingText = openingCopy(live, reveal);
  const winBurstKey = useWinCelebration(input.state, review.isReviewing);
  const prevPhaseRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentPhase = input.state?.phase;
    if (currentPhase === 'game-over' && prevPhaseRef.current !== 'game-over') {
      posthog.capture('game_completed', {
        mode: input.state?.mode ?? null,
        winner: input.state?.winner ?? null,
        move_count: moveLog.length,
      });
    }
    prevPhaseRef.current = currentPhase;
  }, [posthog, input.state, moveLog.length]);

  const chrome = (
    <GameChromeStack
      state={state}
      live={live}
      review={review}
      moveLog={moveLog}
      input={input}
      isComputerTurn={isComputerTurn}
      interactionEnabled={board.interactionEnabled}
      compact={landscape}
      includeTop={landscape}
      dieSize={dieSize}
      opening={opening}
      openingText={openingText}
      onTopLayout={onTopLayout}
      onControlsLayout={onControlsLayout}
      onCancelSelection={onCancelSelection}
      onSkipComputer={onSkipComputer}
    />
  );

  return (
    <View
      style={[
        styles.root,
        landscape ? styles.rootLandscape : styles.rootPortrait,
        contentInsets,
        landscape && stageMaxWidth != null
          ? { maxWidth: stageMaxWidth, width: '100%', alignSelf: 'center' }
          : null,
      ]}
    >
      <FocusAwareStatusBar />
      {landscape
        ? null
        : <GameTopChrome state={state} headline={openingText?.headline ?? null} onLayout={onTopLayout} />}
      <View
        style={[
          styles.boardSlotHost,
          landscape ? styles.boardSlotLandscape : styles.boardSlotPortrait,
          { maxWidth: boardPaneWidth ?? boardMaxWidth },
        ]}
        testID="game-board-slot"
        onLayout={onSlotLayout}
      >
        <GameBoardSection
          boardState={state}
          boardAnimation={board.boardAnimation}
          boardOpacity={review.boardOpacity}
          interactionEnabled={board.interactionEnabled}
          isReviewing={review.isReviewing}
          previewTarget={input.previewTarget}
          pathSegments={board.pathSegments}
          pathFadeOutMs={board.pathFadeOutMs}
          input={input}
        />
      </View>
      <WinConfettiOverlay burstKey={winBurstKey} />
      {landscape
        ? (
            <ScrollView
              style={[styles.chromeRail, { width: chromeWidth }]}
              contentContainerStyle={[
                styles.chromeRailContent,
                desktop ? styles.chromeRailContentTall : null,
              ]}
              bounces={false}
              overScrollMode="never"
              keyboardShouldPersistTaps="handled"
              testID="game-landscape-chrome"
            >
              {chrome}
            </ScrollView>
          )
        : chrome}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    backgroundColor: GAME_PALETTE.bg,
  },
  rootPortrait: {
    alignItems: 'center',
  },
  rootLandscape: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: LANDSCAPE_GAP,
  },
  chromeColumn: {
    width: '100%',
    maxWidth: GAME_CHROME_MAX_WIDTH,
    alignSelf: 'center',
  },
  chromeRail: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    alignSelf: 'stretch',
    zIndex: 50,
  },
  chromeRailContent: {
    flexGrow: 1,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  chromeRailContentTall: {
    justifyContent: 'center',
  },
  boardSlotHost: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
  boardSlotPortrait: {
    width: '100%',
    alignSelf: 'center',
  },
  boardSlotLandscape: {
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: 0,
  },
  turnBannerWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  reviewSlot: {
    width: '100%',
    alignItems: 'center',
    height: REVIEW_SLOT_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  controlsLayer: {
    width: '100%',
    alignItems: 'center',
    zIndex: 50,
    flexGrow: 0,
    flexShrink: 0,
    elevation: 8,
  },
});
