import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';

import { GameHeaderActions } from '@/components/navigation/game-header-actions';
import { GameHomeButton } from '@/components/navigation/game-home-button';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

/** The match title line under the buttons. */
const TITLE_HEIGHT = 16;

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOptions: () => void;
  onReset: () => void;
  onSavePosition?: () => void;
  onHome: () => void;
  /** In a match, the toolbar names it: "Match to 5 · Game 2" (or the Crawford notice). */
  match?: GameState['match'];
  /** Landscape rail: everything in one tight group, no spread across the width. */
  compact?: boolean;
};

/**
 * The game's buttons without a navigation bar behind them. Portrait puts
 * them in one slim row above the board; landscape puts them at the top of the
 * side rail so the board gets the full height of the screen.
 */
/** "Match to 5 · Game 2", or the Crawford notice while the Crawford game is still being played. */
function matchTitle(match: NonNullable<GameState['match']>): string {
  return match.crawford && !match.winner
    ? translate('game.match.crawford')
    : translate('game.match.title', { length: match.length, game: match.gameNumber });
}

export function GameToolbar({ canUndo, canRedo, onUndo, onRedo, onOptions, onReset, onHome, onSavePosition, match, compact = false }: Props) {
  const row = (
    <View testID="game-toolbar" style={[styles.row, compact && styles.rowCompact]}>
      <GameHomeButton onPress={onHome} />
      <GameHeaderActions
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onOptions={onOptions}
        onReset={onReset}
        onSavePosition={onSavePosition}
      />
    </View>
  );
  // Portrait keeps the title line in single games too, so the board sits at
  // the same place and size whether or not a match is on.
  if (!match) {
    return compact
      ? row
      : (
          <View style={styles.stack}>
            {row}
            <View style={styles.titleSpace} />
          </View>
        );
  }
  return (
    <View style={styles.stack}>
      {row}
      <Text
        testID="match-score"
        style={styles.title}
        numberOfLines={1}
        accessibilityLabel={`${matchTitle(match)}. ${translate('game.match.score', { white: match.score.white, black: match.score.black })}`}
        accessibilityLiveRegion="polite"
      >
        {matchTitle(match)}
      </Text>
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
  stack: {
    width: '100%',
  },
  titleSpace: {
    height: TITLE_HEIGHT,
  },
  title: {
    height: TITLE_HEIGHT,
    lineHeight: TITLE_HEIGHT,
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    textAlign: 'center',
    ...interFont('semibold'),
  },
});
