import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import {
  BEAR_OFF_MAX_CHECKERS,
  bearOffHalfHeight,
  bearOffSlabOffset,
  bearOffSlotTopInSection,
  bearOffStackLayout,
  bearOffTokenSize,
} from '@/features/game/bear-off-layout';
import { translate } from '@/lib/i18n';
import { BOARD_THEME } from './board-theme';

type Props = {
  cubeClearance?: number;
  whiteBorneOff: number;
  blackBorneOff: number;
  isLegalTarget: boolean;
  currentPlayer: Player;
  onPress: () => void;
  width: number;
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
};

type StackProps = {
  cubeClearance: number;
  count: number;
  player: Player;
  halfHeight: number;
  width: number;
  checkerSize: number;
  middleHeight: number;
  isLegalTarget: boolean;
  isTargetSide: boolean;
};

type SlabProps = {
  player: Player;
  width: number;
  thickness: number;
  style?: object;
};

/**
 * A borne-off checker seen edge-on, as in XG: a flat bar in the checker's
 * colour with a one-pixel rim and separator, no gradient or shading.
 */
export function BearOffSlab({ player, width, thickness, style }: SlabProps) {
  const colors = BOARD_THEME.slab[player];
  return (
    <View
      testID="bear-off-slab"
      style={[
        {
          width,
          height: thickness,
          borderRadius: 1,
          backgroundColor: colors.fill,
          borderTopWidth: thickness >= 4 ? 1 : 0,
          borderTopColor: colors.rim,
          // Very thin slabs keep a thinner separator so a group never merges into one bar.
          borderBottomWidth: Math.min(1, thickness / 2),
          borderBottomColor: colors.separator,
        },
        style,
      ]}
    />
  );
}

function BearOffStack({
  cubeClearance,
  count,
  player,
  halfHeight,
  width,
  checkerSize,
  middleHeight,
  isLegalTarget,
  isTargetSide,
}: StackProps) {
  const visible = Math.min(count, BEAR_OFF_MAX_CHECKERS);
  const slot = {
    clearance: cubeClearance,
    halfHeight,
    tokenSize: bearOffTokenSize(checkerSize),
    bearOffWidth: width,
    middleHeight,
    player,
  };
  const layout = bearOffStackLayout(slot);
  // Inside the tray's 1px left border; an even margin keeps edges on whole pixels.
  const innerWidth = Math.round(width) - 1;
  const slabWidth = Math.max(8, innerWidth - 6);
  const left = (innerWidth - slabWidth) / 2;
  const showTarget = isLegalTarget && isTargetSide;
  // An empty tray shows the outline of one group of five where checkers will land.
  const emptyLength = bearOffSlabOffset(layout, 4) + layout.thickness;
  const emptyTop = player === 'black'
    ? layout.start
    : halfHeight - layout.start - emptyLength;

  return (
    <View
      style={{
        height: halfHeight,
        width: innerWidth,
        overflow: 'hidden',
        borderWidth: showTarget ? 2 : 0,
        borderColor: '#4CAF50',
        borderRadius: 6,
      }}
    >
      {count === 0 && (
        <View
          testID="bear-off-empty-slot"
          style={{
            position: 'absolute',
            top: emptyTop,
            left,
            width: slabWidth,
            height: emptyLength,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: showTarget ? '#4CAF50' : BOARD_THEME.bearOff.border,
            borderStyle: 'dashed',
            backgroundColor: showTarget ? 'rgba(76, 175, 80, 0.25)' : 'rgba(0,0,0,0.15)',
          }}
        />
      )}

      {Array.from({ length: visible }, (_, slotIndex) => (
        <BearOffSlab
          key={slotIndex}
          player={player}
          width={slabWidth}
          thickness={layout.thickness}
          style={{
            position: 'absolute',
            left,
            top: bearOffSlotTopInSection({ ...slot, slotIndex }),
          }}
        />
      ))}
    </View>
  );
}

export function BearOffArea({
  cubeClearance = 0,
  whiteBorneOff,
  blackBorneOff,
  isLegalTarget,
  currentPlayer,
  onPress,
  width,
  boardHeight,
  middleHeight,
  checkerSize,
}: Props) {
  const halfHeight = bearOffHalfHeight(boardHeight, middleHeight);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translate('game.controls.bear_off_a11y')}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress();
      }}
      style={{
        width,
        height: boardHeight,
        backgroundColor: BOARD_THEME.bearOff.surface,
        borderLeftWidth: 1,
        borderColor: BOARD_THEME.bearOff.border,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      }}
    >
      <BearOffStack
        cubeClearance={cubeClearance}
        count={blackBorneOff}
        player="black"
        halfHeight={halfHeight}
        width={width}
        checkerSize={checkerSize}
        middleHeight={middleHeight}
        isLegalTarget={isLegalTarget}
        isTargetSide={currentPlayer === 'black'}
      />

      <View
        style={{
          height: middleHeight,
          backgroundColor: BOARD_THEME.bar.groove,
          width,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(0,0,0,0.35)',
          zIndex: 40,
        }}
      />

      <BearOffStack
        cubeClearance={cubeClearance}
        count={whiteBorneOff}
        player="white"
        halfHeight={halfHeight}
        width={width}
        checkerSize={checkerSize}
        middleHeight={middleHeight}
        isLegalTarget={isLegalTarget}
        isTargetSide={currentPlayer === 'white'}
      />
    </Pressable>
  );
}
