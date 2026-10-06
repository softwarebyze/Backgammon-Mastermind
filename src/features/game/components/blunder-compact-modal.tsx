import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AnimatedPathBoard } from '@/features/game/components/animated-path-board';
import {
  BlunderActions,
  BlunderHeadline,
  BlunderMore,
  MovePills,
} from '@/features/game/components/blunder-review-body';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGuidance } from '@/features/game/guidance-store';
import { useBlunderActions } from '@/features/game/use-blunder-actions';
import { translate } from '@/lib/i18n';
import { continuousRadius } from '@/lib/ui/native-styles';

/**
 * Tutor option C — today's modal consolidated into one screen (Zachary,
 * 10/3): no question/answer split, the mistaken move is shown at once with
 * one key sentence, the pills pick which path the mini board replays, and
 * exactly three actions. Landscape lays the board beside the text instead
 * of forcing portrait.
 */
export function BlunderCompactModal() {
  const session = useGuidance();
  const actions = useBlunderActions(session);
  const { width, height } = useWindowDimensions();
  if (!session || session.kind !== 'blunder' || !session.verdict)
    return null;
  const verdict = session.verdict;
  const landscape = width > height;
  const cardWidth = Math.min(landscape ? 720 : 380, width - 32);
  const boardWidth = landscape ? Math.min(340, cardWidth * 0.5 - 24) : cardWidth - 40;
  const handlers = {
    onPlayBest: actions.playBest,
    onTakeBack: actions.takeBack,
    onKeep: actions.keepMove,
    onTurnOff: actions.turnOff,
    onShown: actions.setShown,
  };
  // Default to both paths so the mistake and the fix are visible at once.
  const showMine = session.revealed ? session.showMine : true;
  const showEngine = session.revealed ? session.showEngine : true;
  const view = { ...session, revealed: true, showMine, showEngine };

  const board = (
    <View style={[styles.boards, landscape && styles.boardsLandscape]}>
      {showMine && (
        <AnimatedPathBoard
          baseState={session.questionState}
          moves={session.myMoves}
          label={translate('game.tutor.compare.your_move')}
          tone="mine"
          boardWidth={showMine && showEngine && !landscape ? (boardWidth - 10) / 2 : boardWidth}
          testID="guidance-compare-mine"
        />
      )}
      {showEngine && (
        <AnimatedPathBoard
          baseState={session.questionState}
          moves={session.engineMoves}
          label={translate('game.tutor.compare.best_move')}
          tone="engine"
          boardWidth={showMine && showEngine && !landscape ? (boardWidth - 10) / 2 : boardWidth}
          testID="guidance-compare-engine"
        />
      )}
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={actions.keepMove}>
      <View style={styles.scrim}>
        <View style={[styles.card, { width: cardWidth, maxHeight: height - 24 }]} accessibilityRole="alert" testID="guidance-modal">
          <ScrollView contentContainerStyle={[styles.content, landscape && styles.contentLandscape]} showsVerticalScrollIndicator={false}>
            {landscape
              ? (
                  <>
                    <View style={styles.col}>{board}</View>
                    <View style={[styles.col, styles.colText]}>
                      <BlunderHeadline session={session} verdict={verdict} align="left" />
                      <MovePills session={view} onShown={actions.setShown} />
                      <BlunderActions session={view} handlers={handlers} />
                      <BlunderMore session={session} verdict={verdict} onTurnOff={actions.turnOff} />
                    </View>
                  </>
                )
              : (
                  <>
                    <BlunderHeadline session={session} verdict={verdict} />
                    <MovePills session={view} onShown={actions.setShown} />
                    {board}
                    <BlunderActions session={view} handlers={handlers} />
                    <BlunderMore session={session} verdict={verdict} onTurnOff={actions.turnOff} />
                  </>
                )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  card: {
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.accent,
    ...continuousRadius(16),
  },
  content: {
    padding: 18,
    gap: 12,
  },
  contentLandscape: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  colText: {
    gap: 12,
  },
  boards: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  boardsLandscape: {
    flexDirection: 'column',
  },
});
