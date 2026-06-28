import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import type { GameState } from '@/lib/game/types';
import { StyleSheet, Text, View } from 'react-native';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  state: GameState;
  dimensions: BoardDimensions;
};

function OpeningDie({
  value,
  player,
  displayStyle,
  size,
}: {
  value: number;
  player: 'white' | 'black';
  displayStyle: DiceDisplayStyle;
  size: number;
}) {
  const isWhite = player === 'white';
  return (
    <View
      style={[
        styles.die,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: isWhite ? '#F2EAD3' : '#1E1E30',
          borderColor: isWhite ? '#BBA070' : '#5050A0',
        },
      ]}
    >
      <Text
        style={[
          styles.dieText,
          { color: isWhite ? '#2A1A08' : '#E0E0FF', fontSize: size * 0.48 },
        ]}
      >
        {displayStyle === 'numbers' ? value : '●'.repeat(value)}
      </Text>
    </View>
  );
}

/** Opening dice beside the board — coordinates are board-local (inside play area). */
export function OpeningRollOverlay({ state, dimensions }: Props) {
  const { preferences } = useGamePreferences();

  if (state.phase !== 'opening-roll') {
    return null;
  }

  const { white, black } = state.openingRolls;
  const { pointHeight, middleHeight } = dimensions;
  const size = Math.min(dimensions.checkerSize + 4, 34);
  const inset = 10;
  const slotX = inset;
  const blackY = pointHeight * 0.28;
  const whiteY = pointHeight + middleHeight + pointHeight * 0.62;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {black !== null && (
        <View style={[styles.slot, { left: slotX, top: blackY - size / 2, width: size }]}>
          <OpeningDie value={black} player="black" displayStyle={preferences.diceDisplayStyle} size={size} />
        </View>
      )}
      {white !== null && (
        <View style={[styles.slot, { left: slotX, top: whiteY - size / 2, width: size }]}>
          <OpeningDie value={white} player="white" displayStyle={preferences.diceDisplayStyle} size={size} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    alignItems: 'center',
    gap: 3,
    zIndex: 30,
  },
  die: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  dieText: {
    ...interFont('bold'),
  },
});
