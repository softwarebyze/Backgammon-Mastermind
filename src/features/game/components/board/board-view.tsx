import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState, Player } from '@/lib/game/types';
import * as React from 'react';
import { useMemo } from 'react';

import { View } from 'react-native';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';

import { canBearOff, getMovableSources } from '@/lib/game/move-hints';
import { BarArea } from './bar-area';
import { BearOffArea } from './bear-off-area';
import { BOARD_THEME } from './board-theme';
import { DirectionOverlay } from './direction-overlay';
import { PointColumn } from './point-column';
import { WoodSurface } from './wood-surface';

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

type SideSectionProps = {
  topIndices: number[];
  botIndices: number[];
  pointHeight: number;
  renderColumn: (idx: number, isTop: boolean) => React.ReactNode;
};

function SideSection({ topIndices, botIndices, pointHeight, renderColumn }: SideSectionProps) {
  const boardHeight = pointHeight * 2 + 12;
  return (
    <View style={{ flex: 6, height: boardHeight, flexDirection: 'column' }}>
      <View style={{ height: pointHeight, flexDirection: 'row' }}>
        {topIndices.map(i => renderColumn(i, true))}
      </View>
      <View style={{ height: 12, backgroundColor: BOARD_THEME.bar.groove }} />
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
  animatingFrom: number | null;
  animatingPlayer: Player | null;
  onPointPress: (index: number) => void;
  onPointPressIn: (index: number) => void;
  onPointPressOut: () => void;
  onBarPress: () => void;
  onBearOffPress: () => void;
};

/* eslint-disable max-lines-per-function -- board layout composition */
export function BoardView({
  state,
  dimensions,
  previewTarget,
  animatingFrom,
  animatingPlayer,
  onPointPress,
  onPointPressIn,
  onPointPressOut,
  onBarPress,
  onBearOffPress,
}: Props) {
  const { preferences } = useGamePreferences();
  const {
    boardWidth,
    boardHeight,
    colWidth,
    checkerSize,
    pointHeight,
    barWidth,
    bearOffWidth,
    middleHeight,
  } = dimensions;

  const legalTargets = useMemo(
    () => new Set(state.legalMovesForSelected.map(m => m.to)),
    [state.legalMovesForSelected],
  );

  const movableSources = useMemo(() => {
    if (!preferences.showMoveHints || state.phase !== 'moving' || state.selectedPoint !== null) {
      return new Set<number>();
    }
    return getMovableSources(state);
  }, [preferences.showMoveHints, state]);

  const bearOffLegal = useMemo(
    () => state.selectedPoint !== null && canBearOff(state) && state.legalMovesForSelected.some(m => m.to === 25),
    [state],
  );

  const humanPlayer: Player = state.mode === 'vs-computer' ? 'white' : state.currentPlayer;
  const showDirection = preferences.showDirectionOverlay && state.phase !== 'game-over';

  const renderColumn = (idx: number, isTop: boolean) => {
    const point = state.points[idx];
    const displayPoint
      = animatingFrom === idx && point.count > 0
        ? {
            player: point.count > 1 ? point.player : null,
            count: point.count - 1,
          }
        : point;

    return (
      <PointColumn
        key={idx}
        pointIndex={idx}
        point={displayPoint}
        isTop={isTop}
        isSelected={state.selectedPoint === idx}
        isLegalTarget={legalTargets.has(idx)}
        isMovableSource={movableSources.has(idx)}
        showGhost={previewTarget === idx}
        ghostPlayer={state.currentPlayer}
        onPress={() => onPointPress(idx)}
        onPressIn={() => onPointPressIn(idx)}
        onPressOut={onPointPressOut}
        colWidth={colWidth}
        pointHeight={pointHeight}
        checkerSize={checkerSize}
      />
    );
  };

  const barWhite
    = animatingFrom === 0 && animatingPlayer === 'white' && state.bar.white > 0
      ? state.bar.white - 1
      : state.bar.white;
  const barBlack
    = animatingFrom === 0 && animatingPlayer === 'black' && state.bar.black > 0
      ? state.bar.black - 1
      : state.bar.black;

  return (
    <View
      style={{
        width: boardWidth,
        height: boardHeight,
        borderRadius: 10,
        borderWidth: 4,
        borderColor: BOARD_THEME.frame.rim,
        backgroundColor: BOARD_THEME.frame.outer,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 8,
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      <WoodSurface width={boardWidth} height={boardHeight} />
      <SideSection
        topIndices={TOP_LEFT}
        botIndices={BOT_LEFT}
        pointHeight={pointHeight}
        renderColumn={renderColumn}
      />

      <BarArea
        whiteCount={barWhite}
        blackCount={barBlack}
        currentPlayer={state.currentPlayer}
        selectedPoint={state.selectedPoint}
        onPressBar={onBarPress}
        barWidth={barWidth}
        boardHeight={boardHeight}
        middleHeight={middleHeight}
        checkerSize={checkerSize}
      />

      <SideSection
        topIndices={TOP_RIGHT}
        botIndices={BOT_RIGHT}
        pointHeight={pointHeight}
        renderColumn={renderColumn}
      />

      <BearOffArea
        whiteBorneOff={state.borneOff.white}
        blackBorneOff={state.borneOff.black}
        isLegalTarget={bearOffLegal}
        currentPlayer={state.currentPlayer}
        onPress={onBearOffPress}
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
    </View>
  );
}
