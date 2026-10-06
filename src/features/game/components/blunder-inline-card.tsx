import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BlunderActions,
  BlunderHeadline,
  BlunderMore,
  MovePills,
} from '@/features/game/components/blunder-review-body';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { updateGuidance, useGuidance } from '@/features/game/guidance-store';
import { useBlunderActions } from '@/features/game/use-blunder-actions';
import { continuousRadius } from '@/lib/ui/native-styles';

/**
 * Tutor option B — no overlay at all. The verdict lives in the controls slot
 * (the same slot the hint card and the Confirm button use), the main board
 * shows the turn-start position with both paths drawn, and the pills toggle
 * them. Landscape works for free because the slot is in the chrome rail.
 */
export function BlunderInlineCard() {
  const session = useGuidance();
  const actions = useBlunderActions(session);
  const isBlunder = session?.kind === 'blunder' && !!session.verdict;
  // Inline means the answer is visible from the start: reveal both paths
  // on the main board as soon as the card mounts.
  useEffect(() => {
    if (isBlunder && !session?.revealed)
      updateGuidance({ revealed: true, revealMineOnly: false, showMine: true, showEngine: true });
  }, [isBlunder, session?.revealed]);

  if (!session || session.kind !== 'blunder' || !session.verdict)
    return null;
  const verdict = session.verdict;

  return (
    <View style={styles.card} accessibilityRole="alert" testID="guidance-modal">
      <BlunderHeadline session={session} verdict={verdict} />
      <MovePills session={session} onShown={actions.setShown} />
      <BlunderActions
        session={session}
        handlers={{
          onPlayBest: actions.playBest,
          onTakeBack: actions.takeBack,
          onKeep: actions.keepMove,
          onTurnOff: actions.turnOff,
          onShown: actions.setShown,
        }}
      />
      <BlunderMore session={session} verdict={verdict} onTurnOff={actions.turnOff} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
    ...continuousRadius(12),
  },
});
