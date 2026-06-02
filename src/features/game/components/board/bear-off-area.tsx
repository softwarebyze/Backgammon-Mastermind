import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

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
  const halfHeight = (boardHeight - middleHeight) / 2;
  const small = checkerSize * 0.72;

  const renderStack = (count: number, player: 'white' | 'black', justify: 'flex-start' | 'flex-end') => {
    const visible = Math.min(count, 8);
    const isTargetSide = (player === 'white' && currentPlayer === 'white') || (player === 'black' && currentPlayer === 'black');
    return (
      <View
        style={{
          height: halfHeight,
          alignItems: 'center',
          justifyContent: justify,
          paddingVertical: 4,
          gap: 1,
          borderWidth: isLegalTarget && isTargetSide ? 2 : 0,
          borderColor: '#4CAF50',
          borderRadius: 6,
        }}
      >
        <Text style={{ color: '#A08060', fontSize: 8, marginBottom: 2 }}>
          {player === 'black' ? '▲ off' : '▽ off'}
        </Text>
        {Array.from({ length: visible }, (_, i) => (
          <CheckerToken key={i} player={player} size={small} />
        ))}
        {count > visible && (
          <Text style={{ color: '#D4A843', fontSize: 8, fontWeight: '700' }}>
            +
            {count - visible}
          </Text>
        )}
        {count === 0 && (
          <View
            style={{
              width: small,
              height: small,
              borderRadius: small / 2,
              borderWidth: 1,
              borderColor: isLegalTarget && isTargetSide ? '#4CAF50' : BOARD_THEME.bearOff.border,
              borderStyle: 'dashed',
              backgroundColor: isLegalTarget && isTargetSide ? 'rgba(76, 175, 80, 0.25)' : 'rgba(0,0,0,0.15)',
            }}
          />
        )}
      </View>
    );
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Bear off"
      onPress={onPress}
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
      {renderStack(blackBorneOff, 'black', 'flex-start')}
      <View
        style={{
          height: middleHeight,
          backgroundColor: BOARD_THEME.bar.groove,
          width,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(0,0,0,0.35)',
        }}
      />
      {renderStack(whiteBorneOff, 'white', 'flex-end')}
    </Pressable>
  );
}
