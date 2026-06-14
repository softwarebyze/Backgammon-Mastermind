import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';

import { CheckerToken } from '@/features/game/components/board/checker-token';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { getTurnDisplay } from '@/lib/game/turn-display';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

const CHECKER_SIZE = 22;

type Props = {
  state: GameState;
};

export function TurnIndicatorBanner({ state }: Props) {
  if (state.phase === 'game-over') {
    return null;
  }

  const turn = getTurnDisplay(state);
  const isActive = turn.isHumanTurn;

  return (
    <View
      style={styles.bannerShell}
      accessibilityRole="text"
      accessibilityLabel={`${turn.colorLabel}. ${turn.headline}`}
    >
      <CheckerToken player={turn.player} size={CHECKER_SIZE} />
      <View style={styles.copy}>
        <Text
          style={[
            styles.bannerColor,
            isActive ? styles.activeColor : styles.waitingColor,
          ]}
          numberOfLines={1}
        >
          {turn.colorLabel.toUpperCase()}
        </Text>
        <Text
          style={[
            styles.bannerHeadline,
            isActive ? styles.activeHeadline : styles.waitingHeadline,
          ]}
          numberOfLines={1}
        >
          {turn.headline}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 420,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(12),
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  bannerColor: {
    fontSize: 11,
    letterSpacing: 1.2,
    ...interFont('semibold'),
  },
  activeColor: {
    color: GAME_PALETTE.accentDim,
  },
  waitingColor: {
    color: GAME_PALETTE.textMuted,
  },
  bannerHeadline: {
    marginTop: 1,
    fontSize: 16,
    ...interFont('semibold'),
  },
  activeHeadline: {
    color: GAME_PALETTE.text,
  },
  waitingHeadline: {
    color: GAME_PALETTE.textMuted,
  },
});
