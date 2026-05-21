import type { GameState } from '@/lib/game/types';
import * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { BarArea } from './bar-area';
import { BearOffArea } from './bear-off-area';
import {
  BAR_WIDTH,
  BEAR_OFF_WIDTH,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CHECKER_SIZE,
  COL_WIDTH,
  MIDDLE_HEIGHT,
  POINT_HEIGHT,
} from './board-layout';
import { PointColumn } from './point-column';

// Point ordering visible on screen
const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

type SideSectionProps = {
  topIndices: number[];
  botIndices: number[];
  renderColumn: (idx: number, isTop: boolean) => React.ReactNode;
};

function SideSection({ topIndices, botIndices, renderColumn }: SideSectionProps) {
  return (
    <View style={{ flex: 6, height: BOARD_HEIGHT, flexDirection: 'column' }}>
      <View style={{ height: POINT_HEIGHT, flexDirection: 'row' }}>
        {topIndices.map(i => renderColumn(i, true))}
      </View>
      <View style={{ height: MIDDLE_HEIGHT, backgroundColor: '#3A1005' }} />
      <View style={{ height: POINT_HEIGHT, flexDirection: 'row' }}>
        {botIndices.map(i => renderColumn(i, false))}
      </View>
    </View>
  );
}

type Props = {
  state: GameState;
  onPointPress: (index: number) => void;
  onBarPress: () => void;
};

export function BoardView({ state, onPointPress, onBarPress }: Props) {
  const legalTargets = useMemo(
    () => new Set(state.legalMovesForSelected.map(m => m.to)),
    [state.legalMovesForSelected],
  );

  const renderColumn = (idx: number, isTop: boolean) => (
    <PointColumn
      key={idx}
      pointIndex={idx}
      point={state.points[idx]}
      isTop={isTop}
      isSelected={state.selectedPoint === idx}
      isLegalTarget={legalTargets.has(idx)}
      onPress={() => onPointPress(idx)}
      colWidth={COL_WIDTH}
      pointHeight={POINT_HEIGHT}
      checkerSize={CHECKER_SIZE}
    />
  );

  return (
    <View
      style={{
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        backgroundColor: '#4A1E07',
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#2A0E03',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      <SideSection
        topIndices={TOP_LEFT}
        botIndices={BOT_LEFT}
        renderColumn={renderColumn}
      />

      <BarArea
        whiteCount={state.bar.white}
        blackCount={state.bar.black}
        currentPlayer={state.currentPlayer}
        selectedPoint={state.selectedPoint}
        onPressBar={onBarPress}
        barWidth={BAR_WIDTH}
        boardHeight={BOARD_HEIGHT}
        middleHeight={MIDDLE_HEIGHT}
        checkerSize={CHECKER_SIZE}
      />

      <SideSection
        topIndices={TOP_RIGHT}
        botIndices={BOT_RIGHT}
        renderColumn={renderColumn}
      />

      <BearOffArea
        whiteBorneOff={state.borneOff.white}
        blackBorneOff={state.borneOff.black}
        width={BEAR_OFF_WIDTH}
        boardHeight={BOARD_HEIGHT}
        middleHeight={MIDDLE_HEIGHT}
        checkerSize={CHECKER_SIZE}
      />
    </View>
  );
}
