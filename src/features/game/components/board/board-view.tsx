import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { DragVisual } from '@/features/game/use-game-input';
import type { GameState, Player } from '@/lib/game/types';
import * as React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { displayBarCountDuringAnimation, displayPointDuringAnimation, isBoardHighlightActive } from '@/features/game/move-animation';
import { useOpeningCeremonyVisible } from '@/features/game/opening-ceremony-gate';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { getMovableSources } from '@/lib/game/move-hints';
import { getReachableDestinations } from '@/lib/game/moves';
import { BarArea } from './bar-area';
import { BearOffArea } from './bear-off-area';
import { BOARD_THEME } from './board-theme';
import { DirectionOverlay } from './direction-overlay';
import { DragCheckerOverlay } from './drag-checker-overlay';
import { MoveAnimationOverlay } from './move-animation-overlay';
import { PointColumn } from './point-column';
import { PointNumberRail } from './point-number-rail';
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

type Props = {
  state: GameState;
  dimensions: BoardDimensions;
  previewTarget: number | null;
  moveAnimation: MoveAnimationFrame | null;
  dragVisual?: DragVisual | null;
  onPointPress: (index: number) => void;
  onPointPressIn: (index: number) => void;
  onPointPressOut: () => void;
  onDragStart?: (from: number, boardX: number, boardY: number) => void;
  onDragMove?: (boardX: number, boardY: number) => void;
  onDragEnd?: (boardX: number, boardY: number) => void;
  onDragCancel?: () => void;
  onBarPress: () => void;
  onBearOffPress: () => void;
  interactionEnabled?: boolean;
  isReviewing?: boolean;
};

/* eslint-disable max-lines-per-function -- board layout composition */
export function BoardView({
  state,
  dimensions,
  previewTarget,
  moveAnimation,
  dragVisual = null,
  onPointPress,
  onPointPressIn,
  onPointPressOut,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  onBarPress,
  onBearOffPress,
  interactionEnabled = true,
  isReviewing = false,
}: Props) {
  const { preferences } = useGamePreferences();
  const ceremonyVisible = useOpeningCeremonyVisible();
  const surfaceRef = useRef<View>(null);
  const surfaceOrigin = useRef({ left: 0, top: 0 });

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

  const measureSurface = useCallback(() => {
    surfaceRef.current?.measureInWindow((left, top) => {
      surfaceOrigin.current = { left, top };
    });
  }, []);

  const handleDragStartAbs = useCallback((from: number, absoluteX: number, absoluteY: number) => {
    surfaceRef.current?.measureInWindow((left, top) => {
      surfaceOrigin.current = { left, top };
      onDragStart?.(from, absoluteX - left, absoluteY - top);
    });
  }, [onDragStart]);

  const handleDragMoveAbs = useCallback((absoluteX: number, absoluteY: number) => {
    const { left, top } = surfaceOrigin.current;
    onDragMove?.(absoluteX - left, absoluteY - top);
  }, [onDragMove]);

  const handleDragEndAbs = useCallback((absoluteX: number, absoluteY: number) => {
    const { left, top } = surfaceOrigin.current;
    onDragEnd?.(absoluteX - left, absoluteY - top);
  }, [onDragEnd]);

  const showHighlights = isBoardHighlightActive(moveAnimation);
  const selectedPoint = showHighlights ? state.selectedPoint : null;
  const showLiveHints = interactionEnabled && !isReviewing;
  const dragFrom = dragVisual?.from ?? null;

  const legalTargets = useMemo(() => {
    if (!showHighlights || state.selectedPoint === null) {
      return new Set<number>();
    }
    return new Set(getReachableDestinations(state, state.selectedPoint).keys());
  }, [showHighlights, state]);

  const movableSources = useMemo(() => {
    if (!showLiveHints || !showHighlights || !preferences.showMoveHints || state.phase !== 'moving' || state.selectedPoint !== null) {
      return new Set<number>();
    }
    return getMovableSources(state);
  }, [showLiveHints, showHighlights, preferences.showMoveHints, state]);

  const bearOffLegal = useMemo(
    () => showHighlights
      && state.selectedPoint !== null
      && getReachableDestinations(state, state.selectedPoint).has(25),
    [showHighlights, state],
  );

  const humanPlayer: Player = state.mode === 'vs-computer' ? 'white' : state.currentPlayer;
  const showDirection = preferences.showDirectionOverlay
    && !isReviewing
    && !ceremonyVisible
    && state.phase !== 'game-over'
    && state.phase !== 'opening-roll';

  const canDrag = interactionEnabled && state.phase === 'moving' && !!onDragStart;

  const renderColumn = (idx: number, isTop: boolean) => {
    const point = displayPointDuringAnimation(idx, state.points[idx], moveAnimation);
    const ownMovable = point.player === state.currentPlayer && point.count > 0;

    return (
      <PointColumn
        key={idx}
        pointIndex={idx}
        point={point}
        isTop={isTop}
        isSelected={selectedPoint === idx}
        isLegalTarget={legalTargets.has(idx)}
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
        dragEnabled={canDrag && ownMovable}
        isDragging={dragFrom === idx}
        onDragStart={handleDragStartAbs}
        onDragMove={handleDragMoveAbs}
        onDragEnd={handleDragEndAbs}
        onDragCancel={onDragCancel}
        colWidth={colWidth}
        pointHeight={pointHeight}
        checkerSize={checkerSize}
      />
    );
  };

  const barWhite = displayBarCountDuringAnimation('white', state.bar.white, moveAnimation);
  const barBlack = displayBarCountDuringAnimation('black', state.bar.black, moveAnimation);

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
      {preferences.showPointNumbers && (
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
          selectedPoint={selectedPoint}
          onPressBar={() => {
            if (interactionEnabled) {
              onBarPress();
            }
          }}
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

        {moveAnimation && (
          <MoveAnimationOverlay animation={moveAnimation} dimensions={dimensions} />
        )}

        {dragVisual && (
          <DragCheckerOverlay
            player={state.currentPlayer}
            boardX={dragVisual.boardX}
            boardY={dragVisual.boardY}
            checkerSize={checkerSize}
          />
        )}
      </View>

      {preferences.showPointNumbers && (
        <PointNumberRail side="bottom" dimensions={dimensions} />
      )}
    </View>
  );
}
