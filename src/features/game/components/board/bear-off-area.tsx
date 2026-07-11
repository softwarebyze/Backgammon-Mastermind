import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BEAR_OFF_LABEL_HEIGHT,
  BEAR_OFF_PADDING,
  bearOffHalfHeight,
  bearOffSlotTopInSection,
  bearOffTokenSize,
  maxBearOffVisibleSlots,
} from '@/features/game/bear-off-layout';
import { BOARD_THEME } from './board-theme';
import { CheckerToken } from './checker-token';

type Props = {
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
  count: number;
  player: Player;
  halfHeight: number;
  width: number;
  checkerSize: number;
  isLegalTarget: boolean;
  isTargetSide: boolean;
};

function BearOffStack({
  count,
  player,
  halfHeight,
  width,
  checkerSize,
  isLegalTarget,
  isTargetSide,
}: StackProps) {
  const tokenSize = bearOffTokenSize(checkerSize);
  const maxVisible = maxBearOffVisibleSlots(halfHeight, tokenSize);
  const visible = Math.min(count, maxVisible);
  const overflow = count - visible;
  const showTarget = isLegalTarget && isTargetSide;

  return (
    <View
      style={{
        height: halfHeight,
        width,
        overflow: 'hidden',
        alignItems: 'center',
        borderWidth: showTarget ? 2 : 0,
        borderColor: '#4CAF50',
        borderRadius: 6,
      }}
    >
      <Text
        style={{
          position: 'absolute',
          top: 2,
          color: '#A08060',
          fontSize: 8,
          zIndex: 20,
        }}
      >
        {player === 'black' ? '▲ off' : '▽ off'}
      </Text>

      {count === 0 && (
        <View
          style={{
            position: 'absolute',
            top: halfHeight / 2 - tokenSize / 2,
            width: tokenSize,
            height: tokenSize,
            borderRadius: tokenSize / 2,
            borderWidth: 1,
            borderColor: showTarget ? '#4CAF50' : BOARD_THEME.bearOff.border,
            borderStyle: 'dashed',
            backgroundColor: showTarget ? 'rgba(76, 175, 80, 0.25)' : 'rgba(0,0,0,0.15)',
          }}
        />
      )}

      {Array.from({ length: visible }, (_, slotIndex) => (
        <CheckerToken
          key={slotIndex}
          player={player}
          size={tokenSize}
          style={{
            position: 'absolute',
            left: (width - tokenSize) / 2,
            top: bearOffSlotTopInSection({
              halfHeight,
              tokenSize,
              visibleCount: visible,
              slotIndex,
              player,
            }),
            zIndex: slotIndex + 1,
          }}
        />
      ))}

      {overflow > 0 && (
        <Text
          style={{
            position: 'absolute',
            top: player === 'black' ? BEAR_OFF_PADDING + BEAR_OFF_LABEL_HEIGHT : undefined,
            bottom: player === 'white' ? BEAR_OFF_PADDING : undefined,
            right: 4,
            color: '#D4A843',
            fontSize: 8,
            fontWeight: '700',
            zIndex: 30,
          }}
        >
          +
          {overflow}
        </Text>
      )}
    </View>
  );
}

export function BearOffArea({
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
      accessibilityLabel="Bear off"
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
        count={blackBorneOff}
        player="black"
        halfHeight={halfHeight}
        width={width}
        checkerSize={checkerSize}
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
        count={whiteBorneOff}
        player="white"
        halfHeight={halfHeight}
        width={width}
        checkerSize={checkerSize}
        isLegalTarget={isLegalTarget}
        isTargetSide={currentPlayer === 'white'}
      />
    </Pressable>
  );
}
