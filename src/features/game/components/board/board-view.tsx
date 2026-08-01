import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Player } from '@/lib/game/types';
import * as React from 'react';
import { useMemo, useRef } from 'react';
import { View } from 'react-native';

import { canDragFromBar, canDragFromColumn } from '@/features/game/drag-input';
import { displayBarCountDuringAnimation, displayPointDuringAnimation, isBoardHighlightActive } from '@/features/game/move-animation';
import { useOpeningCeremonyVisible } from '@/features/game/opening-ceremony-gate';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { BAR_POINT } from '@/lib/game/constants';
import { getMovableSources } from '@/lib/game/move-hints';
import { getReachableDestinations } from '@/lib/game/moves';
import { BarArea } from './bar-area';
import { BearOffArea } from './bear-off-area';
import { BOARD_THEME } from './board-theme';
import { DirectionOverlay } from './direction-overlay';
import { DragCheckerOverlay } from './drag-checker-overlay';
import { MoveAnimationOverlay } from './move-animation-overlay';
import { MoveGuideOverlay } from './move-guide-overlay';
import { PointColumn } from './point-column';
import { PointNumberRail } from './point-number-rail';
import { useBoardDragOverlay } from './use-board-drag-overlay';
import { WoodSurface } from './wood-surface';

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

type SideSectionProps = {
  topIndices: number[];
  botIndices: number[];
  pointHeight: number;
  middleHeight: number;
  renderColumn: (idx: number, isTop: boolean) => React.ReactNode;
};

function SideSection({ topIndices, botIndices, pointHeight, middleHeight, renderColumn }: SideSectionProps) {
  const boardHeight = pointHeight * 2 + middleHeight;
  return (
    <View style={{ flex: 6, height: boardHeight, flexDirection: 'column' }}>
      <View style={{ height: pointHeight, flexDirection: 'row' }}>
        {topIndices.map(i => renderColumn(i, true))}
      </View>
      <View style={{ height: middleHeight, backgroundColor: BOARD_THEME.bar.groove }} />
      <View style={{ height: pointHeight, flexDirection: 'row' }}>
        {botIndices.map(i => renderColumn(i, false))}
      </View>
    </View>
  );
}

type BoardAidsOverride = {
  showMoveHints?: boolean;
  showDirectionOverlay?: boolean;
  showPointNumbers?: boolean;
};

type Props = {
  state: GameState;
  dimensions: BoardDimensions;
  previewTarget: number | null;
  moveAnimation: MoveAnimationFrame | null;
  dragFrom?: number | null;
  onPointPress: (index: number) => void;
  onPointPressIn: (index: number) => void;
  onPointPressOut: () => void;
  onDragAttempt?: (from: number) => void;
  onDragStart?: (from: number, boardX: number, boardY: number) => void;
  onDragMove?: (boardX: number, boardY: number) => void;
  onDragEnd?: (boardX: number, boardY: number) => void;
  onDragCancel?: () => void;
  onBarPress: () => void;
  onBearOffPress: () => void;
  interactionEnabled?: boolean;
  isReviewing?: boolean;
  /** Optional overrides for learn mode (does not persist preferences). */
  aidsOverride?: BoardAidsOverride;
  /** Extra points to paint as targets (identify / coach emphasis). */
  emphasisPoints?: ReadonlySet<number>;
  emphasisBar?: boolean;
  /** Teaching demo for learn challenges: pulsing source + ghost checker slide. */
  moveGuide?: { from: number; to: number } | null;
};

/* eslint-disable max-lines-per-function -- board layout composition */
export function BoardView({
  state,
  dimensions,
  previewTarget,
  moveAnimation,
  dragFrom = null,
  onPointPress,
  onPointPressIn,
  onPointPressOut,
  onDragAttempt,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  onBarPress,
  onBearOffPress,
  interactionEnabled = true,
  isReviewing = false,
  aidsOverride,
  emphasisPoints,
  emphasisBar = false,
  moveGuide = null,
}: Props) {
  const { preferences } = useGamePreferences();
  const showMoveHints = aidsOverride?.showMoveHints ?? preferences.showMoveHints;
  const showDirectionOverlay
    = aidsOverride?.showDirectionOverlay ?? preferences.showDirectionOverlay;
  const showPointNumbers = aidsOverride?.showPointNumbers ?? preferences.showPointNumbers;
  const ceremonyVisible = useOpeningCeremonyVisible();
  const surfaceRef = useRef<View>(null);
  const {
    overlay: dragOverlay,
    measureSurface,
    handleDragStartAbs,
    handleDragMoveAbs,
    handleDragEndAbs,
    handleDragCancel: handleDragCancelLocal,
  } = useBoardDragOverlay(surfaceRef, {
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  });

  const showHighlights = isBoardHighlightActive(moveAnimation);
  const selectedPoint = showHighlights ? state.selectedPoint : null;
  const showLiveHints = interactionEnabled && !isReviewing;

  const {
    boardWidth,
    boardHeight,
    boardFrameWidth,
    boardOuterWidth,
    colWidth,
    checkerSize,
    pointHeight,
    barWidth,
    bearOffWidth,
    middleHeight,
  } = dimensions;

  const legalTargets = useMemo(() => {
    if (!showHighlights || state.selectedPoint === null) {
      return new Set<number>();
    }
    return new Set(getReachableDestinations(state, state.selectedPoint).keys());
  }, [showHighlights, state]);

  const movableSources = useMemo(() => {
    if (!showLiveHints || !showHighlights || !showMoveHints || state.phase !== 'moving' || state.selectedPoint !== null) {
      return new Set<number>();
    }
    return getMovableSources(state);
  }, [showLiveHints, showHighlights, showMoveHints, state]);

  const bearOffLegal = useMemo(
    () => showHighlights
      && state.selectedPoint !== null
      && getReachableDestinations(state, state.selectedPoint).has(25),
    [showHighlights, state],
  );

  const humanPlayer: Player = state.mode === 'vs-computer' ? 'white' : state.currentPlayer;
  const showDirection = showDirectionOverlay
    && !isReviewing
    && !ceremonyVisible
    && state.phase !== 'game-over'
    && state.phase !== 'opening-roll';

  const canDrag = interactionEnabled
    && !!onDragStart
    && !(state.mode === 'vs-computer' && state.currentPlayer === 'black')
    && (state.phase === 'moving'
      || state.phase === 'rolling'
      || state.phase === 'opening-roll');

  const barCountForPlayer = state.bar[state.currentPlayer];

  const renderColumn = (idx: number, isTop: boolean) => {
    const point = displayPointDuringAnimation(idx, state.points[idx], moveAnimation);
    const columnDragEnabled = canDragFromColumn({
      dragInteractionEnabled: canDrag,
      phase: state.phase,
      point,
      currentPlayer: state.currentPlayer,
      barCountForPlayer,
    });

    return (
      <PointColumn
        key={idx}
        pointIndex={idx}
        point={point}
        isTop={isTop}
        isSelected={selectedPoint === idx}
        isLegalTarget={legalTargets.has(idx) || (emphasisPoints?.has(idx) ?? false)}
        isMovableSource={movableSources.has(idx)}
        showGhost={showHighlights && previewTarget === idx}
        ghostPlayer={state.currentPlayer}
        onPress={() => {
          if (interactionEnabled) {
            onPointPress(idx);
          }
        }}
        onPressIn={() => {
          if (interactionEnabled) {
            onPointPressIn(idx);
          }
        }}
        onPressOut={() => {
          if (interactionEnabled) {
            onPointPressOut();
          }
        }}
        dragEnabled={columnDragEnabled}
        isDragging={dragFrom === idx}
        dragOverlay={dragOverlay}
        onDragAttempt={onDragAttempt}
        onDragStart={handleDragStartAbs}
        onDragMove={handleDragMoveAbs}
        onDragEnd={handleDragEndAbs}
        onDragCancel={handleDragCancelLocal}
        colWidth={colWidth}
        pointHeight={pointHeight}
        checkerSize={checkerSize}
      />
    );
  };

  const barWhite = displayBarCountDuringAnimation('white', state.bar.white, moveAnimation);
  const barBlack = displayBarCountDuringAnimation('black', state.bar.black, moveAnimation);
  const barDragEnabled = canDragFromBar({
    dragInteractionEnabled: canDrag,
    barCountForPlayer,
  });

  return (
    <View
      style={{
        width: boardOuterWidth,
        borderRadius: 10,
        borderWidth: boardFrameWidth,
        borderColor: BOARD_THEME.frame.rim,
        backgroundColor: BOARD_THEME.frame.outer,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 8,
        overflow: 'hidden',
      }}
    >
      {showPointNumbers && (
        <PointNumberRail side="top" dimensions={dimensions} />
      )}

      <View
        ref={surfaceRef}
        onLayout={measureSurface}
        style={{
          width: boardWidth,
          height: boardHeight,
          alignSelf: 'center',
          flexDirection: 'row',
          overflow: 'hidden',
          borderRadius: 6,
        }}
      >
        <WoodSurface width={boardWidth} height={boardHeight} />
        <SideSection
          topIndices={TOP_LEFT}
          botIndices={BOT_LEFT}
          pointHeight={pointHeight}
          middleHeight={middleHeight}
          renderColumn={renderColumn}
        />

        <BarArea
          whiteCount={barWhite}
          blackCount={barBlack}
          currentPlayer={state.currentPlayer}
          selectedPoint={emphasisBar && selectedPoint === null ? BAR_POINT : selectedPoint}
          onPressBar={() => {
            if (interactionEnabled) {
              onBarPress();
            }
          }}
          dragEnabled={barDragEnabled}
          isDragging={dragFrom === BAR_POINT}
          dragOverlay={dragOverlay}
          onDragAttempt={onDragAttempt}
          onDragStart={handleDragStartAbs}
          onDragMove={handleDragMoveAbs}
          onDragEnd={handleDragEndAbs}
          onDragCancel={handleDragCancelLocal}
          barWidth={barWidth}
          boardHeight={boardHeight}
          middleHeight={middleHeight}
          checkerSize={checkerSize}
        />

        <SideSection
          topIndices={TOP_RIGHT}
          botIndices={BOT_RIGHT}
          pointHeight={pointHeight}
          middleHeight={middleHeight}
          renderColumn={renderColumn}
        />

        <BearOffArea
          whiteBorneOff={state.borneOff.white}
          blackBorneOff={state.borneOff.black}
          isLegalTarget={bearOffLegal && interactionEnabled}
          currentPlayer={state.currentPlayer}
          onPress={() => {
            if (interactionEnabled) {
              onBearOffPress();
            }
          }}
          width={bearOffWidth}
          boardHeight={boardHeight}
          middleHeight={middleHeight}
          checkerSize={checkerSize}
        />

        {showDirection && (
          <DirectionOverlay
            width={boardWidth}
            height={boardHeight}
            player={humanPlayer}
          />
        )}

        {moveGuide && state.phase === 'moving' && (
          <MoveGuideOverlay
            from={moveGuide.from}
            to={moveGuide.to}
            player={state.currentPlayer}
            dimensions={dimensions}
          />
        )}

        {moveAnimation && (
          <MoveAnimationOverlay animation={moveAnimation} dimensions={dimensions} />
        )}

        {dragFrom !== null
          ? (
              <DragCheckerOverlay
                player={state.currentPlayer}
                checkerSize={checkerSize}
                overlay={dragOverlay}
              />
            )
          : null}
      </View>

      {showPointNumbers && (
        <PointNumberRail side="bottom" dimensions={dimensions} />
      )}
    </View>
  );
}
