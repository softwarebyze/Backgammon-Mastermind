import type { GameState } from '@/lib/game';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { GameHeaderActions } from '@/components/navigation/game-header-actions';
import { GameHomeButton } from '@/components/navigation/game-home-button';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
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
  /** Open the game notes. */
  onNotes?: () => void;
  notesCount?: number;
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

export function GameToolbar({ canUndo, canRedo, onUndo, onRedo, onOptions, onReset, onHome, onSavePosition, onNotes, notesCount = 0, match, compact = false }: Props) {
  // The landscape rail holds exactly six 44px buttons (#348), so notes take a
  // slim row under them there instead of a seventh icon.
  const notesRow = compact && onNotes ? <GameNotesPill count={notesCount} onPress={onNotes} /> : null;
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
        onNotes={compact ? undefined : onNotes}
        notesCount={notesCount}
      />
    </View>
  );
  // Portrait keeps the title line in single games too, so the board sits at
  // the same place and size whether or not a match is on.
  if (!match || match.length === 0) {
    return compact
      ? (
          <View style={styles.stack}>
            {row}
            {notesRow}
          </View>
        )
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
      {notesRow}
    </View>
  );
}

function GameNotesPill({ count, onPress }: { count: number; onPress: () => void }) {
  const label = count > 0 ? translate('game.notes.count_a11y', { count }) : translate('game.notes.button_a11y');
  return (
    <HoverPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="game-notes-button"
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed, hovered }) => [styles.pill, hovered && styles.pillHover, pressed && styles.pillPressed]}
    >
      <Feather name="message-square" size={14} color={GAME_PALETTE.accent} />
      <Text style={styles.pillText} numberOfLines={1}>
        {count > 0 ? `${translate('game.notes.button_a11y')} · ${count}` : translate('game.notes.button_a11y')}
      </Text>
    </HoverPressable>
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
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  pillHover: {
    backgroundColor: 'rgba(255, 196, 153, 0.12)',
  },
  pillPressed: {
    opacity: 0.7,
  },
  pillText: {
    color: GAME_PALETTE.accent,
    fontSize: 13,
    ...interFont('semibold'),
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
