import type { LayoutChangeEvent } from 'react-native';
import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { useGameInput } from '@/features/game/use-game-input';
import type { useMoveReview } from '@/features/game/use-move-review';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui';
import { OpeningRollCeremony } from '@/features/game/components/board/opening-roll-ceremony';
import { GameBoardSection } from '@/features/game/components/game-board-section';
import { GamePipStatusBar } from '@/features/game/components/game-pip-status-bar';
import { MoveReviewBar } from '@/features/game/components/move-review-bar';
import { TurnIndicatorBanner } from '@/features/game/components/turn-indicator-banner';
import { WinConfettiOverlay } from '@/features/game/components/win-confetti-overlay';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { REVIEW_SLOT_HEIGHT, useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { usePublishBoardSlot } from '@/features/game/hooks/use-publish-board-slot';
import { useWinCelebration } from '@/features/game/use-win-celebration';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { GAME_CHROME_MAX_WIDTH, isLandscapeLayout, landscapeChromeColumnWidth, MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';

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
  ceremonyKey: number;
  onCancelSelection: () => void;
  onSkipComputer: () => void;
};

function GameTopChrome({
  state,
  onLayout,
}: {
  state: GameState;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.chromeColumn} onLayout={onLayout}>
      <GamePipStatusBar state={state} />
      <View style={styles.turnBannerWrap}>
        <TurnIndicatorBanner state={state} />
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
  onTopLayout,
  onControlsLayout,
  onCancelSelection,
  onSkipComputer,
}: ChromeStackProps) {
  return (
    <>
      {includeTop ? <GameTopChrome state={state} onLayout={onTopLayout} /> : null}
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
          captionOverride={input.inputNudge === 'roll' ? translate('game.nudge.roll_first') : null}
          compact={compact}
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

/* eslint-disable max-lines-per-function -- portrait vs landscape chrome composition */
export function GameScreenLayout({
  board,
  review,
  input,
  moveLog,
  isComputerTurn,
  ceremonyKey,
  onCancelSelection,
  onSkipComputer,
}: Props) {
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = isLandscapeLayout(width, height);
  const chromeWidth = landscapeChromeColumnWidth(width);
  const dimensions = useBoardDimensions();
  const { onTopLayout, onControlsLayout, onSlotLayout } = usePublishBoardSlot();
  const state = board.boardState;
  const live = input.state!;
  const canOpeningRoll = !review.isReviewing && !isComputerTurn && live.phase === 'opening-roll';
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
        { paddingBottom: insets.bottom },
      ]}
    >
      <FocusAwareStatusBar />
      {landscape
        ? null
        : <GameTopChrome state={state} onLayout={onTopLayout} />}
      <View
        style={[styles.boardSlotHost, landscape ? styles.boardSlotLandscape : styles.boardSlotPortrait]}
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
      {/* Full-screen so the scrim covers board + review (no hard cut at board edge). */}
      <View style={styles.ceremonyLayer} pointerEvents="box-none">
        <OpeningRollCeremony
          key={ceremonyKey}
          // Live state only — review scrub must not drive the opening ceremony.
          state={input.state!}
          dimensions={dimensions}
          canRoll={canOpeningRoll}
          onRoll={() => {
            hapticLight();
            input.handleRoll();
          }}
        />
      </View>
      {landscape
        ? (
            <ScrollView
              style={[styles.chromeRail, { width: chromeWidth }]}
              contentContainerStyle={styles.chromeRailContent}
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
    backgroundColor: GAME_PALETTE.bg,
  },
  rootPortrait: {
    alignItems: 'center',
  },
  rootLandscape: {
    flexDirection: 'row',
    alignItems: 'stretch',
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
    alignItems: 'center',
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
    maxWidth: MAX_BOARD_WIDTH,
    alignSelf: 'center',
  },
  boardSlotLandscape: {
    alignSelf: 'stretch',
    height: '100%',
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
  ceremonyLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
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
