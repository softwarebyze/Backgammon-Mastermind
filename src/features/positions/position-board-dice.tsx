import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Position } from '@/lib/positions/position';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { boardDiceSide, boardDieGap, boardDieSize, boardHalfFrame } from '@/features/game/components/board/board-dice-layout';
import { DieFace, EmptyDiePlaceholder } from '@/features/game/components/board/dice-display';
import { playingSurfaceOffset } from '@/features/game/components/board/playing-surface-offset';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

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

/** Six faces and "Roll later" over a dimmed board; tapping outside closes it. */
function DiePicker({ title, current, size, playerColor, onPick, onClose }: {
  title: string;
  current: number;
  size: number;
  playerColor: Position['currentPlayer'];
  onPick: (value: number) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.overlay} testID="position-die-picker">
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={translate('positions.done')} testID="position-die-picker-close" onPress={onClose} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.grid, { width: (size + 10) * 3 + 8 * 2 }]}>
          {FACES.map(value => (
            <Pressable
              key={value}
              testID={`position-die-option-${value}`}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${value}`}
              accessibilityState={{ selected: current === value }}
              onPress={() => onPick(value)}
              style={({ pressed }) => [styles.option, current === value && styles.optionSelected, pressed && styles.pressed]}
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
          style={({ pressed }) => [styles.later, current === 0 && styles.optionSelected, pressed && styles.pressed]}
        >
          <Text style={styles.laterText}>{translate('positions.roll_later')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 4, 1, 0.55)',
    borderRadius: 12,
  },
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
  },
  title: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('semibold'),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  option: {
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: GAME_PALETTE.surface,
  },
  later: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    justifyContent: 'center',
  },
  laterText: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('medium'),
  },
  pressed: {
    opacity: 0.7,
  },
});
