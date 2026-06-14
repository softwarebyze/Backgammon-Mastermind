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
      style={[
        styles.bannerShell,
        isActive ? styles.activeShell : styles.waitingShell,
      ]}
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
      {isActive ? <View style={styles.activeDot} /> : null}
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    ...continuousRadius(14),
  },
  activeShell: {
    backgroundColor: 'rgba(232, 200, 96, 0.1)',
    borderColor: 'rgba(232, 200, 96, 0.45)',
    borderLeftWidth: 3,
    borderLeftColor: '#E8C860',
  },
  waitingShell: {
    backgroundColor: 'rgba(42, 20, 8, 0.65)',
    borderColor: GAME_PALETTE.surfaceBorder,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  bannerColor: {
    fontSize: 11,
    letterSpacing: 1.4,
    ...interFont('bold'),
  },
  activeColor: {
    color: '#F0D070',
  },
  waitingColor: {
    color: GAME_PALETTE.textMuted,
  },
  bannerHeadline: {
    marginTop: 1,
    fontSize: 17,
    ...interFont('bold'),
  },
  activeHeadline: {
    color: GAME_PALETTE.text,
  },
  waitingHeadline: {
    color: GAME_PALETTE.textMuted,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8C860',
    boxShadow: '0 0 10px rgba(232, 200, 96, 0.8)',
  },
});
