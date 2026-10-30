import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Position } from '@/lib/positions/position';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { boardDiceSide, boardDieGap, boardDieSize, boardHalfFrame } from '@/features/game/components/board/board-dice-layout';
import { DieFace, EmptyDiePlaceholder } from '@/features/game/components/board/dice-display';
import { playingSurfaceOffset } from '@/features/game/components/board/playing-surface-offset';
import { hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { BoardPicker } from './position-board-picker';
import { pickerStyles } from './position-picker-styles';

type DieIndex = 0 | 1;
const FACES = [1, 2, 3, 4, 5, 6] as const;

/** 1 → 6, then blank ("roll when play starts"): the screen-reader increment. */
function nextDieValue(value: number): number {
  return value >= 6 ? 0 : value + 1;
}

/**
 * The editor's dice sit on the board in the roller's half, exactly where a
 * game draws them. Tapping a die opens all six faces at once, so any value is
 * one tap away; while the other die is still blank, its picker opens next.
 */
export function PositionBoardDice({ position, dimensions, onChange }: {
  position: Position;
  dimensions: BoardDimensions;
  onChange: (p: Position) => void;
}) {
  const [picking, setPicking] = useState<DieIndex | null>(null);
  const size = boardDieSize(dimensions.checkerSize, 6 * dimensions.colWidth);
  const half = boardHalfFrame(dimensions, boardDiceSide(position.currentPlayer));
  const surface = playingSurfaceOffset(dimensions.boardFrameWidth, true);
  const label = (index: DieIndex) => `${translate('positions.dice')} ${index + 1}`;
  const setDie = (index: DieIndex, value: number) => {
    const dice: [number, number] = [...position.dice];
    dice[index] = value;
    onChange({ ...position, dice });
    return dice;
  };
  const pick = (value: number) => {
    if (picking === null)
      return;
    hapticSelection();
    const dice = setDie(picking, value);
    const other: DieIndex = picking === 0 ? 1 : 0;
    setPicking(value > 0 && dice[other] === 0 ? other : null);
  };
  return (
    <>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: surface.left + half.left, top: surface.top, width: half.width, height: dimensions.boardHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: boardDieGap(size), zIndex: 30 }}
      >
        {([0, 1] as const).map(index => (
          <Pressable
            key={index}
            testID={`position-die-${index}`}
            accessibilityRole="adjustable"
            accessibilityLabel={`${label(index)}: ${position.dice[index] ? position.dice[index] : translate('positions.roll_later')}`}
            accessibilityActions={[{ name: 'increment' }]}
            onAccessibilityAction={() => setDie(index, nextDieValue(position.dice[index]))}
            hitSlop={6}
            onPress={() => setPicking(index)}
          >
            {position.dice[index] > 0
              ? <DieFace value={position.dice[index]} used={false} playerColor={position.currentPlayer} displayStyle="dots" size={size} />
              : <EmptyDiePlaceholder playerColor={position.currentPlayer} size={size} />}
          </Pressable>
        ))}
      </View>
      {picking !== null && (
        <DiePicker
          title={label(picking)}
          current={position.dice[picking]}
          size={Math.min(40, Math.max(22, (dimensions.boardHeight - 96) / 2.4))}
          playerColor={position.currentPlayer}
          onPick={pick}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}

/** Six faces and "Roll later" over a dimmed board. */
function DiePicker({ title, current, size, playerColor, onPick, onClose }: {
  title: string;
  current: number;
  size: number;
  playerColor: Position['currentPlayer'];
  onPick: (value: number) => void;
  onClose: () => void;
}) {
  return (
    <BoardPicker testID="position-die-picker" title={title} onClose={onClose}>
      <View style={[pickerStyles.grid, { width: (size + 10) * 3 + 8 * 2 }]}>
        {FACES.map(value => (
          <Pressable
            key={value}
            testID={`position-die-option-${value}`}
            accessibilityRole="button"
            accessibilityLabel={`${title}: ${value}`}
            accessibilityState={{ selected: current === value }}
            onPress={() => onPick(value)}
            style={({ pressed }) => [pickerStyles.option, current === value && pickerStyles.optionSelected, pressed && pickerStyles.pressed]}
          >
            <DieFace value={value} used={false} playerColor={playerColor} displayStyle="dots" size={size} />
          </Pressable>
        ))}
      </View>
      <Pressable
        testID="position-die-option-0"
        accessibilityRole="button"
        accessibilityState={{ selected: current === 0 }}
        onPress={() => onPick(0)}
        style={({ pressed }) => [pickerStyles.pill, current === 0 && pickerStyles.optionSelected, pressed && pickerStyles.pressed]}
      >
        <Text style={pickerStyles.pillText}>{translate('positions.roll_later')}</Text>
      </Pressable>
    </BoardPicker>
  );
}
