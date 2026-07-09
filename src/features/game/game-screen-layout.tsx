import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { useGameInput } from '@/features/game/use-game-input';
import type { useMoveReview } from '@/features/game/use-move-review';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui';
import { OpeningRollCeremony } from '@/features/game/components/board/opening-roll-ceremony';
import { GameBoardSection } from '@/features/game/components/game-board-section';
import { GamePipStatusBar } from '@/features/game/components/game-pip-status-bar';
import { MoveReviewBar } from '@/features/game/components/move-review-bar';
import { TurnIndicatorBanner } from '@/features/game/components/turn-indicator-banner';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { useBoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { hapticLight } from '@/lib/haptics';

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
};

export function GameScreenLayout({ board, review, input, moveLog, isComputerTurn, ceremonyKey }: Props) {
  const insets = useSafeAreaInsets();
  const dimensions = useBoardDimensions();
  const state = board.boardState;
  const canOpeningRoll = !review.isReviewing && !isComputerTurn && state.phase === 'opening-roll';

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <FocusAwareStatusBar />
      <GamePipStatusBar state={state} />
      <View style={styles.turnBannerWrap}>
        <TurnIndicatorBanner state={state} />
      </View>
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
      <View style={styles.reviewSlot}>
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
      {/* Full-screen so the scrim covers board + review (no hard cut at board edge). */}
      <View style={styles.ceremonyLayer} pointerEvents="box-none">
        <OpeningRollCeremony
          key={ceremonyKey}
          state={state}
          dimensions={dimensions}
          canRoll={canOpeningRoll}
          onRoll={() => {
            hapticLight();
            input.handleRoll();
          }}
        />
      </View>
      {/* Above ceremony so Roll Dice stays visible + tappable; tap-anywhere still hits the board. */}
      <View style={styles.controlsLayer} pointerEvents="box-none">
        <GameScreenControls
          state={state}
          isHumanTurn={!isComputerTurn && board.interactionEnabled}
          isComputerTurn={isComputerTurn}
          isReviewing={review.isReviewing}
          onRoll={input.handleRoll}
          onReset={input.handleReset}
          onGoLive={review.goLive}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
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
    minHeight: 68,
  },
  ceremonyLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
  },
  controlsLayer: {
    width: '100%',
    alignItems: 'center',
    zIndex: 50,
  },
});
