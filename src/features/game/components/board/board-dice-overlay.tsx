import type { BoardDice, BoardDiceSide } from './board-dice-layout';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { boardDiceSide, boardDieGap, boardDieSize, boardHalfFrame, hasBoardDice } from './board-dice-layout';
import { DiceDisplay, SingleDie } from './dice-display';

function HalfSlot({
  dims,
  side,
  surface,
  children,
  testID,
}: {
  dims: BoardDimensions;
  side: BoardDiceSide;
  surface: { left: number; top: number };
  children: React.ReactNode;
  testID: string;
}) {
  const half = boardHalfFrame(dims, side);
  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={{
        position: 'absolute',
        left: surface.left + half.left,
        top: surface.top,
        width: half.width,
        height: dims.boardHeight,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
      {children}
    </View>
  );
}

/** The rolled dice drawn on the board itself, in the roller's half. */
export function BoardDiceOverlay({
  value,
  dimensions,
  surface,
}: {
  value: BoardDice;
  dimensions: BoardDimensions;
  surface: { left: number; top: number };
}) {
  if (!hasBoardDice(value)) {
    return null;
  }
  const size = boardDieSize(dimensions.checkerSize, 6 * dimensions.colWidth);
  const { opening } = value;

  if (opening) {
    return (
      <>
        <HalfSlot dims={dimensions} side={boardDiceSide('white')} surface={surface} testID="board-dice-white">
          <SingleDie
            value={opening.dice[0]}
            playerColor="white"
            emphasized={opening.emphasis === 0}
            displayStyle={value.displayStyle}
            animateRoll={value.animateRoll}
            size={size}
          />
        </HalfSlot>
        <HalfSlot dims={dimensions} side={boardDiceSide('black')} surface={surface} testID="board-dice-black">
          <SingleDie
            value={opening.dice[1]}
            playerColor="black"
            emphasized={opening.emphasis === 1}
            displayStyle={value.displayStyle}
            animateRoll={value.animateRoll}
            size={size}
          />
        </HalfSlot>
      </>
    );
  }

  const side = boardDiceSide(value.player);
  return (
    <HalfSlot dims={dimensions} side={side} surface={surface} testID={`board-dice-${side}`}>
      <Animated.View key={side} entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
        <DiceDisplay
          dice={value.dice}
          remainingDice={value.remainingDice}
          playerColor={value.player}
          displayStyle={value.displayStyle}
          animateRoll={value.animateRoll}
          size={size}
          gap={boardDieGap(size)}
        />
      </Animated.View>
    </HalfSlot>
  );
}
