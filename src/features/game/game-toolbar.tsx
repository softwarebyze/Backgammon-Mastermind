import { StyleSheet, View } from 'react-native';

import { GameHeaderActions } from '@/components/navigation/game-header-actions';
import { GameHomeButton } from '@/components/navigation/game-home-button';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOptions: () => void;
  onReset: () => void;
  onHome: () => void;
  /** Landscape rail: everything in one tight group, no spread across the width. */
  compact?: boolean;
};

/**
 * The game's buttons without a navigation bar behind them. Portrait puts
 * them in one slim row above the board; landscape puts them at the top of the
 * side rail so the board gets the full height of the screen.
 */
export function GameToolbar({ canUndo, canRedo, onUndo, onRedo, onOptions, onReset, onHome, compact = false }: Props) {
  return (
    <View testID="game-toolbar" style={[styles.row, compact && styles.rowCompact]}>
      <GameHomeButton onPress={onHome} />
      <GameHeaderActions
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onOptions={onOptions}
        onReset={onReset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  rowCompact: {
    paddingHorizontal: 0,
  },
});
